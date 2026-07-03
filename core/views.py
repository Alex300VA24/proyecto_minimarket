import json
import io
import base64
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from functools import wraps

import qrcode

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model
from django.db.models import Count, F, Sum, Q
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.accounts.models import Role, UserProfile
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, Category, ProductBatch
from payment_simulation.utils import build_simulation_absolute_uri
from .models import Expense

User = get_user_model()


def _ean13_checksum(first_12_digits):
    digits = [int(d) for d in first_12_digits]
    odd_sum = sum(digits[::2])
    even_sum = sum(digits[1::2])
    return str((10 - ((odd_sum + even_sum * 3) % 10)) % 10)


def _normalize_barcode(value):
    return ''.join(ch for ch in str(value or '') if ch.isdigit())


def _generate_product_barcode(product):
    body = '775' + str(product.id).zfill(9)[-9:]
    return body + _ean13_checksum(body)


def _ensure_product_barcode(product):
    if product.codigo and product.codigo == _normalize_barcode(product.codigo) and len(product.codigo) == 13:
        return product.codigo
    product.codigo = _generate_product_barcode(product)
    product.save(update_fields=['codigo', 'updated_at'])
    return product.codigo


def _reduce_stock_fifo(product, quantity):
    if not product or quantity <= 0:
        return
    batches = product.batches.filter(quantity__gt=0).order_by('created_at')
    remaining = quantity
    for batch in batches:
        if remaining <= 0:
            break
        to_deduct = min(batch.quantity, remaining)
        batch.quantity -= to_deduct
        batch.save()
        remaining -= to_deduct
    product.stock = sum(b.quantity for b in product.batches.all())
    product.save()


def _staff_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            from django.contrib.auth.views import redirect_to_login
            return redirect_to_login(request.get_full_path())
        if not (request.user.is_staff or
                (hasattr(request.user, 'profile') and request.user.profile.role and request.user.profile.role.name in ('admin', 'employee'))):
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden('No tienes permiso para acceder a esta pagina.')
        return view_func(request, *args, **kwargs)
    return wrapper


def home(request):
    products = Product.objects.filter(is_available=True)[:8]
    return render(request, 'core/home.html', {'products': products})


def como_funciona(request):
    return render(request, 'core/como_funciona.html')


def contacto(request):
    return render(request, 'core/contacto.html')


@_staff_required
def dashboard(request):
    today = timezone.now().date()
    context = {
        'total_orders': Order.objects.count(),
        'total_products': Product.objects.filter(is_available=True).count(),
        'total_categories': Category.objects.filter(is_active=True).count(),
        'pending_orders': Order.objects.filter(status='pending').count(),
        'revenue_today': Order.objects.filter(
            created_at__date=today, status='delivered'
        ).aggregate(total=Sum('total'))['total'] or 0,
    }
    return render(request, 'core/admin/dashboard.html', context)


@csrf_exempt
@require_http_methods(['GET'])
@_staff_required
def api_dashboard_stats(request):
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    orders_delivered_week = Order.objects.filter(
        status='delivered', created_at__date__gte=week_ago
    )
    ventas_semana = orders_delivered_week.aggregate(t=Sum('total'))['t'] or 0

    chart = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_total = Order.objects.filter(
            status='delivered', created_at__date=day
        ).aggregate(t=Sum('total'))['t'] or 0
        chart.append({
            'label': day.strftime('%a'),
            'ventas': float(day_total)
        })

    gastos_mes = Expense.objects.filter(date__gte=month_ago)
    gastos_mes_total = gastos_mes.aggregate(t=Sum('amount'))['t'] or 0

    stock_bajo = Product.objects.filter(
        Q(stock__lt=10) | Q(stock=0)
    ).count()
    pedidos_pendientes = Order.objects.filter(
        status__in=['pending', 'confirmed', 'preparing', 'ready']
    ).count()

    top = OrderItem.objects.values('product_name').annotate(
        total_qty=Sum('quantity'),
        total_ingreso=Sum(F('quantity') * F('price'))
    ).order_by('-total_qty')[:5]

    return JsonResponse({
        'ventasSemana': float(ventas_semana),
        'gastosMes': float(gastos_mes_total),
        'stockBajo': stock_bajo,
        'pedidosPendientes': pedidos_pendientes,
        'chartData': chart,
        'topProductos': [
            {'nombre': p['product_name'], 'vendidos': p['total_qty'], 'ingreso': float(p['total_ingreso'])}
            for p in top
        ],
        'utilidadNeta': float(ventas_semana - gastos_mes_total),
    })


