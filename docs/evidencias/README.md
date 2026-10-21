# Evidencias de prueba — Sistema de Triaje Automático con PLN

Registro de la evidencia ejecutada sobre la versión en desarrollo del proyecto
**Capstone 2026-2 — Sistema inteligente de triaje automático y análisis de sentimiento
basado en Procesamiento de Lenguaje Natural**.

| Parámetro | Valor |
|---|---|
| Motor de PLN | Groq API — `openai/gpt-oss-20b` (respaldo: Google Gemini y motor local de reglas) |
| Base de datos | MySQL 8.0 / MariaDB 10.4 — base `sistema_triaje` |
| Backend | Node.js 24 + Express 5 — `http://localhost:4000/api` |
| Frontend | Angular 21 — `http://127.0.0.1:4200` |
| Navegador de prueba | Google Chrome headless controlado con Puppeteer |

---

## 01-pruebas — Evidencia de ejecución automatizada

| Archivo | Qué verifica | Resultado obtenido |
|---|---|---|
| `01-e2e-sistema.txt` | 25 aserciones de integración de extremo a extremo sobre la API real y la base de datos (autenticación por rol, PII, triaje, enrutamiento, estados, reasignación, control de acceso, dashboard, export CSV) | **25 OK / 0 FAIL** |
| `02-benchmark-modelos.txt` | 15 llamadas al modelo de lenguaje (3 modelos × 5 casos de triaje), con latencia, proveedor y validez de la salida JSON | **15/15 salidas válidas**; p95 = 1 400 ms con `gpt-oss-20b` |
| `03-verificacion-pii.txt` | 8 casos de anonimización de datos personales y 5 comprobaciones automáticas de no filtración | **0 filtraciones (5/5 PASA)** |
| `server.log` | Bitácora de arranque: conexión a MySQL, seed idempotente y escucha del servicio | Servicio operativo |

Scripts que producen esta evidencia:

```bash
cd backend
node test/e2e.mjs                # 25 aserciones de integración
node test/verificacion-pii.js     # filtro de PII y no filtración
node test/benchmark-modelos.js    # comparativa de latencia y calidad de modelos
```

## 02-capturas — Evidencia funcional de la interfaz

| Archivo | Contenido |
|---|---|
| `01-login.png` | Pantalla de inicio de sesión con las cuentas de demostración |
| `02-registro.png` | Formulario de registro de usuario |
| `03-crear-ticket.png` | Formulario de registro de solicitud de soporte |
| `03b-ticket-llenado.png` | Ticket con datos personales reales listo para enviar |
| `03c-ticket-creado-triaje.png` | **Resultado del triaje con LLM real**: Redes / CRÍTICA / FRUSTRADO / 90 % / prioridad 96 de 100 / SLA 2 h / especialista de Redes / motor `groq` |
| `04-bandeja-analista.png` | Bandeja de prioridades del analista ordenada por score |
| `05-dashboard.png` | Dashboard analítico con FRT, MTTR, cumplimiento de SLA y gráficos |
| `06-analistas.png` | Gestión de analistas por el administrador |
| `errores_consola.txt` | Errores de consola del recorrido: **0** |
| `03c-recorte-demo.png` | Recorte ampliado del resultado del triaje, usado en la presentación del proyecto |

## Identidad visual del producto

La interfaz aplica un **sistema de diseño propio**, construido sobre tokens CSS en
`frontend/src/styles.css`, con estética de «ticket / recibo`:

| Elemento | Criterio de diseño |
|---|---|
| Paleta | Tinta profunda (`#0B0D12`) sobre papel cálido (`#F1EFE9`), acento rojo de tinta (`#DC4326`) y verde operativo (`#177A52`) |
| Tipografía | Titulares en grotesca pesada con interletrado negativo; **datos en monoespaciada** con cifras tabulares |
| Tarjetas de ticket | Formato recibo: separadores punteados, filas etiqueta/valor y borde inferior perforado |
| Navegación | Barra de tinta con esquinas inferiores redondeadas y control segmentado tipo píldora |
| Estados | Etiquetas monoespaciadas en mayúsculas, con semántica de color por severidad y sentimiento |
| Gráficos | Paleta propia coherente con la interfaz, ejes y rejillas en gris tenue y cifras tabulares |

## 03-datos — Evidencia extraída de la base de datos

| Archivo | Contenido |
|---|---|
| `consulta-evidencia.sql` | Las 11 consultas de verificación utilizadas |
| `03-datos-reales.txt` | Resultado: totales, distribución por categoría/severidad/sentimiento, proveedor de IA, latencia del triaje, cola priorizada, evidencia de anonimización, bitácora de auditoría, carga por analista y cumplimiento de SLA |
| `ticket_prueba_groq.json` | Respuesta cruda del triaje ejecutado con el modelo de lenguaje |
| `tokens_por_rol.json` | Tokens de sesión generados para la captura de pantallas por rol |

## 04-despliegue — Ambientes

 reserved for the deployment evidence of the cloud environment (Docker Compose, HTTPS, CI/CD and uptime monitoring), scheduled for the next sprint.

---

## Defecto detectado por las pruebas y ya corregido

| ID | Descripción | Causa | Corrección | Evidencia |
|---|---|---|---|---|
| DEF-01 | La credencial `mi clave es abc123` **no** se enmascaraba y se enviaba a la API externa | La expresión regular de credenciales exigía los delimitadores `:` o `=` | Se amplió la expresión regular para cubrir la forma `... es <valor>` y se añadió la verificación automática de no filtración | `03-verificacion-pii.txt` |
| DEF-02 | El sistema siempre respondía con `fallback_local`, sin dar señal del fallo | El modelo configurado (`llama-3.3-70b-versatile`) ya no existe en Groq y el error se silenciaba | Se configuró `openai/gpt-oss-20b`, se normalizaron los enums devueltos por el LLM y ahora el motivo de la degradación se registra en la bitácora | `02-benchmark-modelos.txt`, `server.log` |

## Indicadores medidos

| Indicador | Meta | Resultado | Estado |
|---|---|---|---|
| Latencia de triaje (p95) | ≤ 3 000 ms | 1 400 ms | Cumple |
| Validez de la salida JSON del LLM | 100 % | 15 de 15 | Cumple |
| Filtración de datos personales | 0 | 0 | Cumple |
| Tickets persistidos sin pérdida | 100 % | 18 de 18 | Cumple |
| Exactitud de la categorización (5 casos) | ≥ 85 % | 100 % en la muestra | Cumple (muestra reducida) |
| Satisfacción del cliente (CSAT) | ≥ 4 de 5 | Pendiente de implementación | Pendiente |
| Carga concurrente (k6 / JMeter) | p95 ≤ 3 000 ms con 100 usuarios | Pendiente de medición | Pendiente |
| Usabilidad del dashboard (SUS) | ≥ 68 puntos | Pendiente de medición | Pendiente |
