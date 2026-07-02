import json
import secrets
import string
import io
import base64
import random
from datetime import date

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.db import transaction
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

import qrcode
from xhtml2pdf import pisa

from apps.products.models import Product
from core.views import _reduce_stock_fifo
from payment_simulation.utils import build_simulation_absolute_uri
from .models import Cart, CartItem, Order, OrderItem


def generate_boleta_code():
    today = date.today()
    prefix = today.strftime('%y%m%d')
    last = Order.objects.filter(boleta_code__startswith=prefix).order_by('boleta_code').last()
    if last and last.boleta_code:
        last_num = int(last.boleta_code.split('-')[1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f'{prefix}-{next_num:03d}'


def generate_qr_base64(url):
    qr = qrcode.make(url, box_size=8, border=2)
    buf = io.BytesIO()
    qr.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode()


def _get_or_create_cart(request):
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            cart = Cart.objects.create(user=request.user)
    else:
        sk = request.session.session_key
        if not sk:
            request.session.save()
            sk = request.session.session_key
        cart = Cart.objects.filter(session_key=sk).first()
        if not cart:
            cart = Cart.objects.create(session_key=sk)
    return cart


def merge_anonymous_cart(request, old_session_key=None):
    sk = old_session_key or request.session.session_key
    if not sk:
        return
    anon_carts = Cart.objects.filter(session_key=sk, user__isnull=True)
    if not anon_carts.exists():
        return

    # Solo reemplazar si el carrito anónimo tiene al menos un producto.
    # Si el usuario navegó sin agregar nada, los carritos anónimos estarán
    # vacíos y no deben borrar el carrito existente del usuario.
    anon_items_exist = any(c.items.exists() for c in anon_carts)
    if not anon_items_exist:
        # Limpiar carritos vacíos y conservar el carrito del usuario intacto
        anon_carts.delete()
        return

    user_cart = Cart.objects.filter(user=request.user).first()
    if not user_cart:
        user_cart = Cart.objects.create(user=request.user)

    # El carrito anónimo reemplaza completamente al carrito del usuario
    user_cart.items.all().delete()
    for anon_cart in anon_carts:
        for anon_item in anon_cart.items.select_related('product'):
            CartItem.objects.create(
                cart=user_cart,
                product=anon_item.product,
                quantity=anon_item.quantity,
            )
        anon_cart.delete()


def cart_api_data(request):
    cart = _get_or_create_cart(request)
    items = [{
        'id': item.id,
        'product_id': item.product_id,
        'name': item.product.name,
        'price': float(item.product.price),
        'quantity': item.quantity,
        'subtotal': float(item.subtotal),
        'image': item.product.image.url if item.product.image else None,
    } for item in cart.items.select_related('product')]
    return JsonResponse({'success': True, 'items': items, 'total': float(cart.total), 'count': len(items)})


@login_required
@require_POST
def empty_cart(request):
    cart = _get_or_create_cart(request)
    cart.items.all().delete()
    return JsonResponse({'success': True})


@login_required
def pago_view(request):
    Order.objects.filter(
        user=request.user, is_paid=False, status='pending'
    ).delete()

    cart = _get_or_create_cart(request)
    items = [{
        'id': item.id,
        'product_id': item.product_id,
        'name': item.product.name,
        'price': float(item.product.price),
        'quantity': item.quantity,
        'subtotal': float(item.subtotal),
        'image': item.product.image.url if item.product.image else None,
    } for item in cart.items.select_related('product')]
    return render(request, 'orders/pago.html', {
        'cart_items': items,
        'cart_total': float(cart.total),
    })


@login_required
def cart_view(request):
    cart = _get_or_create_cart(request)
    return render(request, 'orders/cart.html', {'cart': cart})


@require_POST
def add_to_cart(request):
    if request.user.is_authenticated and request.user.profile.role in ('employee', 'empleado'):
        return JsonResponse({'success': False, 'error': 'No tienes permiso para agregar productos al carrito.'}, status=403)

    data = json.loads(request.body)
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))

    product = get_object_or_404(Product, pk=product_id, is_available=True)
    cart = _get_or_create_cart(request)

    item, created = CartItem.objects.get_or_create(
        cart=cart, product=product,
        defaults={'quantity': quantity},
    )
    if not created:
        item.quantity += quantity
        item.save()

    return JsonResponse({
        'success': True,
        'cart_total': float(cart.total),
        'cart_count': cart.items.count(),
    })


