import { apiFetch } from '../services/api.js';
import { SwalToast } from '../utils/swal.js';
import { API } from '../services/urls.js';

export function catalogApp() {
  return {
    products: [],
    search: '',
    category: '',
    categoryName: '',
    categories: [],
    loading: true,

    initCatalog() {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat) this.category = cat;
      this.loadProducts();
    },

    loadProducts() {
      this.loading = true;
      if (this.category) {
        const matched = this.categories.find(c => c.slug === this.category);
        this.categoryName = matched ? matched.name : '';
      } else {
        this.categoryName = '';
      }
      let url = API.CATALOG_DATA;
      const params = [];
      if (this.search) params.push('q=' + encodeURIComponent(this.search));
      if (this.category) params.push('category=' + encodeURIComponent(this.category));
      if (params.length) url += '?' + params.join('&');
      apiFetch(url).then(d => {
        if (d.success) { this.products = d.products; this.categories = d.categories; }
        if (this.category) {
          const matched = this.categories.find(c => c.slug === this.category);
          this.categoryName = matched ? matched.name : '';
        }
        this.loading = false;
      });
    },

    addToCart(productId) {
      apiFetch(API.CART_ADD, {
        method: 'POST',
        body: { product_id: productId, quantity: 1 }
      }).then(d => {
        if (d.success) {
          SwalToast('success', '¡Producto agregado al carrito!');
          window.dispatchEvent(new CustomEvent('ym:cartUpdated', { detail: { count: d.cart_count, showCart: true } }));
        }
      });
    }
  };
}
