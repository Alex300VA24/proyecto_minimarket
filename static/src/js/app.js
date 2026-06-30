import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';
import Swal from 'sweetalert2';

Alpine.plugin(collapse);

window.Alpine = Alpine;
window.Swal = Swal;

window.SwalConfirm = (title, text, onConfirm) => {
  Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#78716c',
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    customClass: { popup: 'swal2-border-radius' }
  }).then(result => { if (result.isConfirmed) onConfirm(); });
};

function getCsrf() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

window.navbarApp = function() {
  return {
    openCart: false,
    openOrders: false,
    openPayment: false,
    showBoleta: false,
    cartItems: [],
    cartTotal: 0,
    orders: [],
    orderDetail: null,
    openOrderDetail: false,
    paymentMethod: '',
    montoRecibido: 0,
    boletaData: null,

    initNavbar() {
      var params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'carrito') this.openCart = true;
      else if (params.get('modal') === 'pedidos') this.openOrders = true;
      // profile modal no longer used; dropdown replaces it
      if (params.get('modal')) {
        var url = new URL(window.location);
        url.searchParams.delete('modal');
        window.history.replaceState({}, '', url);
      }
    },

    loadCart() {
      var self = this;
      fetch('/carrito/api/datos/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) { self.cartItems = d.items; self.cartTotal = d.total; }
      }).catch(function() { self.cartItems = []; self.cartTotal = 0; });
    },

    updateCartItem(itemId, qty) {
      var self = this;
      fetch('/carrito/actualizar/' + itemId + '/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) {
          var item = self.cartItems.find(function(i) { return i.id === itemId; });
          if (item) item.quantity = qty;
        }
      });
    },

    removeCartItem(itemId) {
      var self = this;
      Swal.fire({ title: '¿Eliminar producto?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#78716c', confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', customClass: { popup: 'swal2-border-radius' } }).then(function(result) {
        if (result.isConfirmed) {
          fetch('/carrito/eliminar/' + itemId + '/', { method: 'POST', headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' } }).then(function() {
            self.cartItems = self.cartItems.filter(function(i) { return i.id !== itemId; });
          });
        }
      });
    },

    openPaymentModal() {
      var isLoggedIn = document.querySelector('meta[name="user-is-authenticated"]');
      if (!isLoggedIn || isLoggedIn.content !== 'true') {
        Swal.fire({
          icon: 'info',
          title: 'Debes iniciar sesión',
          text: 'Necesitas una cuenta para finalizar tu compra.',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Iniciar sesión',
          customClass: { popup: 'swal2-border-radius' }
        }).then(function() {
          window.location.href = '/login';
        });
        return;
      }
      this.paymentMethod = '';
      this.montoRecibido = 0;
      this.openPayment = true;
    },

    processPayment() {
      if (!this.paymentMethod) { Swal.fire({ icon: 'warning', title: 'Selecciona un método de pago', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }); return; }
      if (this.paymentMethod === 'cash' && this.montoRecibido < this.cartTotal) { Swal.fire({ icon: 'warning', title: 'Monto insuficiente', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }); return; }

      var self = this;
      fetch('/finalizar/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: this.paymentMethod })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) {
          self.openPayment = false;
          self.openCart = false;
          self.boletaData = d.order;
          self.showBoleta = true;
          self.cartItems = [];
          self.cartTotal = 0;
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: d.error || 'No se pudo procesar el pago.', confirmButtonColor: '#ef4444', customClass: { popup: 'swal2-border-radius' } });
        }
      }).catch(function() {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Intenta de nuevo.', confirmButtonColor: '#ef4444', customClass: { popup: 'swal2-border-radius' } });
      });
    },

    loadOrders() {
      var self = this;
      fetch('/pedidos/api/datos/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) { self.orders = d.orders; }
      }).catch(function() { self.orders = []; });
    },

    viewOrderDetail(orderId) {
      var self = this;
      fetch('/pedidos/' + orderId + '/api/datos/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) { self.orderDetail = d.order; self.openOrderDetail = true; }
      });
    },

    cancelOrder(orderId) {
      var self = this;
      Swal.fire({ title: '¿Cancelar este pedido?', text: 'Esta accion no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#78716c', confirmButtonText: 'Si, cancelar', cancelButtonText: 'No, volver', customClass: { popup: 'swal2-border-radius' } }).then(function(result) {
        if (result.isConfirmed) {
          var form = document.createElement('form');
          form.method = 'POST';
          form.action = '/pedidos/' + orderId + '/cancelar/';
          var csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrfmiddlewaretoken';
          csrfInput.value = getCsrf();
          form.appendChild(csrfInput);
          document.body.appendChild(form);
          self.orders = self.orders.map(function(o) { return o.id === orderId ? Object.assign({}, o, { status: 'cancelled', status_display: 'Cancelado' }) : o; });
          if (self.orderDetail && self.orderDetail.id === orderId) { self.orderDetail.status = 'cancelled'; self.orderDetail.status_display = 'Cancelado'; }
          Swal.fire({ icon: 'success', title: 'Pedido cancelado', confirmButtonColor: '#2563eb', timer: 1500, showConfirmButton: false, customClass: { popup: 'swal2-border-radius' } }).then(function() { form.submit(); });
        }
      });
    },

  };
};

window.catalogApp = function () {
  return {
    products: [],
    search: '',
    category: '',
    categoryName: '',
    categories: [],
    loading: true,

    initCatalog() {
      var params = new URLSearchParams(window.location.search);
      var cat = params.get('category');
      if (cat) this.category = cat;
      this.loadProducts();
    },

    loadProducts() {
      var self = this;
      self.loading = true;
      if (self.category) {
        var matched = self.categories.find(function (c) { return c.slug === self.category; });
        self.categoryName = matched ? matched.name : '';
      } else {
        self.categoryName = '';
      }
      var url = '/catalogo/api/datos/';
      var params = [];
      if (this.search) params.push('q=' + encodeURIComponent(this.search));
      if (this.category) params.push('category=' + encodeURIComponent(this.category));
      if (params.length) url += '?' + params.join('&');
      fetch(url).then(function (r) { return r.json(); }).then(function (d) {
        if (d.success) { self.products = d.products; self.categories = d.categories; }
        if (self.category) {
          var matched = self.categories.find(function (c) { return c.slug === self.category; });
          self.categoryName = matched ? matched.name : '';
        }
        self.loading = false;
      });
    },

    addToCart(productId) {
      fetch('/carrito/agregar/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.success) { Swal.fire({ icon: 'success', title: 'Agregado al carrito', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }
      });
    }
  };
};

Alpine.start();
