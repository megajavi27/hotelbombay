SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `app` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `app`;
CREATE DATABASE IF NOT EXISTS `hotelbombay` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `hotelbombay`;

CREATE TABLE `cliente` (
  `id_cliente` int NOT NULL,
  `id_usuario` int NOT NULL,
  `nacionalidad` varchar(60) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `empleado` (
  `id_empleado` int NOT NULL,
  `id_usuario` int NOT NULL,
  `id_perfil` int DEFAULT NULL,
  `fecha_contratacion` date DEFAULT NULL,
  `salario` decimal(10,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `habitacion` (
  `id_habitacion` int NOT NULL,
  `numero` varchar(10) NOT NULL,
  `piso` int DEFAULT NULL,
  `id_tipos_habitacion` int NOT NULL,
  `estado` enum('DISPONIBLE','OCUPADA','MANTENIMIENTO','LIMPIEZA') NOT NULL DEFAULT 'DISPONIBLE',
  `observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `habitacion_imagen` (
  `id_imagen` int NOT NULL,
  `id_habitacion` int NOT NULL,
  `url` varchar(500) NOT NULL,
  `titulo` varchar(150) DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `es_portada` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pago` (
  `id_pago` int NOT NULL,
  `id_reserva` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TARJETA_CREDITO','TARJETA_DEBITO','TRANSFERENCIA','PAYPAL') DEFAULT NULL,
  `estado` enum('PENDIENTE','PENDIENTE_REVISION','COMPLETADO','RECHAZADO','REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
  `referencia` varchar(100) DEFAULT NULL,
  `comprobante_url` varchar(500) DEFAULT NULL,
  `motivo_rechazo` varchar(500) DEFAULT NULL,
  `fecha_pago` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset` (
  `id_password_reset` int NOT NULL,
  `id_usuario` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expira` datetime NOT NULL,
  `usado_en` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `perfil` (
  `id_perfil` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recomendacion_ia` (
  `id_recomendacion_ia` int NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `categoria` enum('TURISTICO','RESTAURANTE','ENTRETENIMIENTO','TRANSPORTE','COMPRAS','OTRO') NOT NULL DEFAULT 'OTRO',
  `descripcion` text,
  `ubicacion` varchar(255) DEFAULT NULL,
  `distancia_km` decimal(5,2) DEFAULT NULL,
  `calificacion` decimal(2,1) DEFAULT '0.0',
  `imagen_url` varchar(500) DEFAULT NULL,
  `id_empleado` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reserva` (
  `id_reserva` int NOT NULL,
  `id_cliente` int NOT NULL,
  `id_habitacion` int NOT NULL,
  `id_empleado` int DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `numero_huespedes` int NOT NULL DEFAULT '1',
  `estado` enum('PENDIENTE','CONFIRMADA','CHECKIN','CHECKOUT','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `observaciones` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tipos_habitacion` (
  `id_tipos_habitacion` int NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` text,
  `precio_noche` decimal(10,2) NOT NULL,
  `capacidad_maxima` int NOT NULL DEFAULT '2',
  `servicios` varchar(500) DEFAULT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `tipo_documento` enum('CEDULA','PASAPORTE','RUC') NOT NULL DEFAULT 'CEDULA',
  `numero_documento` varchar(20) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `visible` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


ALTER TABLE `cliente`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `id_usuario` (`id_usuario`);

ALTER TABLE `empleado`
  ADD PRIMARY KEY (`id_empleado`),
  ADD UNIQUE KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_empleado_perfil` (`id_perfil`);

ALTER TABLE `habitacion`
  ADD PRIMARY KEY (`id_habitacion`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_habitacion_tipo` (`id_tipos_habitacion`),
  ADD KEY `idx_habitacion_estado` (`estado`);

ALTER TABLE `habitacion_imagen`
  ADD PRIMARY KEY (`id_imagen`),
  ADD KEY `idx_habitacion_imagen_hab` (`id_habitacion`,`orden`);

ALTER TABLE `pago`
  ADD PRIMARY KEY (`id_pago`),
  ADD KEY `fk_pago_reserva` (`id_reserva`);

ALTER TABLE `password_reset`
  ADD PRIMARY KEY (`id_password_reset`),
  ADD UNIQUE KEY `uk_password_reset_token` (`token_hash`),
  ADD KEY `idx_password_reset_usuario` (`id_usuario`);

ALTER TABLE `perfil`
  ADD PRIMARY KEY (`id_perfil`),
  ADD UNIQUE KEY `nombre` (`nombre`);

ALTER TABLE `recomendacion_ia`
  ADD PRIMARY KEY (`id_recomendacion_ia`),
  ADD KEY `fk_recomendacion_empleado` (`id_empleado`),
  ADD KEY `idx_recomendacion_categoria` (`categoria`);

ALTER TABLE `reserva`
  ADD PRIMARY KEY (`id_reserva`),
  ADD KEY `fk_reserva_cliente` (`id_cliente`),
  ADD KEY `fk_reserva_habitacion` (`id_habitacion`),
  ADD KEY `fk_reserva_empleado` (`id_empleado`),
  ADD KEY `idx_reserva_fechas` (`fecha_inicio`,`fecha_fin`),
  ADD KEY `idx_reserva_estado` (`estado`);

ALTER TABLE `tipos_habitacion`
  ADD PRIMARY KEY (`id_tipos_habitacion`),
  ADD UNIQUE KEY `nombre` (`nombre`);

ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`),
  ADD KEY `idx_usuario_visible` (`visible`);


ALTER TABLE `cliente`
  MODIFY `id_cliente` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `empleado`
  MODIFY `id_empleado` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `habitacion`
  MODIFY `id_habitacion` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `habitacion_imagen`
  MODIFY `id_imagen` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `pago`
  MODIFY `id_pago` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `password_reset`
  MODIFY `id_password_reset` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `perfil`
  MODIFY `id_perfil` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `recomendacion_ia`
  MODIFY `id_recomendacion_ia` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `reserva`
  MODIFY `id_reserva` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `tipos_habitacion`
  MODIFY `id_tipos_habitacion` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `usuario`
  MODIFY `id_usuario` int NOT NULL AUTO_INCREMENT;


ALTER TABLE `cliente`
  ADD CONSTRAINT `fk_cliente_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `empleado`
  ADD CONSTRAINT `fk_empleado_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_empleado_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `habitacion`
  ADD CONSTRAINT `fk_habitacion_tipo` FOREIGN KEY (`id_tipos_habitacion`) REFERENCES `tipos_habitacion` (`id_tipos_habitacion`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `habitacion_imagen`
  ADD CONSTRAINT `fk_habitacion_imagen_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitacion` (`id_habitacion`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pago`
  ADD CONSTRAINT `fk_pago_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reserva` (`id_reserva`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `password_reset`
  ADD CONSTRAINT `fk_password_reset_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `recomendacion_ia`
  ADD CONSTRAINT `fk_recomendacion_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `reserva`
  ADD CONSTRAINT `fk_reserva_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reserva_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reserva_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitacion` (`id_habitacion`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