@require_POST
def update_cart_item(request, item_id):
    data = json.loads(request.body)
    quantity = int(data.get('quantity', 1))

    cart = _get_or_create_cart(request)
    item = get_object_or_404(CartItem, pk=item_id, cart=cart)
    if quantity <= 0:
        item.delete()
    else:
        item.quantity = quantity
        item.save()

    cart = item.cart if quantity > 0 else cart
    return JsonResponse({
        'success': True,
        'subtotal': float(item.subtotal) if quantity > 0 else 0,
        'cart_total': float(cart.total),
        'cart_count': cart.items.count(),
    })


@require_POST
def remove_from_cart(request, item_id):
    cart = _get_or_create_cart(request)
    item = get_object_or_404(CartItem, pk=item_id, cart=cart)
    cart = item.cart
    item.delete()

    return JsonResponse({
        'success': True,
        'cart_total': float(cart.total),
        'cart_count': cart.items.count(),
    })


@login_required
@require_POST
def create_order(request):
    cart = _get_or_create_cart(request)
    if not cart.items.exists():
        return JsonResponse({'success': False, 'error': 'Tu carrito está vacío.'})

    data = json.loads(request.body) if request.body else {}
    payment_method = data.get('payment_method', '')
    transfer_bank = data.get('transfer_bank', '')
    yape_type = data.get('yape_type', '')

    generated_code = ''
    if payment_method == 'yape' and yape_type == 'code':
        generated_code = str(random.randint(100000, 999999))

    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            total=cart.total,
            notes=data.get('notes', ''),
            payment_method=payment_method,
            transfer_bank=transfer_bank,
            yape_type=yape_type,
            generated_yape_code=generated_code,
            boleta_code=generate_boleta_code(),
        )

        for cart_item in cart.items.select_related('product'):
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                product_name=cart_item.product.name,
                quantity=cart_item.quantity,
                price=cart_item.product.price,
            )
            _reduce_stock_fifo(cart_item.product, cart_item.quantity)

    simulation_url = reverse('payment_simulation:home')
    if payment_method == 'yape':
        simulation_url = reverse('payment_simulation:yape_with_order', kwargs={'order_id': order.id})
    elif payment_method == 'plin':
        simulation_url = reverse('payment_simulation:plin_with_order', kwargs={'order_id': order.id})
    elif payment_method == 'transfer_bcp':
        simulation_url = reverse('payment_simulation:bcp_transfer_with_order', kwargs={'order_id': order.id})
    elif payment_method == 'transfer_interbank':
        simulation_url = reverse('payment_simulation:interbank_transfer_with_order', kwargs={'order_id': order.id})

    sim_qr_b64 = ''
    if simulation_url and payment_method:
        view_name = 'payment_simulation:' + {
            'yape': 'yape_with_order',
            'plin': 'plin_with_order',
            'transfer_bcp': 'bcp_transfer_with_order',
            'transfer_interbank': 'interbank_transfer_with_order',
        }.get(payment_method, 'home')
        kwargs_map = {'order_id': order.id} if payment_method in ('yape', 'plin', 'transfer_bcp', 'transfer_interbank') else {}
        sim_absolute_url = build_simulation_absolute_uri(request, view_name, **kwargs_map)
        sim_qr_b64 = generate_qr_base64(sim_absolute_url)

    return JsonResponse({
        'success': True,
        'order_id': order.id,
        'boleta_code': order.boleta_code,
        'simulation_url': simulation_url,
        'simulation_qr_b64': sim_qr_b64,
        'generated_yape_code': generated_code,
    })

