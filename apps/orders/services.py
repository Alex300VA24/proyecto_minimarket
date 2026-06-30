from django.db import transaction

from .models import Cart, CartItem


class CartService:

    @staticmethod
    def get_cart(request):
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
        return cart

    @staticmethod
    def get_cart_data(request):
        cart = CartService.get_cart(request)
        items = [{
            'id': item.id,
            'product_id': item.product_id,
            'name': item.product.name,
            'price': float(item.product.price),
            'quantity': item.quantity,
            'subtotal': float(item.subtotal),
            'image': item.product.image.url if item.product.image else None,
        } for item in cart.items.select_related('product')]
        return {
            'items': items,
            'total': float(cart.total),
            'count': len(items),
        }

    @staticmethod
    def add_item(request, product_id, quantity=1):
        from apps.products.models import Product

        product = Product.objects.get(pk=product_id, is_available=True)
        if product.stock <= 0:
            raise ValueError('Producto sin stock disponible.')
        cart = CartService.get_cart(request)

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product,
            defaults={'quantity': quantity},
        )
        if not created:
            item.quantity += quantity
            item.save()

        return item

    @staticmethod
    def update_item(request, item_id, quantity):
        cart = CartService.get_cart(request)
        item = CartItem.objects.get(pk=item_id, cart=cart)
        if quantity <= 0:
            item.delete()
            return None
        item.quantity = quantity
        item.save()
        return item

    @staticmethod
    def remove_item(request, item_id):
        cart = CartService.get_cart(request)
        item = CartItem.objects.get(pk=item_id, cart=cart)
        item.delete()

    @staticmethod
    def clear_cart(request):
        cart = CartService.get_cart(request)
        cart.items.all().delete()

    @staticmethod
    def merge_carts(session_key, user):
        if not session_key:
            return
        anon_carts = Cart.objects.filter(session_key=session_key, user__isnull=True)
        if not anon_carts.exists():
            return
        user_cart, _ = Cart.objects.get_or_create(user=user)
        for anon_cart in anon_carts:
            for anon_item in anon_cart.items.select_related('product'):
                item, created = CartItem.objects.get_or_create(
                    cart=user_cart, product=anon_item.product,
                    defaults={'quantity': anon_item.quantity},
                )
                if not created:
                    item.quantity += anon_item.quantity
                    item.save()
            anon_cart.delete()
