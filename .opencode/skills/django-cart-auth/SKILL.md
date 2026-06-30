---
name: django-cart-auth
description: Best practices para implementar un carrito persistente con autenticación y checkout en Django.
---

# Objetivo

Siempre implementar un carrito desacoplado de la autenticación.

Nunca depender únicamente del usuario autenticado.

El checkout debe requerir autenticación sin perder el carrito.

Después del login o registro debe fusionarse el carrito de sesión con el carrito del usuario.

---

# Arquitectura

apps/

accounts/

cart/

checkout/

orders/

payments/

---

# Reglas

## Carrito

El carrito puede pertenecer a:

- session_key
- user

Nunca únicamente al usuario.

---

## Persistencia

Usuarios anónimos usan request.session.session_key.

Usuarios autenticados usan request.user.

---

## Login

Si un usuario intenta acceder al checkout:

```
/checkout/
```

Debe ser redirigido a

```
/login/?next=/checkout/
```

Después del login debe regresar automáticamente.

---

## Registro

Después del registro

```
login(request, user)
```

Debe ejecutarse la misma lógica de fusión.

---

## Merge

Después del login:

1. Buscar carrito de sesión.

2. Buscar carrito del usuario.

3. Si ambos existen:

- fusionar productos
- sumar cantidades
- eliminar duplicados

4. Eliminar carrito temporal.

---

## Checkout

El checkout nunca debe leer la sesión.

Debe obtener siempre:

```
CartService.get_cart(request)
```

---

## CartService

Toda la lógica del carrito debe vivir en:

```
cart/services.py
```

No colocar lógica de carrito en las vistas.

---

## Signals

Usar

```
user_logged_in
```

para fusionar automáticamente.

---

## Buenas prácticas

✔ Services

✔ Fat Models

✔ Signals

✔ Repository Pattern (opcional)

✔ SRP

✔ Clean Architecture compatible

✔ Django Apps desacopladas

✔ Session Storage

✔ Merge Cart

✔ next parameter

✔ LoginRequiredMixin

Nunca duplicar lógica entre vistas.
