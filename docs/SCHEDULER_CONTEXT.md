# Contexto y fases de Keysar Scheduler

Este documento concentra el alcance funcional acordado a partir de las capturas de referencia de AgendaPro. Es complemento de `AGENTS.md`; las reglas técnicas de ese archivo tienen prioridad.

## Estado actual

- La agenda principal (`/`) funciona en fase local/mock.
- La ruta `/administracion` contiene el shell visible del menú administrativo completo, separado en Información básica y Opciones avanzadas; `Planes` queda fuera.
- El menú administrativo completo funciona en local/mock: Locales, Profesionales, Grupos personalizados, Servicios, Clases, Paquetes, Adicionales, Comisiones, Recursos, Encuestas, Consentimientos, WhatsApp y Gift cards.
- Los listados, formularios, filtros, estados, modales, confirmaciones y feedback están implementados en `AdministrationWorkspace.tsx` y comparten catálogos desde `mock-administration-data.ts`.
- Todavía no hay persistencia real para estos catálogos desde el scheduler.
- No se modifica backend, Prisma ni variables de entorno en esta etapa.
- La interfaz debe ser responsive desde el inicio: navegación compacta en móvil, tarjetas apiladas, formularios de pantalla completa y tablas que se conviertan en bloques legibles.

## Servicios: estado del trabajo actual

El catálogo de Servicios se mantiene en estado local/mock y ya cubre los flujos visuales principales solicitados:

- Pestañas de Servicios, Clases, Paquetes y Adicionales.
- Servicios normales y servicios con sesiones, con categorías y selección de profesionales.
- Clases con capacidad, servicio destacado y configuración de horario por día.
- Paquetes con selección de servicios, precio individual por servicio y cálculo del total.
- Adicionales con precio, duración, categoría y profesionales.
- Categorías creadas desde los modales y visualización por grupos.
- Sitio web con agenda en línea, duración visible, descripción, nombres alternativos, imágenes y pago en línea.
- Opciones avanzadas con videoconferencia, domicilio, IVA, clientes simultáneos, comisión por porcentaje o moneda, recursos y horario especial desplegable.
- Carga masiva de precios con edición manual, menú de descargas y pestaña visual para subir plantilla `.xlsx`.

La carga y descarga masiva aún no procesa archivos reales ni persiste información. La prioridad inmediata es terminar la revisión visual y de interacción de `Opciones avanzadas`; la conexión con API y Prisma queda para la fase de persistencia.

## Alcance administrativo

| Módulo | Alcance funcional | Estado de definición |
|---|---|---|
| Locales | Datos básicos, sitio web, horario semanal, jornada especial, activar/desactivar | Definido por capturas |
| Profesionales | Datos básicos, servicios, horario, descansos, perfil, grupos personalizados | Definido por capturas |
| Servicios | Servicios, clases, paquetes, adicionales, categorías, precios masivos | Definido por capturas |
| Comisiones | Por profesional, servicio/producto y valor por defecto; porcentaje o monto | Definido por capturas |
| Recursos | Recursos generales y recursos con horario, asignación a servicios y locales | Definido por capturas |
| Encuestas | Encuestas, preguntas de apreciación/comentario y asociación a servicios | Parcial; falta flujo de resultados |
| Consentimientos | Nombre y documento PDF | Parcial; falta flujo operativo |
| WhatsApp | Plantillas, mensajes personalizados, variables y vista previa | Definido por capturas |
| Gift Cards | Gift card de servicio o monto, vencimiento, diseño, borrador/activar | Definido por capturas |
| Planes | No se implementa en este proyecto | Fuera de alcance |

## Fases de construcción

### Fase 0 — Contexto y base visual

- Consolidar el mapa de navegación y las decisiones funcionales.
- Mantener la identidad Keysar, componentes de `@cosmetics/ui` y patrones de feedback.
- Validar accesibilidad, estados vacíos, loading, errores y responsive.

### Fase 1 — Shell administrativo

- Navegación visible desde la agenda.
- Pantalla `/administracion` con los módulos definidos.
- Definir rutas, layouts y componentes compartidos sin inventar todavía datos persistentes.

Estado: completada en modo local/mock. Los flujos base de Servicios están implementados; la prioridad actual es terminar `Opciones avanzadas`, validar todos los modales y cerrar el acabado visual antes de conectar backend.

### Fase 2 — Catálogos base

- Implementar Locales, Profesionales y Servicios.
- Prioridad: listado, búsqueda/filtros, crear, editar, activar/desactivar y confirmaciones.
- Modelar la relación correcta: los locales viven en Locales; los profesionales son personas reales y no sustitutos de sucursales.

Estado: implementada en local/mock junto con los módulos administrativos posteriores. Los flujos de Servicios se detallan en la sección anterior.

### Fase 3 — Reglas operativas

- Implementar Comisiones, Recursos y Gift Cards.
- Integrar horarios, descansos, recursos, categorías y restricciones de reserva.
- Cubrir flujos alternativos de gift card de servicio y gift card de monto.

Estado: implementada en local/mock.

### Fase 4 — Comunicación y documentos

- Implementar plantillas y mensajes personalizados de WhatsApp.
- Implementar Consentimientos como catálogo de documentos.
- Definir antes de construir el flujo de resultados de Encuestas y el uso de Consentimientos dentro de una cita.

Estado: catálogo y configuración implementados en local/mock; resultados y firma siguen fuera de alcance.

### Fase 5 — Persistencia y conexión con agenda

- Modelar y validar `Cliente`, `Servicio`, `Cita`, `BloqueHorario` y las entidades administrativas necesarias.
- Crear endpoints `/api/scheduler` y conectar el frontend sin romper el mock actual.
- Aplicar permisos por rol y reglas de sucursal.

Estado: pendiente. No iniciar hasta cerrar el acabado visual y recibir autorización explícita para modificar backend/Prisma.

### Fase 6 — Calidad y operación

- Pruebas de flujos completos, responsive y accesibilidad.
- Estados de error/reintento y protección contra cambios destructivos.
- Preparar despliegue cuando el comportamiento local esté validado.

## Criterios para cada módulo

Antes de marcar un módulo como terminado deben existir: listado, estado vacío, búsqueda o filtro cuando aplique, alta, edición, validaciones, confirmación para eliminar/desactivar, feedback de éxito/error, comportamiento móvil y documentación de las decisiones no visibles en las capturas.
