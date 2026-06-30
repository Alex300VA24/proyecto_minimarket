# Minimarket Yumis — Documentación del Proyecto

## Descripción General

Sistema web de gestión para minimarket desarrollado con Django 6.0. Permite administrar inventario, ventas (online y presencial), pedidos, gastos, usuarios y generar boletas electrónicas con código QR.

---

## Arquitectura

### Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Django 6.0 (Python) |
| Base de datos | MySQL 8+ (con `mysqlclient`) |
| Frontend | Tailwind CSS + Alpine.js |
| Bundler JS | esbuild |
| CSS Processor | PostCSS + Autoprefixer |
| Librerías adicionales | SweetAlert2, QR Code, xhtml2pdf, Font Awesome 6 |
| Gestor paquetes JS | pnpm |

### Estructura de Directorios

```
proyecto_minimarket/
├── manage.py                      # CLI de Django
├── requirements.txt               # Dependencias Python
├── package.json                   # Dependencias JS (Tailwind, Alpine, esbuild)
├── tailwind.config.js
├── postcss.config.js
│
├── proyecto_minimarket/           # Configuración del proyecto Django
│   ├── settings.py                # Settings globales (DB, static, media, auth)
│   ├── urls.py                    # URL raíz (admin + core.urls)
│   ├── asgi.py / wsgi.py
│
├── core/                          # App principal: páginas públicas + gastos
│   ├── views.py                   # home, dashboard, gastos APIs
│   ├── models.py                  # Modelo Expense
│   ├── decorators.py              # Decorador @staff_required
│   ├── dashboard_urls.py          # URLs del dashboard (stats, gastos)
│   ├── urls.py                    # URLs globales (incluye todas las apps)
│   └── templates/core/
│       ├── base.html              # Layout principal
│       ├── home.html              # Landing page
│       ├── _navbar.html           # Barra de navegación
│       ├── _footer.html           # Pie de página
│       ├── como_funciona.html
│       ├── contacto.html
│       └── admin/                 # Dashboard SPA (Alpine.js)
│           ├── dashboard.html     # ~590 líneas de Alpine.js
│           ├── partials/          # Sidebar, header
│           └── partials/sections/ # 8 secciones
│           └── partials/modals/   # 19 modales
│
├── apps/
│   ├── accounts/                  # Gestión de usuarios y autenticación
│   │   ├── models.py              # UserProfile (roles: admin, employee, client)
│   │   ├── views.py               # login, register, profile + dashboard APIs de usuarios
│   │   ├── forms.py               # RegisterForm, LoginForm, UserProfileForm
│   │   ├── signals.py             # Creación automática de UserProfile
│   │   ├── urls.py                # URLs de cuenta
│   │   └── dashboard_urls.py      # APIs de usuarios del dashboard
│   │
│   ├── products/                  # Catálogo e inventario
│   │   ├── models.py              # Category, Product, ProductBatch
│   │   ├── views.py               # catálogo público + dashboard APIs de productos
│   │   ├── utils.py               # reduce_stock_fifo (FIFO inventory)
│   │   ├── urls.py                # URLs del catálogo
│   │   └── dashboard_urls.py      # APIs de productos del dashboard
│   │
│   └── orders/                    # Carrito, pedidos y boletas
│       ├── models.py              # Cart, CartItem, Order, OrderItem
│       ├── views.py               # carrito, checkout, boletas + dashboard APIs de pedidos
│       ├── urls.py                # URLs de órdenes
│       └── dashboard_urls.py      # APIs de pedidos/ventas del dashboard
│
├── templates/                     # Templates a nivel proyecto
│   └── registration/              # Templates de reset de contraseña
│
├── static/
│   ├── src/css/app.css            # CSS fuente (Tailwind + componentes custom)
│   ├── src/js/app.js              # JS fuente (Alpine.js, SweetAlert2)
│   ├── src/images/
│   └── dist/                      # Archivos compilados (build)
│
└── media/products/                # Imágenes subidas de productos
```

---

## Apps de Django

### `core` — Páginas Públicas y Gastos

**Modelos:** `Expense` (concepto, tipo, monto, fecha, descripción, creador)

**Vistas públicas:**
| URL | Vista | Descripción |
|---|---|---|
| `/` | `home` | Landing page con productos destacados |
| `/como-funciona/` | `como_funciona` | Página explicativa |
| `/contacto/` | `contacto` | Formulario de contacto |
| `/dashboard/` | `dashboard` | Admin SPA (requiere staff) |

