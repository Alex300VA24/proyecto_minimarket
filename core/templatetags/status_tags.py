from django import template
from django.utils.safestring import mark_safe

register = template.Library()

STATUS_MAPS = {
    'order': {
        'pending': 'bg-yellow-100 text-yellow-700',
        'confirmed': 'bg-blue-100 text-blue-700',
        'preparing': 'bg-purple-100 text-purple-700',
        'ready': 'bg-green-100 text-green-700',
        'delivered': 'bg-ink-100 text-ink-600',
        'cancelled': 'bg-red-100 text-red-600',
    },
    'admin_order': {
        'Pendiente': 'bg-yellow-100 text-yellow-700',
        'En preparacion': 'bg-blue-100 text-blue-700',
        'Listo': 'bg-purple-100 text-purple-700',
        'Entregado': 'bg-green-100 text-green-700',
    },
    'admin_venta': {
        'Completada': 'bg-green-100 text-green-700',
        'Pendiente': 'bg-yellow-100 text-yellow-700',
        'Cancelada': 'bg-red-100 text-red-600',
    },
}

@register.filter
def badge_class(status, map_type='order'):
    m = STATUS_MAPS.get(map_type, STATUS_MAPS['order'])
    return m.get(status, 'bg-red-100 text-red-600')