@csrf_exempt
@require_http_methods(['GET'])
@_staff_required
def api_categorias(request):
    categorias = Category.objects.filter(is_active=True).order_by('name')
    data = [{'id': c.id, 'name': c.name} for c in categorias]
    return JsonResponse({'categorias': data})


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@_staff_required
def api_productos(request):
    if request.method == 'GET':
        busqueda = request.GET.get('q', '')
        categoria = request.GET.get('categoria', '')
        productos = Product.objects.all()
        if busqueda:
            productos = productos.filter(
                Q(name__icontains=busqueda) | Q(slug__icontains=busqueda)
            )
        if categoria:
            productos = productos.filter(category__name=categoria)
        data = []
        for p in productos:
            batches = p.batches.all()
            total_stock = sum(b.quantity for b in batches) + p.stock
            codigo = _ensure_product_barcode(p)
            data.append({
                'id': p.id,
                'nombre': p.name,
                'codigo': codigo,
                'categoria': p.category.name if p.category else '',
                'precio': float(p.price),
                'precioCompra': float(p.cost_price),
                'stock': total_stock,
                'umbral': 10,
                'color': '#d97706',
                'icono': 'fa-solid fa-box',
                'descripcion': p.description,
                'imagen': p.image.url if p.image else None,
                'lotes': [{
                    'id': b.id,
                    'numeroLote': b.batch_code,
                    'precio': float(b.cost_price),
                    'cantidad': b.quantity,
                    'fechaVencimiento': b.expiry_date.strftime('%d/%m/%Y') if b.expiry_date else '',
                    'proveedor': b.supplier,
                } for b in batches]
            })
        return JsonResponse({'productos': data})

    elif request.method == 'POST':
        categoria, _ = Category.objects.get_or_create(name=request.POST.get('categoria', 'General'))
        try:
            precio = Decimal(request.POST.get('precio', '0'))
        except (InvalidOperation, TypeError):
            precio = Decimal('0')
        try:
            precioCompra = Decimal(request.POST.get('precioCompra', '0'))
        except (InvalidOperation, TypeError):
            precioCompra = Decimal('0')
        try:
            stock = int(request.POST.get('stock', '0'))
        except (ValueError, TypeError):
            stock = 0
        producto = Product.objects.create(
            category=categoria,
            name=request.POST.get('nombre', ''),
            description=request.POST.get('descripcion', ''),
            price=precio,
            cost_price=precioCompra,
            stock=stock,
        )
        _ensure_product_barcode(producto)
        if 'imagen' in request.FILES:
            producto.image = request.FILES['imagen']
            producto.save()
        return JsonResponse({'success': True, 'id': producto.id})


@csrf_exempt
@require_http_methods(['GET', 'POST', 'PUT', 'DELETE'])
@_staff_required
def api_producto_detalle(request, producto_id):
    producto = get_object_or_404(Product, id=producto_id)
    if request.method == 'GET':
        return JsonResponse({
            'id': producto.id,
            'nombre': producto.name,
            'codigo': _ensure_product_barcode(producto),
            'descripcion': producto.description,
            'precio': float(producto.price),
            'stock': producto.stock,
        })
    elif request.method in ('PUT', 'POST'):
        if request.content_type and 'multipart/form-data' in request.content_type:
            producto.name = request.POST.get('nombre', producto.name)
            producto.description = request.POST.get('descripcion', producto.description)
            cat_name = request.POST.get('categoria', '')
            if cat_name:
                categoria, _ = Category.objects.get_or_create(name=cat_name)
                producto.category = categoria
            _ensure_product_barcode(producto)
            try:
                producto.price = Decimal(request.POST.get('precio', str(producto.price)))
            except (InvalidOperation, TypeError):
                pass
            try:
                producto.cost_price = Decimal(request.POST.get('precioCompra', str(producto.cost_price)))
            except (InvalidOperation, TypeError):
                pass
            try:
                producto.stock = int(request.POST.get('stock', str(producto.stock)))
            except (ValueError, TypeError):
                pass
            if 'imagen' in request.FILES:
                producto.image = request.FILES['imagen']
        else:
            data = json.loads(request.body)
            producto.name = data.get('nombre', producto.name)
            producto.description = data.get('descripcion', producto.description)
            cat_name = data.get('categoria', '')
            if cat_name:
                categoria, _ = Category.objects.get_or_create(name=cat_name)
                producto.category = categoria
            try:
                producto.price = Decimal(str(data.get('precio', producto.price)))
            except (InvalidOperation, TypeError):
                pass
            try:
                producto.cost_price = Decimal(str(data.get('precioCompra', producto.cost_price)))
            except (InvalidOperation, TypeError):
                pass
            producto.stock = data.get('stock', producto.stock)
        producto.save()
        return JsonResponse({'success': True})
    elif request.method == 'DELETE':
        producto.delete()
        return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@_staff_required
