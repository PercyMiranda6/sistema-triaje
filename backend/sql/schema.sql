CREATE DATABASE IF NOT EXISTS sistema_triaje
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE sistema_triaje;

-- ----------------------------------------------------------
-- TABLA: usuarios
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('cliente','analista','administrador') NOT NULL DEFAULT 'cliente',
  especialidad ENUM('Hardware','Software','Redes','Accesos','Base de Datos') NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_especialidad (especialidad),
  KEY idx_rol (rol)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- TABLA: tickets
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  asunto VARCHAR(200) NOT NULL,
  descripcion_original TEXT NOT NULL,
  descripcion_anonimizada TEXT NULL,
  categoria ENUM('Hardware','Software','Redes','Accesos','Base de Datos') NULL,
  severidad ENUM('Baja','Media','Alta','Critica') NULL,
  sentimiento ENUM('Positivo','Neutro','Frustrado') NULL,
  score_frustracion DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  priority_score INT NOT NULL DEFAULT 0,
  proveedor_ia ENUM('groq','gemini','fallback_local') NULL,
  estado ENUM('nuevo','asignado','en_proceso','resuelto','cerrado','rechazado') NOT NULL DEFAULT 'nuevo',
  analista_id INT NULL,
  motivo_reasignacion VARCHAR(255) NULL,
  sla_horas INT NULL,
  creado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  primer_respuesta_el TIMESTAMP NULL,
  resuelto_el TIMESTAMP NULL,
  cerrado_el TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_estado (estado),
  KEY idx_severidad (severidad),
  KEY idx_cliente (cliente_id),
  KEY idx_analista (analista_id),
  KEY idx_creado (creado_el),
  CONSTRAINT fk_ticket_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ticket_analista FOREIGN KEY (analista_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- TABLA: triage_logs (auditoria del proceso PLN)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS triage_logs (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  proveedor ENUM('groq','gemini','fallback_local') NOT NULL,
  texto_enviado TEXT NOT NULL,
  respuesta_ia TEXT NULL,
  latencia_ms INT NOT NULL DEFAULT 0,
  exito TINYINT(1) NOT NULL DEFAULT 1,
  creado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_log_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- TABLA: auditoria (trazabilidad de acciones)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NULL,
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NULL,
  creado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_aud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- TABLA: encuesta_csat (CSAT por ticket cerrado/resuelto)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS encuesta_csat (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  cliente_id INT NOT NULL,
  puntuacion TINYINT UNSIGNED NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT NULL,
  fecha_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_una_encuesta_por_ticket (ticket_id, cliente_id),
  CONSTRAINT fk_csat_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_csat_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- TABLA: respuesta_nps (NPS por cliente y periodo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS respuesta_nps (
  id INT NOT NULL AUTO_INCREMENT,
  cliente_id INT NOT NULL,
  puntuacion TINYINT UNSIGNED NOT NULL CHECK (puntuacion BETWEEN 0 AND 10),
  comentario TEXT NULL,
  fecha_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  periodo VARCHAR(20) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nps_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;