@login_required
@require_POST
def checkout(request):
    # Keep the old checkout for backwards compatibility just in case
    cart = _get_or_create_cart(request)
    if not cart.items.exists():
        return JsonResponse({'success': False, 'error': 'Tu carrito está vacío.'})

    data = json.loads(request.body) if request.body else {}
    payment_method = data.get('payment_method', '')

    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            total=cart.total,
            notes=data.get('notes', ''),
            payment_method=data.get('payment_method', ''),
            yape_type=data.get('yape_type', ''),
            yape_code=data.get('yape_code', ''),
            transfer_bank=data.get('transfer_bank', ''),
            boleta_code=generate_boleta_code(),
        )

        for cart_item in cart.items.select_related('product'):
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                product_name=cart_item.product.name,
                quantity=cart_item.quantity,
                price=cart_item.product.price,
            )
            _reduce_stock_fifo(cart_item.product, cart_item.quantity)

    verify_url = build_simulation_absolute_uri(request, 'boleta', boleta_code=order.boleta_code)
    qr_b64 = generate_qr_base64(verify_url)

    return JsonResponse({
        'success': True,
        'order': {
            'id': order.pk,
            'boleta_code': order.boleta_code,
            'total': float(order.total),
            'status': order.status,
            'status_display': order.get_status_display(),
            'payment_method': order.get_payment_method_display(),
            'qr_base64': qr_b64,
        }
    })


@login_required
def boleta_view(request, boleta_code):
    order = get_object_or_404(Order, boleta_code=boleta_code, user=request.user)
    payment_url = build_simulation_absolute_uri(request, 'payment_order', order_id=order.id)
    qr_b64 = generate_qr_base64(payment_url)
    return render(request, 'orders/boleta.html', {
        'order': order,
        'qr_b64': qr_b64,
        'verify_url': payment_url,
    })


