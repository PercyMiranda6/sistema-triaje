# 📄 ESPECIFICACIONES TÉCNICAS DEL SOFTWARE (Tech Spec)
**Proyecto:** Sistema Inteligente de Triaje Automático y Análisis de Sentimiento basado en PLN para Soporte TI
**Stack Tecnológico:** Fullstack Web (Angular / Node.js Express) + API LLM (Google Gemini / Groq Cloud) + MySQL
**Autor:** Percy Antonio Miranda Montenegro
**Curso:** Capstone Project - ISC (UPN 2026-2)

---

## 1. RESUMEN DEL SISTEMA Y DIAGNÓSTICO
El sistema aborda las ineficiencias críticas detectadas en el servicio de mesa de ayuda TI:
* **Diagnóstico de Línea Base:**
  * **FRT (First Response Time):** Demoras elevadas causadas por lectura y asignación manual.
  * **MTTR (Mean Time to Resolve):** Incrementado por reasignaciones múltiples ("rebotes") entre departamentos.
  * **Churn Rate / CSAT:** Baja satisfacción del cliente asociada a cuellos de botella e insatisfacción no detectada.
* **Evidencias del Problema:**
  * **Evidencia 1:** Registro de correos/chats con tiempos de espera superiores a 48 horas.
  * **Evidencia 2:** Reporte de derivaciones e incorrectas asignaciones de tickets por falta de contexto técnico.
  * **Evidencia 3:** Indicadores trimestrales de CSAT en niveles críticos por falta de priorización rápida.

---

## 2. ARQUITECTURA GENERAL DEL SISTEMA

### 2.1 Visión General
El software opera bajo una **Arquitectura Cliente-Servidor Desacoplada (RESTful)**:
1. **Frontend (SPA en Angular):** Interfaz reactiva basada en componentes y arquitectura modular/standalone para clientes, analistas de soporte y supervisores.
2. **Backend (Node.js + Express API):** Motor de lógica de negocio, enrutamiento, seguridad y middleware de privacidad.
3. **Módulo de Inteligencia Artificial / PLN (Google Gemini / Groq API):** Motor externo para análisis semántico, extracción de categoría y nivel de frustración.
4. **Base de Datos Relacional (MySQL):** Persistencia de usuarios, tickets, métricas de SLA e historial de atención.

## 3. REQUERIMIENTOS FUNCIONALES Y NO FUNCIONALES

### 3.1 Requerimientos Funcionales (RF)
* **RF01 - Autenticación y Autorización:** Autenticación segura mediante Tokens JWT con roles definidos (Cliente, Analista, Administrador).
* **RF02 - Registro de Ticket:** Captura del asunto y descripción detallada en texto libre redactado por el usuario.
* **RF03 - Middleware de Anonimización (Filtro PII):** Detección y enmascaramiento automático de Datos de Identificación Personal (DNI, nombres, correos, tarjetas, credenciales) previo al envío a la API de IA.
* **RF04 - Triaje Automático y Análisis de Sentimiento:** Procesamiento con PLN que retorna en JSON:
  * Categoría técnica (Infraestructura, Software, Redes, Accesos, Hardware).
  * Severidad/Urgencia estimada (Alta, Media, Baja).
  * Nivel de Frustración / Sentimiento del usuario (Positivo, Neutro, Frustrado/Molesto).
* **RF05 - Cálculo de Prioridad Dinámica:** Algoritmo que calcula un *Priority Score* combinando la severidad del fallo y el grado de insatisfacción del cliente.
* **RF06 - Enrutamiento Inteligente:** Asignación automática del ticket al analista idóneo según especialidad y carga de trabajo actual.
* **RF07 - Bandeja de Gestión con Alertas Emocionales:** Interfaz en Angular con código de colores según el nivel de urgencia/frustración y reasignación manual en caso de falsos positivos.
* **RF08 - Dashboard Analítico de Métricas:** Visualización en tiempo real de indicadores clave: FRT, MTTR, distribución de sentimiento y cumplimiento de SLAs mediante librerías de gráficos integradas en Angular.

### 3.2 Requerimientos No Funcionales (RNF)
* **RNF01 - Tiempo de Respuesta:** Latencia total del procesamiento del triaje mediante PLN $\le 3$ segundos por solicitud.
* **RNF02 - Seguridad y Cumplimiento Normativo:** Cifrado en tránsito (HTTPS/TLS) y cumplimiento de la Ley N° 29733 (Protección de Datos Personales en Perú) mediante filtrado de PII.
* **RNF03 - Disponibilidad y Fallback:** Disponibilidad del 99%. Mecanismo *fallback* por reglas de palabras clave locales en caso de caída de la API de IA externa.
* **RNF04 - Usabilidad:** Interfaz reactiva adaptativa (*Responsive Design*) orientada a reducir la carga cognitiva del personal técnico.

---

## 4. DISEÑO DEL MÓDULO DE PLN E INGENIERÍA DE PROMPTS

### 4.1 Estructura del Prompt Enviado al LLM
El Backend envía el texto sanitizado al LLM exigiendo una respuesta strictly en formato JSON válido:

```json
{
  "system_prompt": "Actúa como un experto en triaje de soporte TI. Analiza el siguiente texto de un ticket de soporte. Debes clasificar la categoría técnica, determinar la severidad del problema y evaluar la polaridad emocional/sentimiento del usuario.",
  "input_text": "[TEXTO_DEL_TICKET_ANONIMIZADO]",
  "expected_output_format": {
    "categoria": "Hardware | Software | Redes | Accesos | Base de Datos",
    "severidad": "Baja | Media | Alta | Critica",
    "sentimiento": "Positivo | Neutro | Frustrado",
    "score_frustracion": "Numero float de 0.0 (Calmo) a 1.0 (Muy Frustrado)",
    "resumen_ejecutivo": "Breve sintesis del problema en 15 palabras"
  }
}