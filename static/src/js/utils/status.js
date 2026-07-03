const ORDER_STATUS_MAP = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-ink-100 text-ink-600',
  cancelled: 'bg-red-100 text-red-600',
};

const ADMIN_ORDER_STATUS_MAP = {
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'En preparacion': 'bg-blue-100 text-blue-700',
  'Listo': 'bg-purple-100 text-purple-700',
  'Entregado': 'bg-green-100 text-green-700',
};

const ADMIN_VENTA_STATUS_MAP = {
  'Completada': 'bg-green-100 text-green-700',
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'Cancelada': 'bg-red-100 text-red-600',
};

const STATUS_DISPLAY = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo para recoger',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function orderBadgeClass(status) {
  return ORDER_STATUS_MAP[status] || 'bg-red-100 text-red-600';
}

export function adminOrderBadgeClass(status) {
  return ADMIN_ORDER_STATUS_MAP[status] || 'bg-purple-100 text-purple-700';
}

export function adminVentaBadgeClass(status) {
  return ADMIN_VENTA_STATUS_MAP[status] || 'bg-red-100 text-red-600';
}

export function isOrderCancellable(status) {
  return status === 'pending' || status === 'confirmed';
}

export function statusDisplay(status) {
  return STATUS_DISPLAY[status] || status;
}
