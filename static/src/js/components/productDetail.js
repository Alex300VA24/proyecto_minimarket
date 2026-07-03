import { apiFetch } from '../services/api.js';
import { SwalAddToCart } from '../utils/swal.js';

export function productDetailApp(config = {}) {
  return {
    qty: 1,
    addToCart(productId) {
      apiFetch(config.addToCartUrl || '/carrito/agregar/', {
        method: 'POST',
        body: { product_id: productId, quantity: this.qty }
      }).then(d => {
        if (d.success) {
          SwalAddToCart();
        }
      });
    },
  };
}
