# Custom Web Design — ImageWorks Creative

Landing page de servicios de diseño web, construida sobre el sistema visual del
home: <https://imageworksc.github.io/imageworks-home/>

Página estática sin dependencias ni framework. El marcado, los estilos y el
comportamiento van en tres archivos separados, y las imágenes y la tipografía
como archivos propios junto a ellos.

La página no trae nav ni footer: es sólo el contenido, pensada para montarse
dentro del chrome del sitio.

## Uso

Abre [`index.html`](index.html) en el navegador. No hay servidor ni dependencias.

## Estructura

```
.
├── index.html           # Marcado — enlaza styles.css y app.js
├── styles.css           # Todos los estilos, en orden de cascada
├── app.js               # Todo el comportamiento
├── assets/              # custom-shot.jpg + work-1..8.jpg
├── fonts/               # Plus Jakarta Sans (subconjunto latin, variable)
├── build.ps1            # Ensambla los tres archivos desde src/
└── src/
    ├── head.html        # <head>: meta, Open Graph, JSON-LD
    ├── body.html        # Marcado de la página
    ├── testimonials.html# Las 8 reseñas (el build las duplica para el carrusel)
    ├── works.html       # Las 8 tarjetas de portfolio (ídem)
    ├── app.js           # Reveals, riel del proceso, anclas, FAQ, contadores
    └── css/
        ├── 01-tokens.css      # Paleta y escalas, tomadas del home
        ├── 02-base.css        # Reset, tipografía, botones, utilidades
        ├── 03-components.css  # Hero, mockups, proceso, comparativa
        ├── 04-sections.css    # Resto de secciones y responsive
        └── 05-work.css        # Miniaturas de portfolio
```

Los tres archivos de la raíz se generan: edita `src/`, no ellos.

Ninguna regla vive en el marcado — no hay atributos `style=` ni `<script>`
en línea. Lo que en el HTML era un `style` puntual está ahora en las utilidades
de espaciado de [`src/css/02-base.css`](src/css/02-base.css).

## Compilar

```powershell
pwsh -File build.ps1
```

Genera:

| Archivo | Para qué |
|---|---|
| `index.html` · `styles.css` · `app.js` | El entregable |
| `preview.artifact.html` | La misma página en un solo archivo, con CSS, JS y assets incrustados, para el preview del artifact (no se versiona) |

## Sistema visual

Los valores salen del `styles.css` del home, no de una aproximación:

| Token | Valor |
|---|---|
| Navy / Azul / Verde | `#143c66` · `#1266b5` · `#80c34a` |
| Verde de texto | `#5c9a2e` |
| Texto / Apagado | `#1f2b3e` · `#5a6b82` · `#7d8ea1` |
| Bandas | `#ffffff` · `#f2f5f9` · `#f1f3f6` |
| Banda CTA | `linear-gradient(135deg, #1266b5, #0a2c4d)` + trama de puntos |
| Radio | `2px` — la esquina cuadrada de la marca |
| Sombra de tarjeta | `0 1px 3px / 0 14px 34px rgba(20,40,80,…)` |
| Easing | `cubic-bezier(.16, .84, .44, 1)` |

Tema claro único: no hay modo oscuro.

## Montarla en el sitio

Si el sitio pone una cabecera fija encima, sube a la vez `--anchor-offset` en
[`src/css/01-tokens.css`](src/css/01-tokens.css) y `ANCHOR_OFFSET` en
[`src/app.js`](src/app.js): son la misma medida — dónde se detiene un título al
saltar a su ancla — una para el navegador y otra para el scroll suave.

## Pendiente

- Sustituir los tres huecos de portfolio por capturas reales y sus nombres de cliente
- Apuntar los CTA (`#quote`) al formulario o página de contacto real
- Confirmar la URL canónica en [`src/head.html`](src/head.html)

## Licencia

MIT. Ver [LICENSE](LICENSE).