**APIs del dashboard (en `core/dashboard_urls.py`):**
| URL | Vista | Descripción |
|---|---|---|
| `/dashboard/api/stats/` | `api_dashboard_stats` | Estadísticas semanales/mensuales |
| `/dashboard/api/gastos/` | `api_gastos` | CRUD de gastos |
| `/dashboard/api/gastos/<id>/` | `api_gasto_detalle` | Detalle/edición/eliminación de gasto |

### `apps.accounts` — Usuarios y Autenticación

**Modelos:** `UserProfile` (one-to-one con User, roles: admin/employee/client)

**Vistas públicas:**
| URL | Vista | Descripción |
|---|---|---|
| `/cuenta/ingresar/` | `login_view` | Inicio de sesión |
| `/cuenta/registrarse/` | `register_view` | Registro de usuario |
| `/cuenta/salir/` | `logout_view` | Cierre de sesión |
| `/cuenta/perfil/` | `profile_view` | Ver/editar perfil |
| `/cuenta/perfil/api/datos/` | `profile_api_data` | JSON del perfil |
| `/cuenta/perfil/cambiar-contrasena/` | `change_password` | Cambiar contraseña |
| `/cuenta/reset-password/...` | PasswordReset views | Recuperación de contraseña |

**APIs del dashboard (en `apps/accounts/dashboard_urls.py`):**
| URL | Vista | Descripción |
|---|---|---|
| `/dashboard/api/usuarios/` | `api_usuarios` | Listar/crear usuarios |
| `/dashboard/api/usuarios/<id>/` | `api_usuario_detalle` | Ver/editar rol |
| `/dashboard/api/usuarios/<id>/toggle/` | `api_usuario_toggle` | Activar/desactivar |

### `apps.products` — Catálogo e Inventario

**Modelos:** `Category`, `Product`, `ProductBatch`

**Vistas públicas:**
| URL | Vista | Descripción |
|---|---|---|
| `/catalogo/` | `catalog_view` | Catálogo con filtros |
| `/catalogo/<slug>/` | `product_detail_view` | Detalle de producto |
| `/catalogo/api/datos/` | `catalog_api_data` | JSON del catálogo |

**APIs del dashboard (en `apps/products/dashboard_urls.py`):**
| URL | Vista | Descripción |
|---|---|---|
| `/dashboard/api/productos/` | `api_productos` | Listar/crear productos |
| `/dashboard/api/productos/<id>/` | `api_producto_detalle` | CRUD de producto |
| `/dashboard/api/productos/<id>/lotes/` | `api_lotes` | Registrar/ver lotes |

**Utilidades:**
- `apps/products/utils.py` → `reduce_stock_fifo()`: Reduce el stock usando FIFO (lotes más antiguos primero)

### `apps.orders` — Carrito, Pedidos y Boletas

**Modelos:** `Cart`, `CartItem`, `Order`, `OrderItem`

**Vistas públicas:**
| URL | Vista | Descripción |
|---|---|---|
| `/carrito/` | `cart_view` | Página del carrito |
| `/carrito/api/datos/` | `cart_api_data` | JSON del carrito |
| `/carrito/agregar/` | `add_to_cart` | Agregar producto |
| `/carrito/actualizar/<id>/` | `update_cart_item` | Actualizar cantidad |
| `/carrito/eliminar/<id>/` | `remove_from_cart` | Eliminar item |
| `/carrito/vaciar/` | `empty_cart` | Vaciar carrito |
| `/pago/` | `pago_view` | Página de pago |
| `/finalizar/` | `checkout` | Confirmar pedido |
| `/pedidos/` | `my_orders_view` | Mis pedidos |
| `/pedidos/<id>/` | `order_detail_view` | Detalle del pedido |
| `/pedidos/<id>/api/datos/` | `order_detail_api_data` | JSON del pedido |
| `/pedidos/<id>/cancelar/` | `cancel_order` | Cancelar pedido |
| `/boleta/<code>/` | `boleta_view` | Ver boleta (con QR) |
| `/boleta/<code>/pdf/` | `boleta_pdf_view` | Descargar PDF |
| `/boleta/<code>/verificar/` | `verify_boleta` | Avanzar estado vía QR |