def api_lotes(request, producto_id):
    producto = get_object_or_404(Product, id=producto_id)
    if request.method == 'GET':
        lotes = producto.batches.all()
        data = [{
            'id': b.id,
            'numeroLote': b.batch_code,
            'precio': float(b.cost_price),
            'cantidad': b.quantity,
            'fechaVencimiento': b.expiry_date.strftime('%d/%m/%Y') if b.expiry_date else '',
            'proveedor': b.supplier,
        } for b in lotes]
        return JsonResponse({'lotes': data})
    elif request.method == 'POST':
        body = json.loads(request.body)
        try:
            cost_price = Decimal(str(body.get('precio', 0)))
        except (InvalidOperation, TypeError):
            cost_price = Decimal('0')
        try:
            quantity = int(body.get('cantidad', 0))
        except (ValueError, TypeError):
            quantity = 0
        lote = ProductBatch.objects.create(
            product=producto,
            batch_code=body.get('numeroLote', 'LOT-' + str(producto.batches.count() + 1)),
            cost_price=cost_price,
            quantity=quantity,
            expiry_date=body.get('fechaVencimiento', None) or None,
            supplier=body.get('proveedor', ''),
        )
        producto.cost_price = cost_price
        producto.save()
        return JsonResponse({'success': True, 'id': lote.id})


@csrf_exempt
@require_http_methods(['GET'])
@_staff_required
def api_pedidos(request):
    orders = Order.objects.select_related('user').filter(
        boleta_code__isnull=False
    ).exclude(status__in=['delivered', 'cancelled']).order_by('-created_at')
    data = [{
        'id': o.id,
        'cliente': o.user.get_full_name() or o.user.username,
        'items': o.items.count(),
        'total': float(o.total),
        'estado': o.get_status_display(),
        'canal': 'Online',
        'fecha': o.created_at.strftime('%d/%m/%Y'),
        'direccion': o.user.profile.address if hasattr(o.user, 'profile') else '',
    } for o in orders]
    return JsonResponse({'pedidos': data})


@csrf_exempt
@require_http_methods(['PUT'])
@_staff_required
def api_pedido_estado(request, pedido_id):
    pedido = get_object_or_404(Order, id=pedido_id)
    body = json.loads(request.body)
    nuevo_estado = body.get('estado', '')
    estado_map = {
        'Pendiente': 'pending',
        'En preparacion': 'preparing',
        'Listo para recoger': 'ready',
        'Listo': 'ready',
        'Entregado': 'delivered',
        'Cancelado': 'cancelled',
    }
    if nuevo_estado in estado_map:
        pedido.status = estado_map[nuevo_estado]
        pedido.save()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Estado inválido'}, status=400)


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@_staff_required
def api_ventas(request):
    if request.method == 'GET':
        orders = Order.objects.select_related('user').filter(
            status__in=['delivered', 'ready', 'cancelled']
        ).order_by('-created_at')
        data = []
        for o in orders:
            is_staff_sale = (o.user.is_staff or
                (hasattr(o.user, 'profile') and o.user.profile.role and
                 o.user.profile.role.name in ('admin', 'employee')))
            data.append({
                'id': o.id,
                'boleta_code': o.boleta_code or '',
                'cliente': o.user.get_full_name() or o.user.username,
                'trabajador': o.user.get_full_name() if is_staff_sale else '',
                'canal': 'Presencial' if is_staff_sale else 'Online',
                'total': float(o.total),
                'metodo': o.get_payment_method_display() if o.payment_method else 'Efectivo',
                'estado': 'Cancelada' if o.status == 'cancelled' else ('Completada' if o.is_paid else 'Pendiente'),
                'fecha': o.created_at.strftime('%d/%m/%Y'),
                'items': o.items.count(),
            })
        return JsonResponse({'ventas': data})

    elif request.method == 'POST':
        from django.db import transaction

        body = json.loads(request.body)
        items = body.get('items', [])
        metodo = body.get('metodo', 'Efectivo')

        is_digital = metodo in ('Yape', 'Plin', 'Transferencia')
        metodo_map = {
            'Efectivo': 'cash',
            'Yape': 'yape',
            'Plin': 'plin',
            'Transferencia': 'transfer',
        }
        payment_method = metodo_map.get(metodo, 'cash')

        with transaction.atomic():
            total = 0
            order = Order.objects.create(
                user=request.user,
                status='pending' if is_digital else 'delivered',
                payment_method=payment_method,
                total=0,
                is_paid=False if is_digital else True,
            )

            order.boleta_code = _generate_boleta_code()

            for item in items:
                product = Product.objects.filter(id=item.get('id')).first()
                quantity = int(item['cantidad'])
                price = float(item['precio'])
                total += price * quantity

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=item['nombre'],
                    quantity=quantity,
                    price=price,
                )

                if product:
                    _reduce_stock_fifo(product, quantity)

            order.total = total
            order.save()

        response_data = {'success': True, 'id': order.id, 'boleta_code': order.boleta_code}

        if is_digital:
            view_name_map = {
                'Yape': 'payment_simulation:yape_with_order',
                'Plin': 'payment_simulation:plin_with_order',
                'Transferencia': 'payment_simulation:bcp_transfer_with_order',
            }
            sim_view_name = view_name_map.get(metodo, 'payment_simulation:home')
            sim_absolute_url = build_simulation_absolute_uri(
                request, sim_view_name, **{'order_id': order.id}
            )
            sim_qr_b64 = _generate_qr_base64(sim_absolute_url)
            sim_url = reverse(sim_view_name, kwargs={'order_id': order.id})

            response_data.update({
                'pending_payment': True,
                'simulation_url': sim_url,
                'simulation_qr_b64': sim_qr_b64,
            })

        return JsonResponse(response_data)


