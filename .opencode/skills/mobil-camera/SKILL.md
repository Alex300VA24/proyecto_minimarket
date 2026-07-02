# Mejores prácticas para solicitar acceso a la cámara desde un navegador

## Introducción

La mejor práctica en los navegadores modernos es utilizar la **API estándar `navigator.mediaDevices.getUserMedia()`**, ya que es la API oficial soportada por Chrome, Edge, Firefox y Safari.

> **Importante:** El acceso a la cámara siempre debe ser iniciado por una acción explícita del usuario (clic, toque, etc.), nunca automáticamente al cargar la página.

---

# Flujo recomendado

```text
Usuario pulsa un botón
        │
        ▼
El navegador solicita permiso para usar la cámara
        │
        ▼
El usuario acepta
        │
        ▼
Se abre la cámara
        │
        ▼
El usuario toma una foto o escanea un código
        │
        ▼
Se envía la imagen o el resultado al servidor (Django)
```

---

# ¿Por qué hacerlo así?

Los navegadores modernos implementan políticas de seguridad para proteger la privacidad del usuario.

## Beneficios

- Mayor confianza del usuario.
- Cumple con los estándares de seguridad.
- Evita bloqueos automáticos del navegador.
- Mejor experiencia de usuario (UX).

---

# ✔ Buena práctica

Mostrar un botón claramente identificado.

```text
[ Escanear producto ]
```

Al hacer clic:

```javascript
navigator.mediaDevices.getUserMedia({
    video: {
        facingMode: "environment"
    }
});
```

---

# ❌ Mala práctica

No solicitar la cámara automáticamente cuando la página carga.

```javascript
window.onload = () => {
    navigator.mediaDevices.getUserMedia(...);
}
```

Este comportamiento puede ser bloqueado por el navegador y genera una mala experiencia para el usuario.

---

# Seleccionar la cámara trasera en dispositivos móviles

Para aplicaciones como POS, inventarios o escaneo de documentos, es recomendable utilizar la cámara trasera.

```javascript
navigator.mediaDevices.getUserMedia({
    video: {
        facingMode: {
            ideal: "environment"
        }
    }
});
```

---

# Cerrar la cámara cuando ya no sea necesaria

Una vez obtenido el código o la fotografía, libera el recurso de la cámara.

```javascript
stream.getTracks().forEach(track => track.stop());
```

Beneficios:

- Reduce el consumo de batería.
- Libera el hardware.
- Elimina el indicador de cámara activa.
- Mejora el rendimiento de la aplicación.

---

# Cuando solo necesitas tomar una fotografía

Si únicamente deseas capturar una imagen desde un dispositivo móvil, puedes utilizar un campo de tipo archivo.

```html
<input
    type="file"
    accept="image/*"
    capture="environment">
```

En la mayoría de dispositivos móviles se abrirá directamente la cámara o permitirá elegir entre cámara y galería.

---

# Cuando necesitas escanear códigos QR o de barras

No implementes el reconocimiento desde cero.

Se recomienda utilizar librerías especializadas que internamente utilizan `getUserMedia()`.

## Recomendadas

- html5-qrcode
- ZXing

Estas librerías ofrecen:

- Detección automática.
- Compatibilidad con múltiples formatos.
- Mejor rendimiento.
- Mayor estabilidad.

---

# Arquitectura recomendada para un POS con Django

```text
Usuario
    │
    ▼
Pulsa "Escanear producto"
    │
    ▼
Solicitar permiso de cámara
    │
    ▼
Abrir cámara trasera
    │
    ▼
Escanear código de barras o QR
    │
    ▼
Cerrar automáticamente la cámara
    │
    ▼
Enviar únicamente el código leído mediante fetch()
    │
    ▼
Django busca el producto
    │
    ▼
Actualizar carrito
```

---

# Buenas prácticas adicionales

## Mostrar una explicación antes de solicitar permisos

Ejemplo:

> "Para escanear el código de barras necesitamos acceder a la cámara de tu dispositivo."

---

## Solicitar permisos únicamente cuando sean necesarios

No solicites permisos al ingresar a la página.

Hazlo únicamente cuando el usuario pulse un botón como:

- Escanear producto
- Escanear QR
- Tomar fotografía

---

## Manejar los errores correctamente

Ejemplo:

- Usuario rechazó el permiso.
- No existe cámara disponible.
- La cámara está siendo utilizada por otra aplicación.
- El navegador no soporta `getUserMedia()`.

Mostrar siempre mensajes claros al usuario.

---

## Utilizar HTTPS

La API `getUserMedia()` solo funciona en:

- HTTPS
- localhost (durante desarrollo)

No funcionará correctamente sobre HTTP en producción.

---

## Cerrar la cámara automáticamente

Una vez finalizado el proceso de escaneo o captura, detener el flujo de vídeo para liberar recursos.

---

# Resumen de recomendaciones

| Recomendación | Estado |
|--------------|--------|
| Solicitar la cámara mediante un botón | ✅ Recomendado |
| Usar `navigator.mediaDevices.getUserMedia()` | ✅ Estándar oficial |
| Utilizar la cámara trasera (`facingMode: "environment"`) | ✅ Recomendado para móviles |
| Cerrar la cámara al finalizar | ✅ Obligatorio |
| Enviar únicamente el resultado al servidor | ✅ Recomendado |
| Mostrar mensajes claros antes de solicitar permisos | ✅ Buena práctica UX |
| Manejar errores y permisos denegados | ✅ Necesario |
| Utilizar HTTPS | ✅ Obligatorio en producción |
| No abrir la cámara automáticamente al cargar la página | ❌ Evitar |

---

# Conclusión

Para aplicaciones web desarrolladas con **Django**, la responsabilidad de acceder a la cámara recae en el navegador mediante la API `navigator.mediaDevices.getUserMedia()`. El servidor únicamente debe recibir y procesar el resultado (imagen, código QR o código de barras).

Este enfoque cumple con los estándares actuales de seguridad, ofrece una mejor experiencia de usuario y facilita la integración con librerías especializadas para escaneo y captura de imágenes.