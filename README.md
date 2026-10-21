# Sistema Inteligente de Triaje Automático y Análisis de Sentimiento basado en PLN para Soporte TI

**Autor:** Percy Antonio Miranda Montenegro  
**Curso:** Capstone Project - ISC (UPN 2026-2)  
**Stack:** Angular 21 + Node.js/Express + Google Gemini / Groq Cloud + MySQL

---

## 🎯 Objetivo

Reducir FRT y MTTR de la mesa de ayuda TI y detectar insatisfacción temprana mediante:

1. **Triaje automático con PLN** (categoría, severidad y frustración del cliente).
2. **Filtro PII** (Ley N° 29733) antes de enviar textos a la API de IA.
3. **Prioridad dinámica** y **enrutamiento inteligente** al analista idóneo.
4. **Bandeja con alertas emocionales** y **dashboard** FRT/MTTR/SLA/CSAT.

## 🏗️ Arquitectura

```
┌──────────────┐   HTTP/JSON   ┌────────────────────┐   HTTPS   ┌────────────────┐
│ Frontend SPA │ ────────────► │  Backend Express   │ ────────► │ Groq / Gemini   │
│   Angular    │               │  JWT · PII · Triaje│           │ (LLM externo)  │
└──────────────┘               └─────────┬──────────┘           └────────────────┘
                                         │ mysql2
                                     ┌───▼──────────┐
                                     │    MySQL     │
                                     │ (XAMPP/host) │
                                     └──────────────┘
```

- **Fallback local por palabras clave** (RNF03): si la API de IA está caída o sin clave configurada, el triaje se ejecuta localmente.

## 📁 Estructura

```
sistema-triaje/
├── backend/               # Node.js + Express REST API
│   ├── src/
│   │   ├── config/db.js           # Pool de conexión MySQL
│   │   ├── middlewares/           # auth (JWT), errorHandler
│   │   ├── services/              # aiClient, piiService, keywordFallback, routingService
│   │   ├── controllers/           # auth, tickets, dashboard, usuarios
│   │   ├── routes/                # definición de endpoints
│   │   ├── utils/                 # priority, constants
│   │   ├── server.js              # punto de entrada
│   │   └── seed.js                # usuarios base (idempotente)
│   ├── sql/schema.sql             # modelo de base de datos
│   ├── test/e2e.mjs               # pruebas de integración (25 casos)
│   └── .env.example
├── frontend/              # Angular SPA (standalone)
│   └── src/app/
│       ├── services/       # auth, ticket, dashboard
│       ├── guards/         # authGuard, rolesGuard
│       ├── interceptors/   # inyecta Bearer token
│       └── pages/          # login, registro, ticket-form, bandeja, ticket-detail, dashboard, analistas
└── README.md
```

## 🚀 Puesta en marcha

### 1. Base de datos (MySQL/XAMPP)

Abre **XAMPP** → inicia **MySQL**, luego crea el esquema:

```bash
mysql -u root < backend/sql/schema.sql
```

### 2. Backend (puerto 4000)

```bash
cd backend
npm install
copy .env.example .env        # edita credenciales de BD
npm start                     # o: npm run dev
npm test                      # pruebas E2E (con backend corriendo)
```

Configura en `.env` **al menos una** clave de IA. El sistema usa Groq de forma prioritaria y Gemini como respaldo; si no hay ninguna, opera con el triaje local por palabras clave.

| Plataforma | Consigue tu clave | Variable |
|---|---|---|
| **Groq** | https://console.groq.com | `GROQ_API_KEY` |
| **Google Gemini** | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |

### 3. Frontend (puerto 4200)

```bash
cd frontend
npm install
npm start                     # http://localhost:4200
```

## 👤 Cuentas demo (creadas por el seed en el arranque del backend)

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@triaje.com | Admin123! |
| Cliente | juan.perez@empresa.com | Cliente123! |
| Analista | ana.torres@empresa.com | Analista123! |

Analistas de soporte adicionales: `carlos.ruiz` (Software), `maria.gomez` (Redes), `luis.fernandez` (Accesos), `rosa.mendoza` (Base de Datos) — todos con `Analista123!`.

## 🔌 Endpoints principales

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/registrar` | público |
| GET | `/api/auth/perfil` | autenticado |
| POST | `/api/tickets` | cliente/analista/admin |
| GET | `/api/tickets?estado=&severidad=&categoria=` | por rol |
| GET | `/api/tickets/:id` | por rol |
| PATCH | `/api/tickets/:id/estado` | analista/admin |
| POST | `/api/tickets/:id/reasignar` | admin |
| GET | `/api/dashboard/resumen` · `/exportar` | analista/admin |
| GET/POST | `/api/usuarios/analistas` | autenticado / admin |

## ✅ Cumplimiento de requerimientos

| Req | Implementación |
|---|---|
| RF01 JWT + roles | `middleware/auth.js` (cliente/analista/administrador) |
| RF02 Registro de ticket | `POST /api/tickets` |
| RF03 Filtro PII | `services/piiService.js` (DNI, email, tarjeta, teléfono, credenciales, nombres) |
| RF04 Triaje + sentimiento | `services/aiClient.js` con Groq/Gemini y prompt JSON estricto |
| RF05 Prioridad dinámica | `utils/priority.js` (60% severidad + 40% frustración) |
| RF06 Enrutamiento inteligente | `services/routingService.js` (especialidad + menor carga) |
| RF07 Bandeja con alertas | Código de color por severidad/sentimiento/prioridad + reasignación |
| RF08 Dashboard FRT/MTTR/SLA | `dashboardController.js` + Chart.js |
| RNF01 Latencia ≤ 3s | Triaje con HTTP ligero y fallback local instantáneo |
| RNF02 Seguridad/PII | JWT + enmascaramiento previo a la IA (Ley 29733) |
| RNF03 99% + fallback | `keywordFallback.js` ante caída de la API externa |
| RNF04 Usabilidad | Angular responsive, colores y estados claros |

## 🧪 Pruebas

```bash
cd backend
npm test
```

Resultado esperado: `25 OK, 0 FAIL` (registro, triaje, PII, roles, dashboard, exportación).

## 📌 Notas

- JWT y credenciales de BD vienen con valores de desarrollo; cámbialos antes de producción.
- La latencia real del LLM depende de tu proveedor y clave; el flujo mide `latencia_ms` por ticket.
- Los datos se almacenan con la descripción original (visible para el personal técnico) y el texto anonimizado enviado a la IA queda auditado en `triage_logs`.