@login_required
def boleta_pdf_view(request, boleta_code):
    order = get_object_or_404(Order, boleta_code=boleta_code, user=request.user)
    payment_url = build_simulation_absolute_uri(request, 'payment_order', order_id=order.id)
    qr_b64 = generate_qr_base64(payment_url)

    html_string = render_to_string('orders/boleta_pdf.html', {
        'order': order,
        'qr_b64': qr_b64,
        'verify_url': payment_url,
    })

    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode('utf-8')), result, encoding='utf-8')

    if pdf.err:
        return HttpResponse('Error al generar el PDF', status=500)

    response = HttpResponse(result.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="boleta_{order.boleta_code}.pdf"'
    return response


@login_required
@require_POST
def verify_boleta(request, boleta_code):
    if not request.user.profile.role in ('admin', 'employee'):
        return JsonResponse({'success': False, 'error': 'Solo el personal autorizado puede verificar boletas.'})

    order = get_object_or_404(Order, boleta_code=boleta_code)
    if order.status == 'cancelled':
        return JsonResponse({'success': False, 'error': 'Este pedido fue cancelado.'})

    if order.status == 'delivered':
        return JsonResponse({'success': True, 'message': 'Este pedido ya fue entregado.', 'status': order.status})

    next_status = {'pending': 'confirmed', 'confirmed': 'preparing', 'preparing': 'ready', 'ready': 'delivered'}
    new_status = next_status.get(order.status, 'delivered')
    order.status = new_status
    order.save()

    return JsonResponse({
        'success': True,
        'message': f'Pedido #{order.pk} actualizado a {order.get_status_display()}.',
        'status': order.status,
        'status_display': order.get_status_display(),
        'is_paid': order.is_paid,
    })


@login_required
def my_orders_view(request):
    orders = Order.objects.filter(
        user=request.user
    ).exclude(status='pending', is_paid=False)
    return render(request, 'orders/my_orders.html', {'orders': orders})


@login_required
def orders_api_data(request):
    orders = Order.objects.filter(
        user=request.user
    ).exclude(status='pending', is_paid=False).order_by('-created_at')
    data = [{
        'id': o.pk,
        'status': o.status,
        'status_display': o.get_status_display(),
        'total': float(o.total),
        'date': o.created_at.strftime('%d/%m/Y H:i'),
        'items_count': o.items.count(),
        'notes': o.notes or '',
        'boleta_code': o.boleta_code or '',
        'payment_method': o.get_payment_method_display() if o.payment_method else '',
        'is_paid': o.is_paid,
    } for o in orders]
    return JsonResponse({'success': True, 'orders': data})


@login_required
def order_detail_api_data(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user)
    items = [{
        'name': item.product_name,
        'quantity': item.quantity,
        'price': float(item.price),
        'subtotal': float(item.subtotal),
    } for item in order.items.all()]

    qr_b64 = None
    if order.boleta_code:
        payment_url = build_simulation_absolute_uri(request, 'payment_order', order_id=order.id)
        qr_b64 = generate_qr_base64(payment_url)

    data = {
        'id': order.pk,
        'status': order.status,
        'status_display': order.get_status_display(),
        'total': float(order.total),
        'date': order.created_at.strftime('%d/%m/Y H:i'),
        'notes': order.notes or '',
        'items': items,
        'boleta_code': order.boleta_code or '',
        'payment_method': order.get_payment_method_display() if order.payment_method else '',
        'is_paid': order.is_paid,
        'qr_base64': qr_b64,
    }
    return JsonResponse({'success': True, 'order': data})


@login_required
def order_detail_view(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user)
    return render(request, 'orders/order_detail.html', {'order': order})


@login_required
def payment_order_view(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user)
    if order.is_paid:
        return redirect('boleta', boleta_code=order.boleta_code)

    sim_url = reverse('payment_simulation:home')
    if order.payment_method == 'yape':
        sim_url = reverse('payment_simulation:yape_with_order', kwargs={'order_id': order.id})
    elif order.payment_method == 'plin':
        sim_url = reverse('payment_simulation:plin_with_order', kwargs={'order_id': order.id})
    elif order.payment_method == 'transfer_bcp':
        sim_url = reverse('payment_simulation:bcp_transfer_with_order', kwargs={'order_id': order.id})
    elif order.payment_method == 'transfer_interbank':
        sim_url = reverse('payment_simulation:interbank_transfer_with_order', kwargs={'order_id': order.id})

    items = [{
        'name': item.product_name,
        'quantity': item.quantity,
        'price': float(item.price),
        'subtotal': float(item.subtotal),
    } for item in order.items.all()]

    return render(request, 'orders/payment_order.html', {
        'order': order,
        'items': items,
        'simulation_url': sim_url,
    })


@login_required
def payment_order_api(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user)
    items = [{
        'name': item.product_name,
        'quantity': item.quantity,
        'price': float(item.price),
        'subtotal': float(item.subtotal),
    } for item in order.items.all()]

    qr_b64 = None
    sim_qr_b64 = ''
    if order.boleta_code:
        payment_url = request.build_absolute_uri(
            reverse('payment_order', kwargs={'order_id': order.id})
        )
        qr_b64 = generate_qr_base64(payment_url)

    view_name = 'payment_simulation:' + {
        'yape': 'yape_with_order',
        'plin': 'plin_with_order',
        'transfer_bcp': 'bcp_transfer_with_order',
        'transfer_interbank': 'interbank_transfer_with_order',
    }.get(order.payment_method, 'home')
    kwargs_map = {'order_id': order.id} if order.payment_method in ('yape', 'plin', 'transfer_bcp', 'transfer_interbank') else {}
    sim_absolute_url = build_simulation_absolute_uri(request, view_name, **kwargs_map)
    sim_qr_b64 = generate_qr_base64(sim_absolute_url)

    return JsonResponse({
        'success': True,
        'order': {
            'id': order.pk,
            'status': order.status,
            'status_display': order.get_status_display(),
            'total': float(order.total),
            'date': order.created_at.strftime('%d/%m/%Y %H:%M'),
            'items': items,
            'boleta_code': order.boleta_code or '',
            'payment_method': order.payment_method,
            'payment_method_display': order.get_payment_method_display(),
            'yape_type': order.yape_type,
            'transfer_bank': order.transfer_bank,
            'is_paid': order.is_paid,
            'qr_base64': qr_b64,
            'simulation_qr_b64': sim_qr_b64,
            'generated_yape_code': order.generated_yape_code,
        }
    })


@login_required
@require_POST
def cancel_order(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user)

    if not order.is_paid and order.status == 'pending':
        order.delete()
        messages.success(request, 'Pedido cancelado.')
        return redirect('pago')

    if order.status in ('pending', 'confirmed'):
        order.status = 'cancelled'
        order.save()
        messages.success(request, f'Pedido #{order.pk} cancelado.')
    else:
        messages.error(request, 'No se puede cancelar un pedido en preparación o entregado.')
    return redirect('my_orders')


@login_required
@require_POST
def cancel_unpaid_order(request, order_id):
    order = get_object_or_404(Order, pk=order_id, user=request.user, is_paid=False, status='pending')
    order.delete()
    cart = _get_or_create_cart(request)
    return JsonResponse({
        'success': True,
        'cart_total': float(cart.total),
        'cart_count': cart.items.count(),
    })
