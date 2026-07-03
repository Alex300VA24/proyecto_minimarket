import { SwalSuccess, SwalError } from '../utils/swal.js';

export function contactApp() {
  return {
    sent: false,
    form: { nombre: '', apellido: '', email: '', asunto: '', mensaje: '' },
    enviarMensaje() {
      if (!this.form.nombre || !this.form.email || !this.form.asunto || !this.form.mensaje) {
        Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor completa todos los campos obligatorios.', confirmButtonColor: '#2563eb' });
        return;
      }
      if (!this.form.email.includes('@')) {
        Swal.fire({ icon: 'error', title: 'Correo inválido', text: 'Ingresa un correo electrónico válido.', confirmButtonColor: '#2563eb' });
        return;
      }
      if (this.form.mensaje.length < 10) {
        Swal.fire({ icon: 'warning', title: 'Mensaje muy corto', text: 'El mensaje debe tener al menos 10 caracteres.', confirmButtonColor: '#2563eb' });
        return;
      }
      this.sent = true;
      SwalSuccess('¡Mensaje enviado!', 'Te responderemos pronto.');
    },
    resetForm() {
      this.sent = false;
      this.form = { nombre: '', apellido: '', email: '', asunto: '', mensaje: '' };
    }
  };
}
