# Elmanca Web — Manca

Web de **Manca**, productora audiovisual y agencia digital 360
(Sierra Grande & Playas Doradas, Río Negro, Argentina).

## Estructura

| Carpeta | Contenido |
|---|---|
| `index.html` + `assets/` | SPA React (build estático) |
| `api/` | Backend PHP para Hostinger (`content.php`, `upload.php`, `login.php`, `common.php`, `config.json`) |
| `uploads/` | Imágenes subidas desde el panel de administración |
| `overlays/` | **Manca Studio**: overlays y panel de control para OBS/vMix |
| `server.cjs` | Servidor local de desarrollo (Node) |

## Desplegar en Hostinger

1. `npm install`
2. `npm run build` → genera `dist/`
3. En hPanel → Administrador de Archivos → `public_html/`: subí **todo el contenido de `dist/`**.
4. **Generá `api/config.json` en el servidor** (si no subiste el local). Si no existe, el login devuelve error 500 a propósito.
5. Verificá `https://tudominio.com/api/health.php` → debe decir API activa.
6. Asegurate de que `uploads/`, `api/data/` y `overlays/` tengan permisos de escritura (`755`).

> En el dominio `elmanca.com.ar` conviene además **detener el proceso Node viejo** de la app de Gemini
> y apuntar el dominio a `public_html/` donde se sube esta web.

## Seguridad

- **Login server-side**: el panel (`#admin`) ahora valida usuario/contraseña contra `api/config.json`
  vía `api/login.php` y crea una **sesión PHP** (cookie `HttpOnly` + `SameSite=Lax` + `Secure`).
  La contraseña **ya no está en el JS público**.
- `api/content.php` y `api/upload.php`: el **POST requiere sesión de administrador** + origen permitido.
- **Rate limiting**: 5 intentos de login por IP cada 15 minutos (`api/data/login_attempts.json`).
- Los archivos `api/config.json`, `api/data/*`, `overlays/config.json`, `overlays/state.json`
  y `overlays/attempts.json` están **bloqueados de la web** por `.htaccess`.
- El PIN de los overlays se genera al azar si no existe `overlays/config.json`
  (en este repo ya viene con uno nuevo, **ya no es `1234`**).

### Generar `api/config.json` (contraseña nueva)

```bash
node -e "
const c=require('crypto'),f=require('fs');
const pw=process.argv[1];
const salt=c.randomBytes(16).toString('hex');
const hash=c.createHash('sha256').update(salt+pw).digest('hex');
const cfg={admin_user:'admin',password_salt:salt,password_hash:hash,
  allowed_origins:['https://elmanca.com.ar','https://www.elmanca.com.ar'],login_rate_limit:5};
f.writeFileSync('api/config.json',JSON.stringify(cfg,null,2));
console.log('api/config.json generado');" "TU_PASSWORD"
```

> Para máxima seguridad de contraseña preferí bcrypt (`password_hash`/`password_verify` en PHP).
> Este proyecto usa SHA-256 + salt porque se genera desde Node sin instalar dependencias.

## Servidor local (desarrollo)

```bash
npm run dev        # http://localhost:3000 (usa api/config.json para el login local)
npm run preview    # sirve dist/ en modo producción
```

## Notas

- La web es 100% estática + PHP simple: funciona en hosting compartido sin Node.
- `server.cjs` solo se usa para desarrollo local / preview.