def _generate_boleta_code():
    prefix = 'B001'
    last = Order.objects.filter(boleta_code__startswith=prefix + '-').order_by('boleta_code').last()
    if last and last.boleta_code:
        parts = last.boleta_code.split('-')
        last_num = int(parts[1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f'{prefix}-{next_num:06d}'


def _generate_qr_base64(url):
    qr = qrcode.make(url, box_size=8, border=2)
    buf = io.BytesIO()
    qr.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode()


@csrf_exempt
@require_http_methods(['POST'])
@_staff_required
def api_venta_completar_pago(request, venta_id):
    order = get_object_or_404(Order, id=venta_id)
    order.is_paid = True
    order.paid_at = timezone.now()
    order.status = 'delivered'
    order.save()
    return JsonResponse({'success': True})


def _parse_request_body(request):
    if request.content_type and 'multipart' in request.content_type:
        return request.POST.dict(), request.FILES
    try:
        body = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, AttributeError):
        body = request.POST.dict()
    return body, request.FILES


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@_staff_required
def api_gastos(request):
    if request.method == 'GET':
        gastos = Expense.objects.all().order_by('-created_at')
        data = [{
            'id': g.id,
            'concepto': g.concept,
            'tipo': g.type,
            'monto': float(g.amount),
            'fecha': g.date.strftime('%d/%m/%Y'),
            'descripcion': g.description,
            'comprobante_url': g.comprobante.url if g.comprobante else None,
        } for g in gastos]
        return JsonResponse({'gastos': data})

    elif request.method == 'POST':
        body, files = _parse_request_body(request)
        gasto = Expense.objects.create(
            concept=body['concepto'],
            type=body['tipo'],
            amount=body['monto'],
            date=body['fecha'],
            description=body.get('descripcion', ''),
            created_by=request.user,
            comprobante=files.get('comprobante'),
        )
        return JsonResponse({
            'success': True,
            'id': gasto.id,
            'comprobante_url': gasto.comprobante.url if gasto.comprobante else None,
        })


@csrf_exempt
@require_http_methods(['GET', 'POST', 'DELETE'])
@_staff_required
def api_gasto_detalle(request, gasto_id):
    gasto = get_object_or_404(Expense, id=gasto_id)
    if request.method == 'GET':
        return JsonResponse({
            'id': gasto.id,
            'concepto': gasto.concept,
            'tipo': gasto.type,
            'monto': float(gasto.amount),
            'fecha': gasto.date.strftime('%d/%m/%Y'),
            'descripcion': gasto.description,
            'comprobante_url': gasto.comprobante.url if gasto.comprobante else None,
        })
    elif request.method == 'POST':
        body, files = _parse_request_body(request)
        gasto.concept = body.get('concepto', gasto.concept)
        gasto.type = body.get('tipo', gasto.type)
        gasto.amount = body.get('monto', gasto.amount)
        gasto.date = body.get('fecha', gasto.date)
        gasto.description = body.get('descripcion', gasto.description)
        if 'comprobante' in files:
            gasto.comprobante = files['comprobante']
        elif body.get('comprobante_clear'):
            gasto.comprobante.delete()
            gasto.comprobante = None
        gasto.save()
        return JsonResponse({'success': True, 'comprobante_url': gasto.comprobante.url if gasto.comprobante else None})
    elif request.method == 'DELETE':
        gasto.delete()
        return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@_staff_required
def api_usuarios(request):
    if request.method == 'GET':
        usuarios = User.objects.select_related('profile').all()
        data = [{
            'id': u.id,
            'nombre': u.first_name or u.username,
            'apellido': u.last_name or '',
            'email': u.email,
            'rol': u.profile.role.name if u.profile.role else 'client',
            'activo': u.is_active,
            'telefono': u.profile.phone if hasattr(u, 'profile') else '',
            'direccion': u.profile.address if hasattr(u, 'profile') else '',
            'fechaRegistro': u.date_joined.strftime('%d/%m/%Y'),
        } for u in usuarios]
        return JsonResponse({'usuarios': data})

    elif request.method == 'POST':
        body = json.loads(request.body)
        nombre = body.get('nombre', '').strip()
        apellido = body.get('apellido', '').strip()
        email = body.get('email', '').strip()
        telefono = body.get('telefono', '')
        rol = body.get('rol', 'employee')
        direccion = body.get('direccion', '').strip()

        if not nombre or not email:
            return JsonResponse({'success': False, 'error': 'Nombre y email son obligatorios'}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Ya existe un usuario con ese email'}, status=400)

        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=nombre,
            last_name=apellido,
            password='cambiar123',
        )

        if rol in ('admin', 'employee'):
            user.is_staff = True
            user.save()

        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.role = Role.objects.get(name=rol)
        profile.phone = telefono
        profile.address = direccion
        profile.save()

        return JsonResponse({'success': True, 'id': user.id, 'username': username})


@csrf_exempt
@require_http_methods(['GET', 'PUT'])
@_staff_required
def api_usuario_detalle(request, usuario_id):
    usuario = get_object_or_404(User, id=usuario_id)
    if request.method == 'GET':
        return JsonResponse({
            'id': usuario.id,
            'nombre': usuario.first_name or usuario.username,
            'apellido': usuario.last_name or '',
            'email': usuario.email,
            'rol': usuario.profile.role.name if hasattr(usuario, 'profile') and usuario.profile.role else 'client',
            'activo': usuario.is_active,
            'telefono': usuario.profile.phone if hasattr(usuario, 'profile') else '',
            'direccion': usuario.profile.address if hasattr(usuario, 'profile') else '',
            'fechaRegistro': usuario.date_joined.strftime('%d/%m/%Y'),
        })
    elif request.method == 'PUT':
        body = json.loads(request.body)
        nombre = body.get('nombre', '').strip()
        apellido = body.get('apellido', '').strip()
        email = body.get('email', '').strip()
        telefono = body.get('telefono', '')
        rol = body.get('rol', '')
        direccion = body.get('direccion', '').strip()

        if email and email != usuario.email:
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe un usuario con ese email'}, status=400)
            usuario.email = email

        if nombre:
            usuario.first_name = nombre
        if apellido:
            usuario.last_name = apellido
        usuario.save()

        if hasattr(usuario, 'profile'):
            if rol:
                usuario.profile.role = Role.objects.get(name=rol)
            usuario.profile.phone = telefono
            usuario.profile.address = direccion
            usuario.profile.save()

        return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(['POST'])
@_staff_required
def api_usuario_toggle(request, usuario_id):
    usuario = get_object_or_404(User, id=usuario_id)
    usuario.is_active = not usuario.is_active
    usuario.save()
    return JsonResponse({'success': True, 'activo': usuario.is_active})


@csrf_exempt
@require_http_methods(['POST'])
@_staff_required
def api_usuario_reset_password(request, usuario_id):
    usuario = get_object_or_404(User, id=usuario_id)
    usuario.set_password('cambiar123')
    usuario.save()
    return JsonResponse({'success': True})
