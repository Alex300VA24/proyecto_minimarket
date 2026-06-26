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
    cartItems: [],
    cartTotal: 0,
    cartCount: 0,
    orders: [],
    orderDetail: null,
    openOrderDetail: false,

    initNavbar() {
      var self = this;
      var storedItems = sessionStorage.getItem('ym_cartItems');
      if (storedItems) {
        self.cartItems = JSON.parse(storedItems);
        self.cartTotal = parseFloat(sessionStorage.getItem('ym_cartTotal') || '0');
        self.cartCount = self.cartItems.length;
        sessionStorage.removeItem('ym_cartItems');
        sessionStorage.removeItem('ym_cartTotal');
      }
      var params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'carrito') {
        self.openCart = true;
        if (self.cartItems.length === 0) {
          self.loadCart();
        }
      }
      else if (params.get('modal') === 'pedidos') {
        self.openOrders = true;
        self.loadOrders();
      }
      if (params.get('modal')) {
        var url = new URL(window.location);
        url.searchParams.delete('modal');
        window.history.replaceState({}, '', url);
      }
      self.loadCartCount();
      window.addEventListener('cart-updated', function(e) {
        if (e.detail && e.detail.count !== undefined) {
          self.cartCount = e.detail.count;
        }
      });
    },

    loadCartCount() {
      var self = this;
      fetch('/carrito/api/datos/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) { self.cartCount = d.count; }
      }).catch(function() { self.cartCount = 0; });
    },

    loadCart() {
      var self = this;
      fetch('/carrito/api/datos/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) { self.cartItems = d.items; self.cartTotal = d.total; self.cartCount = d.count; }
      }).catch(function() { self.cartItems = []; self.cartTotal = 0; self.cartCount = 0; });
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
      Swal.fire({ title: '¿Quitar del carrito?', text: 'El producto se eliminará de tu carrito.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#78716c', confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', customClass: { popup: 'swal2-border-radius' } }).then(function(result) {
        if (result.isConfirmed) {
          fetch('/carrito/eliminar/' + itemId + '/', { method: 'POST', headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' } }).then(function() {
            self.cartItems = self.cartItems.filter(function(i) { return i.id !== itemId; });
            self.cartCount = self.cartItems.length;
          });
        }
      });
    },

    goToPayment() {
      var isAuth = document.querySelector('meta[name="user-is-authenticated"]').content === 'true';
      if (isAuth) {
        window.location.href = '/pago/';
      } else {
        window.location.href = '/cuenta/ingresar/?next=' + encodeURIComponent('/pago/');
      }
    },

    emptyCart() {
      var self = this;
      Swal.fire({
        title: 'Vaciar carrito',
        text: 'Se eliminarán todos los productos del carrito.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#78716c',
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal2-border-radius' }
      }).then(function(result) {
        if (result.isConfirmed) {
          fetch('/carrito/vaciar/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' }
          }).then(function(r) { return r.json(); }).then(function(d) {
            if (d.success) {
              self.cartItems = [];
              self.cartTotal = 0;
              self.cartCount = 0;
              Swal.fire({ icon: 'success', title: 'Carrito vaciado', confirmButtonColor: '#2563eb', timer: 1500, showConfirmButton: false, customClass: { popup: 'swal2-border-radius' } });
            }
          });
        }
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
        if (d.success) {
          Swal.fire({ icon: 'success', title: 'Agregado al carrito', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
          if (d.cart_count !== undefined) {
            window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: d.cart_count } }));
          }
        }
      });
    }
  };
};

Alpine.start();
