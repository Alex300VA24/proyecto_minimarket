import { apiFetch } from '../services/api.js';
import Swal from 'sweetalert2';
import { SwalError, SwalSuccess, SwalToast, SwalAddToCart } from '../utils/swal.js';
import { usePolling } from '../composables/usePolling.js';
import { API } from '../services/urls.js';

export function adminApp(config = {}) {
  return {
    sidebarOpen: true,
    adminSection: localStorage.getItem('ym_section') || config.defaultSection || 'dashboard',
    openSubmenu: localStorage.getItem('ym_submenu') || config.defaultSubmenu || null,
    ventaTab: 'manual',
    usuarioTab: 'todos',
    ayudaTab: 'docs',
    loading: false,
    loadingCrearUsuario: false,

    busquedaInventario: '',
    filtroCategoria: '',
    busquedaPedido: '',
    filtroEstadoPedido: '',
    busquedaVentaProducto: '',
    metodoPago: 'Efectivo',
    montoRecibido: 0,
    carrito: [],
    pagoStep: 1,
    pagoQRB64: '',
    pagoSimulationUrl: '',
    pagoOrderId: null,
    pagoBoletaCode: '',
    pagoPolling: null,
    filtroFechaVenta: '',
    filtroCanalVenta: '',
    filtroTrabajadorVenta: '',
    busquedaVentaId: '',
    busquedaGasto: '',
    filtroFechaGasto: '',
    filtroTipoGasto: '',
    busquedaUsuario: '',
    filtroRolUsuario: '',
    PER_PAGE: 10,
    trabajadores: [],
    invPage: 1,
    ventasPage: 1,
    gastosPage: 1,
    usuariosPage: 1,

    showLoadingOverlay: false,
    showModalVerProducto: false,
    showModalRegistrarLote: false,
    showModalAgregarProducto: false,
    showModalConfirmarEliminarProducto: false,
    showModalVerPedido: false,
    showModalPrepararPedido: false,
    showModalQRScanner: false,
    pedidoPreparar: { id: null, cliente: '', fecha: '', metodo_pago: '', direccion: '', estado: '', items: [], total: 0, notes: '', estado_key: '' },
    pedidoQR: { id: null, estado_key: '', estado: '', cliente: '', items: [], total: 0 },
    loadingListo: false,
    loadingQR: false,
    qrCodigoManual: '',
    loadingQRManual: false,
    codigoManualUsado: false,
    showModalVerVenta: false,
    showModalVerBoleta: false,
    boletaData: null,
    showModalEditarVenta: false,
    showModalAgregarGasto: false,
    showModalVerGasto: false,
    showModalConfirmarEliminarGasto: false,
    showModalCrearTrabajador: false,
    showModalVerUsuario: false,
    showModalEditarUsuario: false,
    showModalConfirmarDesactivar: false,
    showModalGuia: false,
    showModalPago: false,
    showModalBoleta: false,
    showModalExportar: false,
    showModalNotificaciones: false,
    showModalCancelarPedido: false,
    showModalCancelarVenta: false,
    showModalResetPassword: false,
    exportarFormato: '',
    exportarTitulo: '',
    exportarRangoFecha: { inicio: '', fin: '' },
    reportesSubView: 'ventas',
    topProdPage: 1,
    stockPage: 1,
    stockBajoPage: 1,

    productoVer: null,
    productoEliminar: null,
    pedidoVer: null,
    ventaVer: null,
    ventaEditar: { id: null, cliente: '', total: 0, metodo: '', canal: '', estado: '', justificacion: '', fecha: '', items: [], boleta_code: '' },
    gastoVer: null,
    gastoEliminar: null,
    usuarioVer: null,
    usuarioEditar: { id: null, nombre: '', apellido: '', email: '', telefono: '', rol: 'employee', username: '' },
    usuarioDesactivar: null,
    boletaVenta: null,
    pedidoCancelar: null,
    ventaCancelar: null,
    justificacionCancelarPedido: '',
    justificacionCancelarVenta: '',

    formProducto: { id: null, nombre: '', categoria: '', precio: 0, umbral: 10, descripcion: '', color: '#d97706', icono: 'fa-solid fa-box', imagen: null, imagenFile: null, imagenPreview: null },
    formGasto: { id: null, concepto: '', tipo: 'Variable', monto: 0, fecha: '', descripcion: '', comprobanteFile: null, comprobantePreview: null },
    formLote: { productoId: null, productoNombre: '', productoCodigo: '', productoColor: '', productoIcono: '', productoImagen: null, numeroLote: '', proveedor: '', precio: 0, cantidad: 0, fechaVencimiento: '' },
    formNuevoUsuario: { nombre: '', apellido: '', email: '', telefono: '', rol: 'employee', username: '' },
    guiaTitulo: '',
    guiaPasos: [],

    currentUser: {
      nombre: config.username || '',
      email: config.email || '',
      rol: config.role || ''
    },

    weekOffset: 0,
    dashboardData: { ventasSemana: 0, gastosMes: 0, stockBajo: 0, pedidosPendientes: 0, utilidadNeta: 0 },
    chartData: [],
    topProductos: [],
    productos: [],
    pedidos: [],
    ventas: [],
    gastos: [],
    usuarios: [],
    categorias: [],

    get initial() { return this.currentUser.nombre.charAt(0).toUpperCase(); },
    get isEmpleado() { return this.currentUser.rol === 'employee' || this.currentUser.rol === 'empleado'; },
    get isAdmin() { return this.currentUser.rol === 'admin'; },

    get filteredSidebarItems() {
      if (this.isAdmin) return this.sidebarItems;
      const allowed = ['inventario', 'ventas', 'ayuda'];
      return this.sidebarItems.filter(item => allowed.includes(item.id));
    },

    navigateTo(section) {
      if (this.isEmpleado) {
        const allowed = ['inventario', 'nueva-venta', 'lista-ventas', 'ayuda'];
        if (!allowed.includes(section)) return;
      }
      this.adminSection = section;
      localStorage.setItem('ym_section', section);
    },

    sidebarItems: [
      { id: 'dashboard', label: 'Inicio', icon: 'fa-solid fa-store' },
      { id: 'inventario', label: 'Inventario', icon: 'fa-solid fa-boxes-stacked' },
      { id: 'ventas', label: 'Ventas', icon: 'fa-solid fa-cash-register', children: [
        { id: 'nueva-venta', label: 'Nueva Venta', icon: 'fa-solid fa-plus' },
        { id: 'lista-ventas', label: 'Lista de Ventas', icon: 'fa-solid fa-list' }
      ]},
      { id: 'gastos', label: 'Gastos', icon: 'fa-solid fa-receipt' },
      { id: 'usuarios', label: 'Usuarios', icon: 'fa-solid fa-users-gear' },
      { id: 'ayuda', label: 'Ayuda', icon: 'fa-solid fa-circle-question' }
    ],

    get maxChartVenta() { return Math.max(...this.chartData.map(d => d.ventas), 1); },

    get filteredInventario() {
      const result = this.productos.filter(p => {
        const matchSearch = !this.busquedaInventario || p.nombre.toLowerCase().includes(this.busquedaInventario.toLowerCase()) || p.codigo.toLowerCase().includes(this.busquedaInventario.toLowerCase());
        const matchCat = !this.filtroCategoria || p.categoria === this.filtroCategoria;
        return matchSearch && matchCat;
      });
      if (this.invPage > Math.ceil(result.length / this.PER_PAGE)) this.invPage = 1;
      return result;
    },

    get filteredPedidos() { return this.pedidos; },

    get filteredPedidosOnline() {
      let result = this.pedidos;
      if (this.busquedaPedido) {
        const q = this.busquedaPedido.toLowerCase();
        result = result.filter(p => p.cliente.toLowerCase().includes(q) || String(p.id).includes(q) || (p.boleta_code && p.boleta_code.toLowerCase().includes(q)));
      }
      if (this.filtroEstadoPedido) {
        result = result.filter(p => p.estado_key === this.filtroEstadoPedido);
      }
      return result;
    },

    get filteredVentaProductos() {
      if (!this.busquedaVentaProducto) return this.productos.filter(p => this.productoStock(p) > 0);
      return this.productos.filter(p => this.productoStock(p) > 0 && (p.nombre.toLowerCase().includes(this.busquedaVentaProducto.toLowerCase()) || p.codigo.toLowerCase().includes(this.busquedaVentaProducto.toLowerCase())));
    },

    get _ventaBruta() { return this.carrito.reduce((s, item) => s + item.precio * item.cantidad, 0); },
    get ventaSubtotal() { return this._ventaBruta / 1.18; },
    get ventaIGV() { return this._ventaBruta * 0.18 / 1.18; },
    get ventaTotal() { return this._ventaBruta; },

    get filteredUsuarios() {
      const result = this.usuarios.filter(u => {
        const matchSearch = !this.busquedaUsuario || u.nombre.toLowerCase().includes(this.busquedaUsuario.toLowerCase()) || u.email.toLowerCase().includes(this.busquedaUsuario.toLowerCase());
        const matchRol = !this.filtroRolUsuario || u.rol === this.filtroRolUsuario;
        const matchTab = this.usuarioTab === 'todos' || (this.usuarioTab === 'trabajadores' && (u.rol === 'employee' || u.rol === 'admin')) || (this.usuarioTab === 'clientes' && u.rol === 'client');
        return matchSearch && matchRol && matchTab;
      });
      if (this.usuariosPage > Math.ceil(result.length / this.PER_PAGE)) this.usuariosPage = 1;
      return result;
    },

    faqs: [
      { pregunta: 'Como agrego un producto al inventario?', respuesta: 'Ve a Inventario y haz clic en "Agregar Producto". Completa nombre, categoria, precio y umbral de stock. El codigo se genera automaticamente. Luego registra lotes con el boton (+) del producto.', abierto: false },
      { pregunta: 'Como gestiono los pedidos online?', respuesta: 'En Pedidos Online veras los pedidos pendientes. Prepara el pedido, marcalo como "Listo para entrega" y usa el escaner QR o codigo de boleta para confirmar la entrega.', abierto: false },
      { pregunta: 'Que hago cuando un producto tiene stock bajo?', respuesta: 'El sistema marca en rojo los productos por debajo del umbral. Registra un lote nuevo desde el boton (+) del producto en Inventario para reponer stock.', abierto: false },
      { pregunta: 'Como registro un gasto?', respuesta: 'Ve a Gastos y haz clic en "Registrar Gasto". Selecciona el tipo (Fijo, Variable, Operativo, Mantenimiento), ingresa monto, fecha y descripcion. Puedes adjuntar comprobante (imagen o PDF).', abierto: false },
      { pregunta: 'Como creo un usuario empleado?', respuesta: 'En Usuarios, haz clic en "Registrar Usuario". Completa nombre, email y rol. La contrasena inicial es "cambiar123" y el usuario debera cambiarla en su primer ingreso.', abierto: false }
    ],

    paginatedItems(items, page) {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / this.PER_PAGE));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * this.PER_PAGE;
      return { items: items.slice(start, start + this.PER_PAGE), totalPages, currentPage, total };
    },

    getPageRange(currentPage, totalPages) {
      const pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
          pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    },

    _notify(title, icon) {
      return SwalToast(icon || 'success', title);
    },

    loadDashboard(offset) { if (offset !== undefined) this.weekOffset = offset; apiFetch(API.DASHBOARD_STATS + '?offset=' + this.weekOffset).then(d => { if (d.ventasSemana !== undefined) { this.dashboardData = d; this.chartData = d.chartData || []; this.topProductos = d.topProductos || []; } }); },
    navegarSemana(dir) { this.loadDashboard(this.weekOffset + dir); },
    loadProductos() {
      const params = new URLSearchParams();
      if (this.busquedaInventario) params.set('q', this.busquedaInventario);
      if (this.filtroCategoria) params.set('categoria', this.filtroCategoria);
      apiFetch(API.DASHBOARD_PRODUCTOS + '?' + params.toString()).then(d => { if (d.productos) this.productos = d.productos; });
    },
    loadPedidos() { apiFetch(API.DASHBOARD_PEDIDOS).then(d => { if (d.pedidos) this.pedidos = d.pedidos; }); },
    loadVentas() { apiFetch(API.DASHBOARD_VENTAS).then(d => { if (d.ventas) this.ventas = d.ventas; if (d.trabajadores) this.trabajadores = d.trabajadores; }); },
    loadGastos() { apiFetch(API.DASHBOARD_GASTOS).then(d => { if (d.gastos) this.gastos = d.gastos; }); },
    loadUsuarios() { apiFetch(API.DASHBOARD_USUARIOS).then(d => { if (d.usuarios) this.usuarios = d.usuarios; }); },
    loadCategorias() { apiFetch(API.DASHBOARD_CATEGORIAS).then(d => { if (d.categorias) this.categorias = d.categorias; }); },

    init() {
      this.loadDashboard();
      this.loadProductos();
      this.loadPedidos();
      this.loadVentas();
      this.loadGastos();
      this.loadUsuarios();
      this.loadCategorias();
      this.$watch('busquedaVentaId', () => { this.ventasPage = 1; });
      this.$watch('filtroFechaVenta', () => { this.ventasPage = 1; });
      this.$watch('filtroCanalVenta', () => { this.ventasPage = 1; });
      this.$watch('filtroTrabajadorVenta', () => { this.ventasPage = 1; });
      this.$watch('busquedaGasto', () => { this.gastosPage = 1; });
      this.$watch('filtroFechaGasto', () => { this.gastosPage = 1; });
      this.$watch('filtroTipoGasto', () => { this.gastosPage = 1; });
      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.querySelector('[x-model="busquedaInventario"]');
          if (searchInput) {
            this.adminSection = 'inventario';
            this.$nextTick(() => searchInput.focus());
          }
        }
        if (e.altKey) {
          const navMap = { '1': 'dashboard', '2': 'inventario', '3': 'nueva-venta', '4': 'gastos', '5': 'usuarios', '6': 'ayuda' };
          if (navMap[e.key]) {
            e.preventDefault();
            this.navigateTo(navMap[e.key]);
          }
        }
      });
    },

    getPageTitle() {
      const titles = { 'dashboard': 'Inicio', 'inventario': 'Inventario', 'nueva-venta': 'Nueva Venta', 'lista-ventas': 'Lista de Ventas', 'gastos': 'Gastos', 'usuarios': 'Usuarios', 'ayuda': 'Centro de Ayuda' };
      return titles[this.adminSection] || 'Inicio';
    },

    getPageIcon() {
      const icons = { 'dashboard': 'fa-solid fa-store', 'inventario': 'fa-solid fa-boxes-stacked', 'nueva-venta': 'fa-solid fa-truck-fast', 'lista-ventas': 'fa-solid fa-list', 'gastos': 'fa-solid fa-receipt', 'usuarios': 'fa-solid fa-users-gear', 'ayuda': 'fa-solid fa-circle-question' };
      return icons[this.adminSection] || 'fa-solid fa-store';
    },

    isActive(id) { return this.adminSection === id; },

    toggleSubmenu(id) {
      this.openSubmenu = this.openSubmenu === id ? null : id;
      if (this.openSubmenu) localStorage.setItem('ym_submenu', this.openSubmenu);
      else localStorage.removeItem('ym_submenu');
    },

    productoPrecio(prod) { return prod?.precio || 0; },
    productoCosto(prod) { return prod?.lotes && prod.lotes.length > 0 ? prod.lotes[prod.lotes.length - 1].precio : 0; },
    productoStock(prod) { return prod?.lotes ? prod.lotes.reduce((s, l) => s + l.cantidad, 0) : 0; },

    verProducto(prod) { this.productoVer = prod; this.showModalVerProducto = true; },
    editarProducto(prod) { this.formProducto = { ...prod, imagenFile: null, imagenPreview: null }; this.showModalAgregarProducto = true; },
    confirmarEliminarProducto(prod) { this.productoEliminar = prod; this.showModalConfirmarEliminarProducto = true; },
    eliminarProducto() {
      apiFetch(API.DASHBOARD_PRODUCTO(this.productoEliminar.id), { method: 'DELETE' }).then(() => {
        this.productos = this.productos.filter(p => p.id !== this.productoEliminar.id);
        this.showModalConfirmarEliminarProducto = false;
        this._notify('Producto eliminado');
      });
    },
    guardarProducto() {
      const formData = new FormData();
      formData.append('nombre', this.formProducto.nombre || '');
      formData.append('categoria', this.formProducto.categoria || 'Alimentos');
      formData.append('precio', this.formProducto.precio || 0);
      formData.append('umbral', this.formProducto.umbral || 10);
      formData.append('descripcion', this.formProducto.descripcion || '');
      formData.append('color', this.formProducto.color || '#d97706');
      if (this.formProducto.imagenFile) formData.append('imagen', this.formProducto.imagenFile);
      const url = this.formProducto.id ? API.DASHBOARD_PRODUCTO(this.formProducto.id) : API.DASHBOARD_PRODUCTOS;
      fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content || '' },
        body: formData
      }).then(r => r.json()).then(d => {
        if (d && d.success === false) throw new Error(d.error || 'No se pudo guardar el producto');
        this.loadProductos();
        this.showModalAgregarProducto = false;
        SwalSuccess(this.formProducto.id ? 'Producto actualizado' : 'Producto registrado');
      }).catch(error => { SwalError('Error', error.message || 'No se pudo guardar el producto'); });
    },
    resetFormProducto() { this.formProducto = { id: null, nombre: '', categoria: 'Alimentos', precio: 0, umbral: 10, descripcion: '', color: '#d97706', icono: 'fa-solid fa-box', imagen: null, imagenFile: null, imagenPreview: null }; },
    handleProductoImagen(event) {
      const file = event.target.files[0];
      if (file) {
        this.formProducto.imagenFile = file;
        const reader = new FileReader();
        reader.onload = e => { this.formProducto.imagenPreview = e.target.result; };
        reader.readAsDataURL(file);
      }
    },

    verPedido(pedido) { this.pedidoVer = pedido; this.showModalVerPedido = true; },

    verPedidoOnline(pedido) {
      this.loadingListo = false;
      this.loadingQR = false;
      apiFetch(API.DASHBOARD_PEDIDO_DETALLE(pedido.id)).then(d => {
        if (d.success && d.order) {
          this.pedidoPreparar = d.order;
          this.showModalPrepararPedido = true;
        }
      });
    },

    marcarListoEntrega(pedido) {
      this.showLoadingOverlay = true;
      apiFetch(API.DASHBOARD_PEDIDO_LISTO(pedido.id), { method: 'POST' }).then(d => {
        this.showLoadingOverlay = false;
        if (d.success) {
          this.showModalPrepararPedido = false;
          this.loadPedidos();
          SwalSuccess('Pedido listo', 'Se ha notificado al cliente por correo.');
        } else {
          SwalError('Error', d.error || 'No se pudo actualizar el pedido');
        }
      }).catch(() => {
        this.showLoadingOverlay = false;
        SwalError('Error de conexión', 'Intenta de nuevo.');
      });
    },

    marcarListoDirecto(pedido) {
      this.showLoadingOverlay = true;
      apiFetch(API.DASHBOARD_PEDIDO_LISTO(pedido.id), { method: 'POST' }).then(d => {
        this.showLoadingOverlay = false;
        if (d.success) {
          this.loadPedidos();
          SwalSuccess('Pedido listo', 'El pedido está listo para entrega.');
        } else {
          SwalError('Error', d.error || 'No se pudo actualizar el pedido');
        }
      }).catch(() => {
        this.showLoadingOverlay = false;
        SwalError('Error de conexión', 'Intenta de nuevo.');
      });
    },

    abrirQRScanner(pedido) {
      this.pedidoQR = null;
      this.qrCodigoManual = '';
      this.loadingQRManual = false;
      this.codigoManualUsado = false;
      apiFetch(API.DASHBOARD_PEDIDO_DETALLE(pedido.id)).then(d => {
        if (d.success && d.order) {
          this.pedidoQR = d.order;
          this.showModalQRScanner = true;
          if (d.order.estado_key === 'ready') {
            this.startQRPolling(pedido.id);
          }
        }
      });
    },

    completarPedidoQR(pedido) {
      this.loadingQR = true;
      apiFetch(API.DASHBOARD_PEDIDO_COMPLETAR_QR(pedido.id), { method: 'POST' }).then(d => {
        this.loadingQR = false;
        if (d.success) {
          this.showModalQRScanner = false;
          this.stopQRPolling();
          this.loadPedidos();
          Swal.fire({
            icon: 'success',
            title: 'Código escaneado correctamente',
            text: 'El código QR fue escaneado con éxito y el pedido ha sido completado.',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'swal2-border-radius' }
          });
        } else {
          SwalError('Error', d.error || 'No se pudo completar el pedido');
        }
      }).catch(() => {
        this.loadingQR = false;
        SwalError('Error de conexión', 'Intenta de nuevo.');
      });
    },

    validarCodigoManual() {
      if (!this.qrCodigoManual || !this.qrCodigoManual.trim()) {
        SwalError('Código requerido', 'Ingresa el código de boleta del cliente.');
        return;
      }
      this.loadingQRManual = true;
      this.codigoManualUsado = true;
      apiFetch(API.DASHBOARD_QR_SCAN, {
        method: 'POST',
        body: { boleta_code: this.qrCodigoManual.trim() }
      }).then(d => {
        this.loadingQRManual = false;
        if (d.success) {
          this.showModalQRScanner = false;
          this.stopQRPolling();
          this.loadPedidos();
          Swal.fire({
            icon: 'success',
            title: 'Código validado correctamente',
            text: 'El código de boleta fue validado con éxito y el pedido ha sido completado.',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'swal2-border-radius' }
          });
        } else {
          this.codigoManualUsado = false;
          SwalError('Error', d.error || 'No se pudo validar el código');
        }
      }).catch(() => {
        this.loadingQRManual = false;
        this.codigoManualUsado = false;
        SwalError('Error de conexión', 'Intenta de nuevo.');
      });
    },

    qrPollingInstance: null,

    startQRPolling(orderId) {
      this.stopQRPolling();
      this.qrPollingInstance = usePolling(() => {
        apiFetch(API.DASHBOARD_PEDIDO_DETALLE(orderId)).then(d => {
          if (d.success && d.order) {
            if (d.order.estado_key === 'completed' && this.showModalQRScanner && !this.codigoManualUsado) {
              this.stopQRPolling();
              this.showModalQRScanner = false;
              this.loadPedidos();
              Swal.fire({
                icon: 'success',
                title: 'Código escaneado correctamente',
                text: 'El código QR fue escaneado con éxito y el pedido ha sido completado.',
                confirmButtonColor: '#2563eb',
                customClass: { popup: 'swal2-border-radius' }
              });
            } else if (this.showModalQRScanner && this.pedidoQR) {
              this.pedidoQR = d.order;
            }
          }
        });
      });
      this.qrPollingInstance.start();
    },

    stopQRPolling() {
      if (this.qrPollingInstance) {
        this.qrPollingInstance.stop();
        this.qrPollingInstance = null;
      }
    },

    cambiarEstadoPedido(pedido, nuevoEstado) {
      apiFetch(API.DASHBOARD_PEDIDO_ESTADO(pedido.id), {
        method: 'PUT', body: { estado: nuevoEstado }
      }).then(d => {
        if (d.success) {
          pedido.estado = nuevoEstado;
          this._notify('Pedido actualizado a: ' + nuevoEstado);
          this.loadDashboard();
        }
      });
    },

    cancelarPedidoAdmin(pedido) {
      this.pedidoCancelar = pedido;
      this.justificacionCancelarPedido = '';
      this.showModalCancelarPedido = true;
    },
    confirmarCancelarPedido() {
      if (this.pedidoCancelar) {
        this.cambiarEstadoPedido(this.pedidoCancelar, 'Cancelado');
      }
      this.showModalCancelarPedido = false;
    },

    verVenta(venta) { this.ventaVer = venta; this.showModalVerVenta = true; },
    verBoleta(venta) {
      if (!venta.boleta_code) return;
      this.boletaData = { ...venta, items: [] };
      this.showModalVerBoleta = true;
      apiFetch(API.DASHBOARD_PEDIDO_DETALLE(venta.id)).then(d => {
        if (d.success && d.order) {
          this.boletaData = { ...this.boletaData, items: d.order.items || [], fecha: d.order.fecha || venta.fecha };
        }
      });
    },
    imprimirBoleta(data) { if (data.boleta_code) { window.open('/boleta/' + data.boleta_code + '/', '_blank'); } },
    editarVenta(venta) { this.ventaEditar = { ...venta, justificacion: '' }; this.showModalEditarVenta = true; },
    cancelarVenta(venta) {
      this.ventaCancelar = venta;
      this.justificacionCancelarVenta = '';
      this.showModalCancelarVenta = true;
    },
    confirmarCancelarVenta() {
      const venta = this.ventaCancelar;
      if (venta) {
        venta.estado = 'Cancelada';
        venta.justificacion = this.justificacionCancelarVenta || '';
        this.loadDashboard();
        this._notify('Venta cancelada');
      }
      this.showModalCancelarVenta = false;
      this.justificacionCancelarVenta = '';
    },
    guardarVenta() {
      const idx = this.ventas.findIndex(v => v.id === this.ventaEditar.id);
      if (idx >= 0) this.ventas[idx] = { ...this.ventaEditar };
      this.showModalEditarVenta = false;
    },

    abrirRegistrarLote(prod) {
      this.formLote = {
        productoId: prod.id, productoNombre: prod.nombre, productoCodigo: prod.codigo,
        productoColor: prod.color, productoIcono: prod.icono, productoImagen: prod.imagen,
        proveedor: '', precio: 0, cantidad: 0, fechaVencimiento: ''
      };
      this.showModalRegistrarLote = true;
    },
    guardarLote() {
      if (this.formLote.precio > 0 && this.formLote.cantidad > 0) {
        apiFetch(API.DASHBOARD_PRODUCTO_LOTES(this.formLote.productoId), {
          method: 'POST', body: this.formLote
        }).then(d => {
          if (d.success) { this.loadProductos(); this.showModalRegistrarLote = false; SwalSuccess('Lote registrado'); }
        }).catch(() => { SwalError('Error', 'No se pudo registrar el lote'); });
      }
    },

    verGasto(gasto) { this.gastoVer = gasto; this.showModalVerGasto = true; },
    editarGasto(gasto) {
      const partes = gasto.fecha ? gasto.fecha.split('/') : [];
      const fechaEdit = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : '';
      this.formGasto = { ...gasto, fecha: fechaEdit, comprobanteFile: null, comprobantePreview: gasto.comprobante_url || null, _comprobanteUrl: gasto.comprobante_url || null, comprobanteClear: false };
      this.showModalAgregarGasto = true;
    },
    handleGastoComprobante(event) {
      const file = event.target.files[0];
      if (file) {
        this.formGasto.comprobanteFile = file;
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = e => { this.formGasto.comprobantePreview = e.target.result; };
          reader.readAsDataURL(file);
        } else { this.formGasto.comprobantePreview = 'file'; }
      }
    },
    confirmarEliminarGasto(gasto) { this.gastoEliminar = gasto; this.showModalConfirmarEliminarGasto = true; },
    eliminarGasto() {
      apiFetch(API.DASHBOARD_GASTO(this.gastoEliminar.id), { method: 'DELETE' }).then(() => {
        this.gastos = this.gastos.filter(g => g.id !== this.gastoEliminar.id);
        this.showModalConfirmarEliminarGasto = false;
        this._notify('Gasto eliminado');
      });
    },
    guardarGasto() {
      const isEdit = !!this.formGasto.id;
      const url = isEdit ? API.DASHBOARD_GASTO(this.formGasto.id) : API.DASHBOARD_GASTOS;
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const form = new FormData();
      for (const k in this.formGasto) {
        if (this.formGasto.hasOwnProperty(k) && k !== 'comprobanteFile' && k !== 'comprobantePreview' && k !== '_comprobanteUrl' && k !== 'comprobanteClear' && k !== 'comprobante_nombre') {
          form.append(k, this.formGasto[k]);
        }
      }
      if (this.formGasto.comprobanteFile) form.append('comprobante', this.formGasto.comprobanteFile);
      if (this.formGasto.comprobanteClear) form.append('comprobante_clear', 'true');
      fetch(url, { method: 'POST', body: form, headers: { 'X-CSRFToken': csrf } }).then(r => r.json()).then(() => {
        this.loadGastos();
        this.showModalAgregarGasto = false;
        this._notify(isEdit ? 'Gasto actualizado' : 'Gasto creado');
      });
    },
    resetFormGasto() { this.formGasto = { id: null, concepto: '', tipo: 'Variable', monto: 0, fecha: '', descripcion: '', comprobanteFile: null, comprobantePreview: null }; },

    verUsuario(usuario) { this.usuarioVer = usuario; this.showModalVerUsuario = true; },
    editarUsuario(usuario) { this.usuarioEditar = { ...usuario }; this.showModalEditarUsuario = true; },
    guardarUsuario() {
      apiFetch(API.DASHBOARD_USUARIO(this.usuarioEditar.id), {
        method: 'PUT', body: this.usuarioEditar
      }).then(d => {
        if (d && d.success === false) { SwalError('Error', d.error || 'No se pudo actualizar el usuario'); return; }
        this.loadUsuarios();
        this.showModalEditarUsuario = false;
        this._notify('Usuario actualizado');
      });
    },
    restablecerContrasena() {
      this.showModalResetPassword = true;
    },
    confirmarResetPassword() {
      apiFetch(API.DASHBOARD_USUARIO_RESET(this.usuarioEditar.id), { method: 'POST' }).then(d => {
        if (d && d.success) {
          SwalSuccess('Contraseña restablecida', 'La nueva contraseña es: cambiar123');
        } else { SwalError('Error', 'No se pudo restablecer la contraseña'); }
      });
      this.showModalResetPassword = false;
    },
    desactivarUsuario(usuario) { this.usuarioDesactivar = usuario; this.showModalConfirmarDesactivar = true; },
    toggleUsuarioEstado() {
      apiFetch(API.DASHBOARD_USUARIO_TOGGLE(this.usuarioDesactivar.id), { method: 'POST' }).then(d => {
        if (d.success) { this.usuarioDesactivar.activo = d.activo; this.showModalConfirmarDesactivar = false; this._notify('Estado de usuario actualizado'); }
      });
    },

    crearUsuario() {
      if (!this.formNuevoUsuario.nombre || !this.formNuevoUsuario.email || !this.formNuevoUsuario.username) {
        Swal.fire({ icon: 'warning', title: 'Completa nombre, email y nombre de usuario', confirmButtonColor: '#2563eb', customClass: { popup: 'swal2-border-radius' } });
        return;
      }
      this.loadingCrearUsuario = true;
      apiFetch(API.DASHBOARD_USUARIOS, { method: 'POST', body: this.formNuevoUsuario }).then(d => {
        if (d.success) {
          this.formNuevoUsuario = { nombre: '', apellido: '', email: '', telefono: '', rol: 'employee', username: '' };
          this.showModalCrearTrabajador = false;
          this.loadUsuarios();
          Swal.fire({ icon: 'success', title: 'Usuario creado', text: 'Contraseña inicial: cambiar123', confirmButtonColor: '#2563eb', customClass: { popup: 'swal2-border-radius' } });
        } else { SwalError('Error', d.error || 'No se pudo crear el usuario'); }
      }).catch(() => { SwalError('Error de conexión', 'Intenta de nuevo.'); })
        .finally(() => { this.loadingCrearUsuario = false; });
    },

    agregarAlCarrito(prod) {
      const precio = this.productoPrecio(prod);
      const existing = this.carrito.find(c => c.id === prod.id);
      if (existing) { existing.cantidad++; }
      else { this.carrito.push({ id: prod.id, nombre: prod.nombre, precio: precio, cantidad: 1, imagen: prod.imagen || null, color: prod.color, icono: prod.icono }); }
    },
    abrirModalPago() {
      this.montoRecibido = 0; this.metodoPago = 'Efectivo'; this.pagoStep = 1;
      this.pagoQRB64 = ''; this.pagoSimulationUrl = ''; this.pagoOrderId = null; this.pagoBoletaCode = '';
      this.showModalPago = true;
    },
    procesarPago() {
      if (this.metodoPago === 'Efectivo' && this.montoRecibido < this.ventaTotal) return;
      apiFetch(API.DASHBOARD_VENTAS, {
        method: 'POST', body: { items: this.carrito, metodo: this.metodoPago }
      }).then(d => {
        if (d.success) {
          if (d.pending_payment) {
            this.pagoOrderId = d.id; this.pagoBoletaCode = d.boleta_code || '';
            this.pagoQRB64 = d.simulation_qr_b64 || ''; this.pagoSimulationUrl = d.simulation_url || '';
            this.pagoStep = 2;
            this.startPagoPolling();
          } else {
            this.carrito = []; this.montoRecibido = 0; this.metodoPago = 'Efectivo';
            this.showModalPago = false; this.showModalBoleta = true;
            this.boletaVenta = { id: d.id, boleta_code: d.boleta_code || '', cliente: 'Cliente Mostrador', total: this.ventaTotal, metodo: this.metodoPago };
            this.loadVentas(); this.loadProductos();
            this._notify('Venta registrada');
          }
        }
      });
    },
    startPagoPolling() {
      this.pagoPolling = usePolling(() => {
        apiFetch(API.PAYMENT_CHECK(this.pagoOrderId)).then(data => {
          if (data.is_paid) {
            this.pagoPolling.stop();
            apiFetch(API.DASHBOARD_VENTA_COMPLETAR(this.pagoOrderId), { method: 'POST' }).then(() => {
              this.pagoStep = 3;
            });
          }
        });
      });
      this.pagoPolling.start();
    },
    stopPagoPolling() { if (this.pagoPolling) this.pagoPolling.stop(); },
    cancelarPago() {
      this.stopPagoPolling();
      apiFetch(API.ORDER_CANCEL_UNPAID(this.pagoOrderId), { method: 'POST', body: {} })
        .then(() => { this.pagoStep = 1; this.showModalPago = false; this._notify('Pago cancelado'); })
        .catch(() => { this.pagoStep = 1; this.showModalPago = false; });
    },
    cerrarPagoExitoso() {
      const metodo = this.metodoPago; const orderId = this.pagoOrderId;
      const total = this.ventaTotal; const boletaCode = this.pagoBoletaCode;
      this.stopPagoPolling();
      this.carrito = []; this.montoRecibido = 0; this.metodoPago = 'Efectivo';
      this.pagoStep = 1; this.pagoQRB64 = ''; this.pagoSimulationUrl = '';
      this.pagoOrderId = null; this.pagoBoletaCode = '';
      this.showModalPago = false;
      this.boletaVenta = { id: orderId, boleta_code: boletaCode, cliente: 'Cliente Mostrador', total: total, metodo: metodo };
      this.showModalBoleta = true; this.loadVentas(); this.loadProductos();
      this._notify('Pago confirmado');
    },

    verGuia(tipo) {
      const guias = {
        inventario: {
          titulo: 'Guia: Gestion de Inventario',
          pasos: [
            'Ingrese a la seccion Inventario desde el menu lateral.',
            'Use el buscador o filtro de categoria para encontrar productos.',
            'Para agregar un producto, haga clic en "Agregar Producto" y complete los datos.',
            'El codigo de barras se genera automaticamente al guardar.',
            'Para registrar un lote, haga clic en el icono de lote (+) en cada producto.',
            'Los productos con stock bajo el umbral se marcan en rojo automaticamente.',
            'Use Ctrl+K para buscar rapidamente desde cualquier seccion.'
          ]
        },
        ventas: {
          titulo: 'Guia: Gestion de Pedidos',
          pasos: [
            'Ingrese a Pedidos Online desde el menu lateral.',
            'Los pedidos nuevos aparecen con estado "Pendiente".',
            'Para preparar un pedido, haga clic en el boton de preparar.',
            'Marque como "Listo para entrega" cuando este listo.',
            'Use el escaner QR para confirmar entregas con el codigo del cliente.',
            'Puede validar codigos de boleta manualmente si es necesario.',
            'Los pedidos completados se registran automaticamente como ventas.'
          ]
        },
        gastos: {
          titulo: 'Guia: Control de Gastos',
          pasos: [
            'Ingrese a la seccion Gastos desde el menu lateral.',
            'Haga clic en "Registrar Gasto" para crear uno nuevo.',
            'Seleccione el tipo: Fijo, Variable, Operativo o Mantenimiento.',
            'Ingrese el monto, fecha y descripcion del gasto.',
            'Opcionalmente adjunte un comprobante (imagen o PDF).',
            'Para editar, haga clic en el icono de lapiz en la tabla.',
            'Los gastos se reflejan automaticamente en los reportes.'
          ]
        },
        reportes: {
          titulo: 'Guia: Reportes y Analisis',
          pasos: [
            'Ingrese a la seccion Reportes desde el menu lateral.',
            'Seleccione el sub-view: Ventas, Gastos o Dashboard.',
            'Use los filtros de fecha para ajustar el periodo de analisis.',
            'Exporte reportes en PDF o Excel con los botones correspondientes.',
            'El dashboard muestra metricas clave: ventas semana, gastos mes, utilidad.',
            'Los graficos muestran tendencias de ventas y comparativas.'
          ]
        },
        usuarios: {
          titulo: 'Guia: Gestion de Usuarios',
          pasos: [
            'Ingrese a la seccion Usuarios desde el menu lateral.',
            'Use las pestanas para filtrar: Todos, Empleados, Clientes.',
            'Para crear un empleado, haga clic en "Registrar Usuario".',
            'La contrasena inicial es "cambiar123" (el usuario debera cambiarla).',
            'Para editar un usuario, haga clic en el icono de lapiz.',
            'Para desactivar, use el icono de energia (no se elimina el registro).',
            'Use el buscador para encontrar usuarios por nombre o email.'
          ]
        },
        general: {
          titulo: 'Guia General del Sistema',
          pasos: [
            'El menu lateral le permite navegar entre las diferentes secciones.',
            'Use los atajos de teclado (Alt+1 a Alt+5) para navegacion rapida.',
            'Ctrl+K abre la busqueda rapida de productos.',
            'Las notificaciones (campana) muestran pedidos online pendientes.',
            'Su perfil se muestra en la parte inferior del sidebar.',
            'Los filtros y busquedas estan disponibles en cada seccion.',
            'La paginacion le permite navegar entre registros.'
          ]
        }
      };
      const guia = guias[tipo] || guias.general;
      this.guiaTitulo = guia.titulo;
      this.guiaPasos = guia.pasos;
      this.showModalGuia = true;
    },

    getVentasFiltradas() {
      return this.ventas.filter(v => {
        const matchId = !this.busquedaVentaId ||
          String(v.id).includes(this.busquedaVentaId) ||
          (v.boleta_code && v.boleta_code.toLowerCase().includes(this.busquedaVentaId.toLowerCase()));
        const matchCanal = !this.filtroCanalVenta || v.canal === this.filtroCanalVenta;
        const matchTrabajador = !this.filtroTrabajadorVenta || v.trabajador === this.filtroTrabajadorVenta;
        let matchFecha = true;
        if (this.filtroFechaVenta) {
          const parts = v.fecha.split('/');
          const apiFecha = parts[2] + '-' + parts[1] + '-' + parts[0];
          matchFecha = apiFecha === this.filtroFechaVenta;
        }
        return matchId && matchCanal && matchTrabajador && matchFecha;
      });
    },

    getVentasTotales() { return this.ventas.reduce((s, v) => s + v.total, 0); },
    getGastosFiltradas() {
      return this.gastos.filter(g => {
        const matchBusqueda = !this.busquedaGasto ||
          String(g.id).includes(this.busquedaGasto) ||
          ('GAS-' + String(g.id).padStart(4, '0')).toLowerCase().includes(this.busquedaGasto.toLowerCase()) ||
          g.concepto.toLowerCase().includes(this.busquedaGasto.toLowerCase());
        const matchTipo = !this.filtroTipoGasto || g.tipo === this.filtroTipoGasto;
        let matchFecha = true;
        if (this.filtroFechaGasto) {
          const parts = g.fecha.split('/');
          const apiFecha = parts[2] + '-' + parts[1] + '-' + parts[0];
          matchFecha = apiFecha === this.filtroFechaGasto;
        }
        return matchBusqueda && matchTipo && matchFecha;
      });
    },

    getGastosTotales() { return this.gastos.reduce((s, g) => s + g.monto, 0); },
    getUtilidadNeta() { return this.getVentasTotales() - this.getGastosTotales(); },
    getTicketPromedio() { return this.ventas.length ? this.getVentasTotales() / this.ventas.length : 0; },
    getStockTotal() { return this.productos.reduce((s, p) => s + this.productoStock(p), 0); },
    getStockBajoCount() { return this.productos.filter(p => this.productoStock(p) < p.umbral).length; },
    getValorInventario() { return this.productos.reduce((s, p) => s + this.productoStock(p) * this.productoPrecio(p), 0); },

    abrirExportar(tipo, titulo) { this.exportarFormato = ''; this.exportarTitulo = titulo; this.exportarRangoFecha = { inicio: '', fin: '' }; this.showModalExportar = true; },
    seleccionarFormato(formato) { this.exportarFormato = formato; },
    confirmarExportar() {
      if (!this.exportarFormato) return;
      this._notify('Reporte exportado en ' + this.exportarFormato.toUpperCase());
      this.showModalExportar = false;
    }
  };
}
