import json
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.decorators import staff_required
from .models import Category, Product, ProductBatch


def catalog_view(request):
    category_slug = request.GET.get('category')
    search = request.GET.get('q', '')

    products = Product.objects.filter(is_available=True)
    categories = Category.objects.filter(is_active=True)

    if category_slug:
        products = products.filter(category__slug=category_slug)

    if search:
        products = products.filter(name__icontains=search)

    selected_category = None
    if category_slug:
        selected_category = get_object_or_404(Category, slug=category_slug)

    return render(request, 'products/catalog.html', {
        'products': products,
        'categories': categories,
        'selected_category': selected_category,
        'search': search,
    })


def product_detail_view(request, slug):
    product = get_object_or_404(Product, slug=slug, is_available=True)
    related_products = Product.objects.filter(
        category=product.category, is_available=True
    ).exclude(pk=product.pk)[:4]

    total_stock = sum(b.quantity for b in product.batches.all()) + product.stock

    return render(request, 'products/product_detail.html', {
        'product': product,
        'total_stock': total_stock,
        'related_products': related_products,
    })


def catalog_api_data(request):
    category_slug = request.GET.get('category')
    search = request.GET.get('q', '')

    products = Product.objects.filter(is_available=True)
    categories = Category.objects.filter(is_active=True)

    if category_slug:
        products = products.filter(category__slug=category_slug)
    if search:
        products = products.filter(name__icontains=search)

    products_data = [{
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'price': float(p.price),
        'stock': sum(b.quantity for b in p.batches.all()) + p.stock,
        'category': p.category.name,
        'description': p.description or '',
        'image': p.image.url if p.image else None,
    } for p in products]

    categories_data = [{
        'name': c.name,
        'slug': c.slug,
    } for c in categories]

    return JsonResponse({'success': True, 'products': products_data, 'categories': categories_data})


@csrf_exempt
@require_http_methods(['GET', 'POST'])
@staff_required
def api_productos(request):
    if request.method == 'GET':
        busqueda = request.GET.get('q', '')
        categoria = request.GET.get('categoria', '')
        productos = Product.objects.all()
        if busqueda:
            productos = productos.filter(
                Q(name__icontains=busqueda) | Q(slug__icontains=busqueda) | Q(codigo__icontains=busqueda)
            )
        if categoria:
            productos = productos.filter(category__name=categoria)
        data = []
        for p in productos:
            batches = p.batches.all()
            total_stock = sum(b.quantity for b in batches) + p.stock
            data.append({
                'id': p.id,
                'nombre': p.name,
                'codigo': p.codigo or p.slug,
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
        if 'imagen' in request.FILES:
            producto.image = request.FILES['imagen']
            producto.save()
        return JsonResponse({'success': True, 'id': producto.id})


@csrf_exempt
@require_http_methods(['GET', 'POST', 'DELETE'])
@staff_required
def api_producto_detalle(request, producto_id=None):
    if request.method == 'GET':
        producto = get_object_or_404(Product, id=producto_id)
        total_stock = sum(b.quantity for b in producto.batches.all()) + producto.stock
        return JsonResponse({
            'id': producto.id,
            'nombre': producto.name,
            'descripcion': producto.description,
            'precio': float(producto.price),
            'stock': total_stock,
        })

    elif request.method == 'POST':
        if producto_id:  # si viene id, actualiza
            producto = get_object_or_404(Product, id=producto_id)
        else:  # si no, crea nuevo
            producto = Product()

        if request.content_type and 'multipart/form-data' in request.content_type:
            producto.name = request.POST.get('nombre', producto.name)
            producto.description = request.POST.get('descripcion', producto.description)
            cat_name = request.POST.get('categoria', '')
            if cat_name:
                categoria, _ = Category.objects.get_or_create(name=cat_name)
                producto.category = categoria
            try:
                producto.price = Decimal(request.POST.get('precio', str(producto.price)))
            except (InvalidOperation, TypeError):
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

        producto.save()
        return JsonResponse({'success': True})

    elif request.method == 'DELETE':
        producto = get_object_or_404(Product, id=producto_id)
        producto.delete()
        return JsonResponse({'success': True})




@csrf_exempt
@require_http_methods(['GET', 'POST'])
@staff_required
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
