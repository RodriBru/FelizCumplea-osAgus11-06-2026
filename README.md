# Cartas para Agustina — Versión 2

Esta versión corrige el principal problema visual de la primera prueba:

- el fondo ya no contiene títulos ni fechas;
- todo el texto importante vive en HTML;
- no se duplica el mensaje;
- la pantalla se adapta mejor a celular;
- la colección reserva 10 cartas;
- Perla, Shayna y Anage tienen identidad confirmada por ahora;
- no se incluye una carta digital de Rodrigo porque será física;
- los sobres fueron rediseñados como SVG inline para que se vean más cuidados;
- el carrusel, la apertura y el lector tienen animaciones más suaves;
- el lector permite ampliar la carta y desplazarse dentro de la imagen;
- el progreso se guarda solo durante la sesión de la pestaña y se borra al cerrar la página.

## Abrir el proyecto

Abrí `index.html` o subí la carpeta completa a GitHub Pages.

## Cambiar las cartas escaneadas

Copiá cada imagen dentro de:

```text
assets/img/cartas/
```

Después editá:

```text
js/cartas.js
```

Ejemplo:

```js
{
  id: "perla",
  persona: "Perla",
  subtitulo: "Un mensaje muy dulce",
  imagen: "./assets/img/cartas/perla.jpg",
  tipoSello: "cookie",
  disponible: true
}
```

## Cambiar los nombres de las cartas pendientes

Dentro de `js/cartas.js`, reemplazá:

```js
persona: "Carta sorpresa 02"
```

por el nombre real, y cambiá también la ruta de la imagen escaneada.

Actualmente los sellos están así:

- Perla: galletita.
- Shayna: nota musical.
- Anage: corazón, con imagen real cargada en `assets/img/cartas/anage.jpeg`.
- Cartas pendientes: corazón temporal hasta definir un símbolo propio.

## Tipos de sello disponibles

```text
cookie
flower
star
moon
sun
leaf
music
sparkle
heart
rose
```

## Fondo

La pantalla inicial usa el fondo principal pedido:

```text
assets/img/FONDO_SISTEMA_DE_CARTAS.png
```

El texto de portada sigue viviendo en HTML: título, fecha y botón no están incrustados en la imagen.

La sección de sobres usa una ambientación reemplazable:

```text
assets/img/ambiente_cartas_antiguas.svg
```

Tiene papeles antiguos, textura suave y trazos de escritura decorativa sin texto legible.

Más adelante se puede reemplazar manteniendo exactamente el mismo nombre de archivo o cambiando la ruta en `css/styles.css`.

## Librerías

- Swiper 12.2.0
- GSAP 3.13.0
- canvas-confetti 1.9.4
- Phosphor Icons 2.1.2
