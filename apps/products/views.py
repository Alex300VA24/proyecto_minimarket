from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse

from .models import Category, Product


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

    return render(request, 'products/product_detail.html', {
        'product': product,
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
