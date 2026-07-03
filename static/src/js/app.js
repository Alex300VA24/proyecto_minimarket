import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';
import Swal from 'sweetalert2';
import { initCsrf } from './services/api.js';
import { orderBadgeClass, adminOrderBadgeClass, adminVentaBadgeClass, isOrderCancellable, statusDisplay } from './utils/status.js';
import { navbarApp } from './components/navbar.js';
import { catalogApp } from './components/catalog.js';
import { contactApp } from './components/contact.js';
import { productDetailApp } from './components/productDetail.js';
import { pagoApp } from './components/pago.js';
import { paymentOrderApp } from './components/paymentOrder.js';
import { adminApp } from './components/admin.js';
import { confirmCancel } from './components/myOrders.js';
import { saveProfile, changePassword } from './components/profile.js';

Alpine.plugin(collapse);

initCsrf();

window.Alpine = Alpine;
window.Swal = Swal;
window.navbarApp = navbarApp;
window.catalogApp = catalogApp;
window.contactApp = contactApp;
window.productDetailApp = productDetailApp;
window.pagoApp = pagoApp;
window.paymentOrderApp = paymentOrderApp;
window.adminApp = adminApp;
window.confirmCancel = confirmCancel;
window.saveProfile = saveProfile;
window.changePassword = changePassword;
window.orderBadgeClass = orderBadgeClass;
window.adminOrderBadgeClass = adminOrderBadgeClass;
window.adminVentaBadgeClass = adminVentaBadgeClass;
window.isOrderCancellable = isOrderCancellable;
window.statusDisplay = statusDisplay;

Alpine.start();
