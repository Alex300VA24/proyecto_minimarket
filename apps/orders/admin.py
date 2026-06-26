from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total', 'created_at', 'updated_at']
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['pk', 'user', 'status', 'total', 'created_at']
    list_filter = ['status']
    inlines = [OrderItemInline]
    actions = ['mark_confirmed', 'mark_preparing', 'mark_ready', 'mark_delivered']

    def mark_confirmed(self, request, queryset):
        queryset.update(status='confirmed')
    mark_confirmed.short_description = 'Marcar como confirmados'

    def mark_preparing(self, request, queryset):
        queryset.update(status='preparing')
    mark_preparing.short_description = 'Marcar como en preparación'

    def mark_ready(self, request, queryset):
        queryset.update(status='ready')
    mark_ready.short_description = 'Marcar como listos para recoger'

    def mark_delivered(self, request, queryset):
        queryset.update(status='delivered')
    mark_delivered.short_description = 'Marcar como entregados'


admin.site.register(CartItem)
admin.site.register(OrderItem)
