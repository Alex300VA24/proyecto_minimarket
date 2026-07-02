from django.conf import settings
from django.db import models

from apps.products.models import Product


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='carts',
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Carrito'
        verbose_name_plural = 'Carritos'

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

    def __str__(self):
        owner = self.user.username if self.user else f'sesión {self.session_key}'
        return f'Carrito de {owner} — {self.items.count()} ítem(s)'


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='cart_items'
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = 'Ítem del carrito'
        verbose_name_plural = 'Ítems del carrito'
        unique_together = ('cart', 'product')

    @property
    def subtotal(self):
        return self.product.price * self.quantity

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('confirmed', 'Confirmado'),
        ('preparing', 'Preparando'),
        ('ready', 'Listo para recoger'),
        ('delivered', 'Entregado'),
        ('cancelled', 'Cancelado'),
    ]

    PAYMENT_CHOICES = [
        ('yape', 'Yape'),
        ('plin', 'Plin'),
        ('cash', 'Efectivo'),
        ('transfer', 'Transferencia'),
    ]

    YAPE_TYPE_CHOICES = [
        ('qr', 'QR'),
        ('code', 'Código de aprobación'),
    ]

    BANK_CHOICES = [
        ('bcp', 'BCP'),
        ('interbank', 'Interbank'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_CHOICES, blank=True, default=''
    )
    yape_type = models.CharField(
        max_length=10, choices=YAPE_TYPE_CHOICES, blank=True, default=''
    )
    yape_code = models.CharField(max_length=6, blank=True, default='')
    generated_yape_code = models.CharField(max_length=6, blank=True, default='')  # Código que se genera en la simulación
    transfer_bank = models.CharField(
        max_length=20, choices=BANK_CHOICES, blank=True, default=''
    )
    boleta_code = models.CharField(max_length=12, unique=True, blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.pk} — {self.user.username} ({self.get_status_display()})'


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, related_name='order_items'
    )
    product_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Ítem del pedido'
        verbose_name_plural = 'Ítems del pedido'

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f'{self.quantity} x {self.product_name}'
