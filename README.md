# Custom Web Design — ImageWorks Creative

Landing page de servicios de diseño web, construida sobre el sistema visual del
home: <https://imageworksc.github.io/imageworks-home/>

Página estática de un solo archivo. **Cero peticiones externas**: la tipografía,
los dos logos y el mapa del footer van incrustados como data URI.

## Uso

Abre [`index.html`](index.html) en el navegador. No hay servidor ni dependencias.

## Estructura

```
.
├── index.html           # Página compilada — el entregable
├── build.ps1            # Ensambla index.html desde src/
└── src/
    ├── head.html        # <head>: meta, Open Graph, JSON-LD
    ├── body.html        # Marcado de la página
    ├── testimonials.html# Las 8 reseñas (el build las duplica para el carrusel)
    ├── app.js           # Reveals, riel del proceso, nav, anclas
    ├── css/
    │   ├── 01-tokens.css      # Paleta y escalas, tomadas del home
    │   ├── 02-base.css        # Reset, tipografía, botones, enlaces
    │   ├── 03-components.css  # Nav, hero, mockups, proceso, comparativa
    │   └── 04-sections.css    # Resto de secciones, footer, responsive
    ├── assets/          # logo.png, footer-logo.png, footer-map.jpg
    └── fonts/           # Plus Jakarta Sans (subconjunto latin, variable)
```

## Compilar

```powershell
pwsh -File build.ps1
```

Genera dos archivos:

| Archivo | Para qué |
|---|---|
| `index.html` | Página autónoma con `<head>` completo |
| `preview.artifact.html` | Fragmento sin `<head>` para el preview del artifact (no se versiona) |

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

## Enlaces del nav y el footer

Apuntan a la URL del home, definida en una sola línea de [`build.ps1`](build.ps1):

```powershell
$homeUrl = 'https://imageworksc.github.io/imageworks-home/'
```

Cámbiala por el origen de producción y se actualiza toda la página.

## Pendiente

- Sustituir los tres huecos de portfolio por capturas reales y sus nombres de cliente
- Apuntar los CTA (`#quote`) al formulario o página de contacto real
- Confirmar la URL canónica en [`src/head.html`](src/head.html)

## Licencia

MIT. Ver [LICENSE](LICENSE).
