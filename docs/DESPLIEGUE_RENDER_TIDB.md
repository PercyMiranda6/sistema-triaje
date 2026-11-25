# Despliegue gratuito en Render + TiDB Cloud

## 1. Crear la base de datos

En TiDB Cloud crea una instancia **Starter** MySQL-compatible. En `Connect`, selecciona conexión pública y guarda `host`, `user` y la contraseña generada.

En el editor SQL de TiDB ejecuta el contenido de `backend/sql/schema.sql`. La aplicación ejecutará automáticamente el seed de usuarios al iniciar.

## 2. Crear los servicios en Render

En Render selecciona **New > Blueprint**, conecta el repositorio `PercyMiranda6/sistema-triaje`, rama `main`, y usa el archivo `render.yaml` de la raíz. El Blueprint crea:

- `sistema-triaje-api`: backend Express.
- `sistema-triaje-frontend`: frontend Angular estático.

Cuando Render solicite variables secretas del backend, configura:

| Variable | Valor |
|---|---|
| `DB_HOST` | Host de TiDB Cloud |
| `DB_PORT` | `4000` |
| `DB_USER` | Usuario de TiDB Cloud, incluyendo su prefijo |
| `DB_PASSWORD` | Contraseña generada en TiDB Cloud |
| `DB_NAME` | `sistema_triaje` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | Secreto largo y aleatorio |
| `GROQ_API_KEY` | Clave de Groq, opcional; sin ella usa fallback local |

También puedes configurar `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` si deseas cambiar la cuenta administradora inicial.

## 3. Conectar el frontend con la API

Después del primer despliegue, copia la URL pública del servicio `sistema-triaje-api`, por ejemplo `https://sistema-triaje-api.onrender.com`.

Edita `frontend/src/app/api.config.ts` y cambia `API_BASE` a:

```ts
export const API_BASE = 'https://sistema-triaje-api.onrender.com/api';
```

Haz commit y push a `main`. Render volverá a construir el frontend automáticamente.

## 4. Verificación

Abre:

```text
https://URL-DE-LA-API.onrender.com/api/health
```

Debe responder con `estado: "ok"` y `baseDatos: "conectado"`. Luego abre la URL pública del frontend y prueba el login.

En el plan gratuito el backend puede dormir tras un periodo de inactividad; la primera petición posterior puede tardar alrededor de un minuto.
