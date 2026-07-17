import Alpine from 'alpinejs';
import { apiFetch } from '../services/api.js';
import { SwalError } from '../utils/swal.js';
import { usePolling } from '../composables/usePolling.js';
import { API } from '../services/urls.js';
import { a11yNotify } from '../utils/notify.js';

export function pagoApp(config = {}) {
  return {
    loading: true,
    cartItems: config.cartItems || [],
    cartTotal: config.cartTotal || 0,
    paymentMethod: '',
    paymentMethodDisplay: '',
    transferBank: '',
    yapeType: '',
    orderCreated: false,
    orderId: null,
    orderNumber: '',
    orderBoletaCode: '',
    simulationUrl: '',
    simulationQrB64: '',
    generatedYapeCode: '',
    yapeCodeInput: '',
    codeError: false,
    polling: null,

    init() {
      setTimeout(() => { this.loading = false; }, 800);
    },

    goBackToCart() {
      window.location.href = API.CARRITO_MODAL;
    },

    selectPayment(method) {
      this.paymentMethod = method;
      this.yapeType = '';
      const labels = {
        yape: 'Yape',
        plin: 'Plin',
        transferencia_bcp: 'Transferencia BCP',
        transferencia_interbank: 'Transferencia Interbank'
      };
      this.paymentMethodDisplay = labels[method] || method;
      if (method === 'transferencia_bcp') this.transferBank = 'bcp';
      if (method === 'transferencia_interbank') this.transferBank = 'interbank';
    },

    createOrder() {
      apiFetch(API.ORDER_CREATE, {
        method: 'POST',
        body: {
          payment_method: this.paymentMethod,
          transfer_bank: this.paymentMethod === 'transferencia_bcp' ? 'bcp' : this.paymentMethod === 'transferencia_interbank' ? 'interbank' : '',
          yape_type: this.paymentMethod === 'yape' ? this.yapeType : ''
        }
      }).then(result => {
        if (result.success) {
          this.orderCreated = true;
          this.orderId = result.order_id;
          this.orderNumber = result.order_number || String(result.order_id).padStart(6, '0');
          this.orderBoletaCode = result.boleta_code;
          this.simulationUrl = result.simulation_url;
          this.simulationQrB64 = result.simulation_qr_b64 || '';
          this.generatedYapeCode = result.generated_yape_code || '';
          a11yNotify('success', 'Pedido creado', 'N° ' + this.orderNumber);
          if (this.paymentMethod !== 'yape' || this.yapeType !== 'code') {
            this.startPolling();
          }
        } else {
          if (!a11yNotify('error', 'Error', result.error || 'Error al crear pedido')) SwalError('Error', result.error || 'Error al crear pedido');
        }
      }).catch(() => { if (!a11yNotify('error', 'Error', 'Error al crear pedido')) SwalError('Error', 'Error al crear pedido'); });
    },

    startPolling() {
      this.polling = usePolling(() => {
        apiFetch(API.PAYMENT_CHECK(this.orderId)).then(data => {
          if (data.is_paid) {
            this.polling.stop();
            setTimeout(() => {
              window.location.href = API.BOLETA(data.boleta_code) + '?toast_type=success&toast_title=Pago+confirmado&toast_desc=Pedido+pagado+correctamente';
            }, 1500);
          }
        });
      });
      this.polling.start();
    },

    validateYapeCode() {
      this.codeError = false;
      apiFetch(API.PAYMENT_YAPE_CODE(this.orderId, this.yapeCodeInput)).then(data => {
        if (data.success) {
          if (this.polling) this.polling.stop();
          setTimeout(() => {
            window.location.href = API.BOLETA(data.boleta_code) + '?toast_type=success&toast_title=Pago+confirmado&toast_desc=Pedido+pagado+correctamente';
          }, 1500);
        } else {
          this.codeError = true;
          a11yNotify('error', 'Código incorrecto', 'El código Yape ingresado no es válido');
        }
      });
    },

    cancelAndGoBack() {
      if (this.polling) this.polling.stop();
      apiFetch(API.ORDER_CANCEL_UNPAID(this.orderId), { method: 'POST', body: {} })
        .then(() => { window.location.href = API.PAGO; })
        .catch(() => { window.location.href = API.PAGO; });
    }
  };
}
