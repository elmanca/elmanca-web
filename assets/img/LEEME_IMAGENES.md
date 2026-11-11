# 🖼️ Cómo cambiar las imágenes (sin saber programar)

Todas las imágenes importantes de la web son **placeholders** que podés reemplazar
sin tocar código. Hay 2 formas:

## Opción A — La más fácil: desde el Panel Admin (recomendada)

1. Abrí tu web y andá a `tudominio.com/#/admin` (o `#admin`).
2. Iniciá sesión con tu usuario de administrador.
3. Entrá a cada pestaña:
   - **Ícono & Logos Web** → logotipo principal + logo del footer.
   - **Galería** → las 8 fotos bajo el inicio.
   - **Marcas** → logotipos de marcas / sponsors.
   - **Webs** → capturas de proyectos web (PNG o GIF).
   - **Festival / Canal** → se actualizan solas con el ID de YouTube.
4. Tocá **"Aplicar Cambios"**. ¡Listo! Quedan guardadas en Hostinger.

## Opción B — Reemplazando archivos (para el logo, iconweb y defaults)

Entrá a la carpeta `public/assets/img/` del proyecto (o `public_html/assets/img/`
en Hostinger una vez subida la web):

| Archivo | Dónde se muestra | Tamaño sugerido |
|---|---|---|
| `logo-manca.svg` | Logo principal (menú, sello giratorio, nosotros, footer) | 512×512 PNG/SVG fondo transparente |
| `icon-web.svg` | Icono de la pestaña del navegador (favicon) + Apple touch | 512×512 (o 180×180 PNG) |
| `logo-footer.svg` | Logo horizontal del pie de página | 800×400 PNG fondo transparente |
| `placeholder-galeria.svg` | Foto genérica de galería / proyectos / videos | 800×500 JPG |
| `placeholder-marca.svg` | Logo genérico de marca / sponsor | 480×240 PNG fondo transparente |
| `placeholder-web.svg` | Captura genérica de web desarrollada | 800×500 PNG o GIF |

**Regla de oro:** mantené el **mismo nombre de archivo**. Ejemplo: si tu logo se
llama `mi-logo.png`, renombralo a `logo-manca.svg` (o `logo-manca.png` y actualizá
la ruta en `src/utils/images.ts` → `PLACEHOLDERS`).

## Subir a Hostinger (resumen)

1. Ejecutá `npm run build` → se genera `dist/`.
2. En hPanel → Administrador de Archivos → `public_html/`:
   - Subí **todo el contenido de `dist/`** (incluye `index.html`, `assets/` y `api/`).
   - Creá la carpeta `uploads/` con permisos `755` (ahí van las fotos del Admin).
3. Verificá `https://tudominio.com/api/content.php` → debe decir API activa.
4. Listo: la web es 100% estática + 2 PHP simples, ideal para plan compartido.
