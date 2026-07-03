import { getCsrf, apiFetch } from '../services/api.js';
import { SwalError, SwalToast } from '../utils/swal.js';
import { statusDisplay, isOrderCancellable } from '../utils/status.js';
import { API } from '../services/urls.js';

export function navbarApp() {
  return {
    openCart: false,
    openOrders: false,
    openPayment: false,
    showBoleta: false,
    showAuthModal: false,
    loginUrl: '',
    cartItems: [],
    cartTotal: 0,
    cartCount: 0,
    orders: [],
    orderDetail: null,
    openOrderDetail: false,
    paymentMethod: '',
    montoRecibido: 0,
    boletaData: null,

    initNavbar() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'carrito') {
        this.openCart = true;
        this.loadCart();
      } else if (params.get('modal') === 'pedidos') {
        this.openOrders = true;
      }
      if (params.get('modal')) {
        const url = new URL(window.location);
        url.searchParams.delete('modal');
        window.history.replaceState({}, '', url);
      }
      this.loginUrl = document.querySelector('meta[name="login-url"]')?.content || API.LOGIN;
      window.addEventListener('ym:cartUpdated', e => {
        if (e.detail && typeof e.detail.count !== 'undefined') {
          this.cartCount = e.detail.count;
        }
      });
      apiFetch(API.CART_DATA).then(d => {
        if (d.success) { this.cartCount = d.count || d.items.length; }
      }).catch(() => {});
    },

    loadCart() {
      apiFetch(API.CART_DATA).then(d => {
        if (d.success) {
          this.cartItems = d.items;
          this.cartTotal = d.total;
          this.cartCount = d.count || d.items.length;
        }
      }).catch(() => { this.cartItems = []; this.cartTotal = 0; this.cartCount = 0; });
    },

    updateCartItem(itemId, qty) {
      apiFetch(API.CART_UPDATE(itemId), {
        method: 'POST',
        body: { quantity: qty }
      }).then(d => {
        if (d.success) {
          if (qty <= 0) {
            this.cartItems = this.cartItems.filter(i => i.id !== itemId);
          } else {
            const item = this.cartItems.find(i => i.id === itemId);
            if (item) {
              item.quantity = qty;
              item.subtotal = parseFloat(d.subtotal);
            }
          }
          this.cartTotal = parseFloat(d.cart_total);
          this.cartCount = d.cart_count;
        }
      });
    },

    removeCartItem(itemId) {
      Swal.fire({
        title: '¿Quitar producto?',
        text: '¿Estás seguro de quitar este producto del carrito?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#78716c',
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'No, mantener',
        customClass: { popup: 'swal2-border-radius' }
      }).then(result => {
        if (result.isConfirmed) {
          apiFetch(API.CART_REMOVE(itemId), { method: 'POST', body: {} }).then(d => {
            this.cartItems = this.cartItems.filter(i => i.id !== itemId);
            if (d.success) {
              this.cartTotal = parseFloat(d.cart_total);
              this.cartCount = d.cart_count;
            }
          });
        }
      });
    },

    emptyCart() {
      Swal.fire({
        title: '¿Vaciar carrito?',
        text: 'Se quitaran todos los productos del carrito.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#78716c',
        confirmButtonText: 'Sí, quitar todo',
        cancelButtonText: 'No, mantener',
        customClass: { popup: 'swal2-border-radius' }
      }).then(result => {
        if (result.isConfirmed) {
          apiFetch(API.CART_CLEAR, { method: 'POST', body: {} }).then(d => {
            if (d.success) {
              this.cartItems = [];
              this.cartTotal = 0;
              this.cartCount = 0;
            }
          });
        }
      });
    },

    goToPayment() {
      const isLoggedIn = document.querySelector('meta[name="user-is-authenticated"]');
      if (!isLoggedIn || isLoggedIn.content !== 'true') {
        this.showAuthModal = true;
        return;
      }
      window.location.href = API.PAGO;
    },

    openPaymentModal() {
      this.goToPayment();
    },

    processPayment() {
      if (!this.paymentMethod) { SwalToast('warning', 'Selecciona un método de pago'); return; }
      if (this.paymentMethod === 'cash' && this.montoRecibido < this.cartTotal) { SwalToast('warning', 'Monto insuficiente'); return; }

      apiFetch(API.CHECKOUT, {
        method: 'POST',
        body: { payment_method: this.paymentMethod }
      }).then(d => {
        if (d.success) {
          this.openPayment = false;
          this.openCart = false;
          this.boletaData = d.order;
          this.showBoleta = true;
          this.cartItems = [];
          this.cartTotal = 0;
          this.cartCount = 0;
        } else {
          SwalError('Error', d.error || 'No se pudo procesar el pago.');
        }
      }).catch(() => { SwalError('Error de conexión', 'Intenta de nuevo.'); });
    },

    loadOrders() {
      apiFetch(API.ORDER_DATA).then(d => {
        if (d.success) { this.orders = d.orders; }
      }).catch(() => { this.orders = []; });
    },

    viewOrderDetail(orderId) {
      apiFetch(API.ORDER_DETAIL(orderId)).then(d => {
        if (d.success) { this.orderDetail = d.order; this.openOrderDetail = true; }
      });
    },

    cancelOrder(orderId) {
      Swal.fire({
        title: '¿Cancelar este pedido?',
        text: 'Esta accion no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#78716c',
        confirmButtonText: 'Si, cancelar',
        cancelButtonText: 'No, volver',
        customClass: { popup: 'swal2-border-radius' }
      }).then(result => {
        if (result.isConfirmed) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = API.ORDER_CANCEL(orderId);
          const csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrfmiddlewaretoken';
          csrfInput.value = getCsrf();
          form.appendChild(csrfInput);
          document.body.appendChild(form);
          this.orders = this.orders.map(o => o.id === orderId ? { ...o, status: 'cancelled', status_display: statusDisplay('cancelled') } : o);
          if (this.orderDetail && this.orderDetail.id === orderId) {
            this.orderDetail.status = 'cancelled';
            this.orderDetail.status_display = statusDisplay('cancelled');
          }
          Swal.fire({ icon: 'success', title: 'Pedido cancelado', confirmButtonColor: '#2563eb', timer: 1500, showConfirmButton: false, customClass: { popup: 'swal2-border-radius' } }).then(() => { form.submit(); });
        }
      });
    },
  };
}
