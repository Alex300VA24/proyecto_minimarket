import { getCsrf } from '../services/api.js';
import { API } from '../services/urls.js';

export function confirmCancel(orderId) {
  Swal.fire({
    title: '¿Cancelar este pedido?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#78716c',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No, volver',
    customClass: { popup: 'swal2-border-radius' }
  }).then(result => {
    if (result.isConfirmed) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = API.ORDER_CANCEL(orderId);
      const csrf = document.createElement('input');
      csrf.type = 'hidden';
      csrf.name = 'csrfmiddlewaretoken';
      csrf.value = getCsrf();
      form.appendChild(csrf);
      document.body.appendChild(form);
      form.submit();
    }
  });
}
