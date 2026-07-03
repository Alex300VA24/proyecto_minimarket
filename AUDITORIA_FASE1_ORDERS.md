# Auditoría Técnica - Fase 1
## Proyecto: Minimarket Django

### Objetivo

Realizar una refactorización profesional del módulo **orders** siguiendo las mejores prácticas de Django y principios SOLID, sin modificar el comportamiento funcional del sistema.

---

# Restricciones (OBLIGATORIAS)

Antes de realizar cualquier cambio debes cumplir estrictamente las siguientes reglas.

## NO modificar

- No cambiar la lógica de negocio.
- No cambiar URLs.
- No cambiar nombres de modelos.
- No cambiar nombres de tablas.
- No modificar migraciones existentes.
- No eliminar funcionalidades.
- No modificar Templates salvo que sea estrictamente necesario.
- No cambiar respuestas JSON.
- No romper compatibilidad con el frontend.

El objetivo es únicamente mejorar la arquitectura interna.

---

# Objetivos de la refactorización

## 1. Reducir el tamaño de orders/views.py

Actualmente el archivo tiene aproximadamente 565 líneas.

El objetivo es que ninguna vista supere las 80-120 líneas.

Dividir el archivo por responsabilidades.

Ejemplo:

```
orders/

    views/

        cart_views.py

        checkout_views.py

        payment_views.py

        order_views.py

        receipt_views.py
```

Actualizar correctamente `urls.py` para mantener compatibilidad.

---

## 2. Extraer lógica de negocio

Toda lógica compleja debe salir de las vistas.

Crear:

```
orders/services/
```

Ejemplo:

```
order_service.py

payment_service.py

cart_service.py

receipt_service.py

qr_service.py
```

Las vistas únicamente deben:

- validar request
- llamar al servicio
- devolver respuesta

No deben contener lógica de negocio.

---

## 3. Eliminar duplicación (DRY)

Buscar código repetido.

Especialmente:

- generación de QR
- construcción de URLs
- generación de respuestas JSON
- serialización de órdenes
- serialización de items
- construcción de diccionarios

Extraer helpers reutilizables.

---

## 4. Crear capa de Selectors

Las consultas complejas deben salir de las vistas.

Crear

```
orders/selectors/
```

Ejemplo:

```
order_selector.py

cart_selector.py
```

Toda consulta repetida debe centralizarse.

---

## 5. Crear Validators

Crear

```
orders/validators/
```

Mover validaciones de negocio.

Ejemplos:

- stock
- cantidades
- métodos de pago
- carrito vacío

---

## 6. Mejorar generación de códigos

Revisar

```
generate_boleta_code()
```

Evitar condiciones de carrera.

Si actualmente obtiene:

```
último registro + 1
```

proponer una implementación segura utilizando transacciones o mecanismos equivalentes.

No modificar el formato actual del código.

---

## 7. PaymentService

Toda lógica relacionada con pagos debe vivir en

```
payment_service.py
```

Mover:

- URLs
- QR
- simulaciones
- construcción de enlaces

Eliminar lógica repetida.

---

## 8. Serialización

No construir manualmente múltiples diccionarios.

Crear funciones reutilizables.

Ejemplo

```
serialize_order()

serialize_order_items()
```

Si el proyecto utiliza DRF, evaluar serializers.

---

## 9. Tipado

Agregar Type Hints.

Ejemplo

```
def generate_qr_base64(url: str) -> str:
```

Aplicar donde sea posible.

---

## 10. Documentación

Agregar Docstrings únicamente en funciones públicas.

Formato recomendado:

```
"""
Genera el código QR correspondiente a una orden.

Args:
    order: instancia de Order.

Returns:
    str
"""
```

---

## 11. Imports

Eliminar:

- imports sin usar
- imports duplicados
- imports innecesarios

Mantener orden utilizando isort.

---

## 12. Mantener transacciones

Conservar

```
transaction.atomic()
```

cuando exista creación de órdenes y actualización de stock.

No eliminar protección transaccional.

---

# Principios a seguir

Aplicar estrictamente:

- SOLID
- DRY
- KISS
- Clean Code
- Alta cohesión
- Bajo acoplamiento
- Single Responsibility Principle

---

# Calidad esperada

Cada vista debe ser muy pequeña.

Ideal:

```python
@login_required
@require_POST
def create_order(request):

    dto = CreateOrderDTO.from_request(request)

    order = OrderService.create(
        dto=dto,
        user=request.user,
    )

    return success_response(order)
```

Toda la lógica debe vivir en los servicios.

---

# No introducir

No agregar:

- librerías nuevas
- dependencias
- frameworks
- patrones innecesariamente complejos

La solución debe seguir siendo idiomática para Django.

---

# Resultado esperado

Entregar:

- código completamente funcional
- sin romper comportamiento existente
- sin romper tests
- sin cambiar API pública
- con menor complejidad ciclomática
- con menor duplicación
- con mejor mantenibilidad

---

# Antes de finalizar

Verificar:

- imports correctos
- lint sin errores
- proyecto ejecuta correctamente
- migraciones no modificadas
- URLs funcionando
- respuestas JSON sin cambios

Si detectas una mejora adicional relacionada con arquitectura, documentarla antes de implementarla.