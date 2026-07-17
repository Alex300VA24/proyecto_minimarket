import { apiFetch } from '../services/api.js';
import { SwalSuccess, SwalError } from '../utils/swal.js';
import { a11yNotify } from '../utils/notify.js';

export function saveProfile(e) {
  e.preventDefault();
  const form = document.getElementById('profile-form');
  const data = new FormData(form);

  apiFetch(form.action, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: data
  }).then(d => {
    if (d.success) {
      if (!a11yNotify('success', 'Cambios guardados', 'Tu perfil se actualizó correctamente.')) SwalSuccess('Cambios guardados', 'Tu perfil se actualizó correctamente.');
    } else {
      if (!a11yNotify('error', 'Error', d.errors ? Object.values(d.errors).join(' ') : 'No se pudieron guardar los cambios.')) Swal.fire({
        icon: 'error', title: 'Error',
        text: d.errors ? Object.values(d.errors).join(' ') : 'No se pudieron guardar los cambios.',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'swal2-border-radius' }
      });
    }
  }).catch(() => {
    if (!a11yNotify('error', 'Error de conexión', 'Intenta de nuevo.')) SwalError('Error de conexión', 'Intenta de nuevo.');
  });
  return false;
}

export function changePassword(e) {
  e.preventDefault();
  const form = document.getElementById('password-form');
  const msgDiv = document.getElementById('password-msg');
  const data = new FormData(form);

  apiFetch(form.action, {
    method: 'POST',
    headers: { 'X-CSRFToken': data.get('csrfmiddlewaretoken') },
    body: data
  }).then(d => {
    msgDiv.classList.remove('hidden');
    if (d.success) {
      msgDiv.className = 'mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-green-100 text-green-700';
      msgDiv.textContent = 'Contraseña actualizada correctamente.';
      form.reset();
      a11yNotify('success', 'Contraseña actualizada');
    } else {
      const msgs = [];
      if (d.errors) {
        for (const field in d.errors) {
          msgs.push(d.errors[field].join(' '));
        }
      }
      msgDiv.className = 'mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-100 text-red-700';
      msgDiv.textContent = msgs.length ? msgs.join(' ') : 'Error al cambiar la contraseña.';
    }
  }).catch(() => {
    msgDiv.classList.remove('hidden');
    msgDiv.className = 'mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-100 text-red-700';
    msgDiv.textContent = 'Error de conexión. Intenta de nuevo.';
  });
  return false;
}