**APIs del dashboard (en `apps/orders/dashboard_urls.py`):**
| URL | Vista | Descripción |
|---|---|---|
| `/dashboard/api/pedidos/` | `api_pedidos` | Listar pedidos activos |
| `/dashboard/api/pedidos/<id>/estado/` | `api_pedido_estado` | Cambiar estado |
| `/dashboard/api/ventas/` | `api_ventas` | Listar/crear ventas |

---

## Modelo de Datos

### Relaciones Principales

```
User (Django auth) ──1:1── UserProfile (rol, teléfono, dirección)
     │
     ├── Order (usuario, estado, total, método pago, código boleta)
     │    └── OrderItem (producto, cantidad, precio, product_name snapshot)
     │
     └── Cart (usuario o session_key)
          └── CartItem (producto, cantidad)

Category ──1:N── Product ──1:N── ProductBatch (lote, precio compra, cantidad, vencimiento)
                    │
                    ├── CartItem
                    └── OrderItem

Expense (concepto, tipo, monto, fecha, creador)
```

### Estados de Pedido

`pending` → `confirmed` → `preparing` → `ready` → `delivered`
`pending`/`confirmed` → `cancelled`

---

## Frontend

### Estilos
- **Tailwind CSS** con configuración personalizada (colores brand, accent, ink)
- Componentes CSS custom en `static/src/css/app.css` (botones, badges, modales, tablas, tooltips, animaciones)
- Build: `pnpm run build` (Tailwind + Autoprefixer → minificado)

### JavaScript
- **Alpine.js** como framework reactivo
- **SweetAlert2** para notificaciones y confirmaciones
- Archivo fuente: `static/src/js/app.js`
- Build: `esbuild` → bundle + minificado → `static/dist/js/app.js`
- El dashboard usa una SPA con Alpine.js (~590 líneas) que maneja 8 secciones y 19 modales

### Admin Dashboard
- Single Page Application construida con Alpine.js
- Consume APIs REST JSON bajo `/dashboard/api/`
- Secciones: Dashboard, Inventario, Ventas (Nueva/Lista), Gastos, Usuarios, Ayuda
- Roles: admin (acceso completo), employee/empleado (solo inventario, ventas, ayuda)

---

## Configuración

### Base de Datos (MySQL)
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'minimarket_yumis_db',
        'USER': 'root',
        'PASSWORD': 'admin123',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### Static & Media
```python
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']   # src/ y dist/
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### Auth
- `LOGIN_URL = 'login'`, `LOGIN_REDIRECT_URL = 'home'`, `LOGOUT_REDIRECT_URL = 'home'`
- Usa el modelo `User` por defecto de Django, extendido vía `UserProfile`

---

## Desarrollo

### Requisitos
- Python 3.12+
- MySQL 8+
- Node.js 18+ / pnpm

### Instalación

```bash
# Backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt

# Frontend
pnpm install

# Base de datos
# Configurar MySQL y crear la base de datos 'minimarket_yumis_db'

# Migraciones
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic

# Iniciar servidor
python manage.py runserver

# Build frontend (desarrollo con watch)
pnpm run dev    # CSS
pnpm run dev:js # JS
```

### Comandos Útiles
```bash
pnpm run build     # Build CSS + JS para producción
pnpm run dev       # Watch CSS
pnpm run dev:js    # Watch JS
```

---

## Buenas Prácticas Implementadas

1. **Separación por dominio**: Cada app (`accounts`, `products`, `orders`, `core`) agrupa modelos, vistas y URLs de su dominio específico
2. **APIs del dashboard por app**: Cada app expone sus propias APIs bajo `dashboard_urls.py`, evitando el acoplamiento en `core`
3. **Lógica de negocio compartida**: `reduce_stock_fifo` vive en `apps/products/utils.py` y es importada por `apps/orders/views.py` (flujo de dependencia correcto: orders → products)
4. **Decoradores reutilizables**: `@staff_required` en `core/decorators.py` usado por todas las apps
5. **URLs modulares**: Cada app define sus patrones de URL, `core/urls.py` los incluye vía `include()`
6. **Templates por app**: Cada app tiene su carpeta `templates/<app>/` con sus propios templates
7. **Assets compilados**: CSS y JS fuente separados de los distribuidos (src/ → dist/)
8. **Transacciones atómicas**: Las operaciones críticas (checkout, venta manual) usan `transaction.atomic()`
