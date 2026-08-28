# Handoff de UI hacia backend

Este documento registra únicamente las necesidades descubiertas durante el prototipo. No autoriza
cambios en API, Prisma, base de datos, autenticación ni infraestructura.

Agrega una sección por flujo siguiendo la plantilla de `PROTOTYPE_BRIEF.md`. Deja explícitas las
dudas: el prototipo puede representar una hipótesis visual sin convertirla todavía en una regla de
negocio definitiva.

## Decisiones transversales

- El prototipo recupera la experiencia funcional aprobada y mantiene toda la información únicamente
  en estado React durante la sesión.
- La persistencia futura necesitará contratos para empleados, periodos, corridas, ventas, esquemas,
  movimientos, préstamos, viáticos, recibos, autorizaciones y costos por sucursal.
- La autenticación y los permisos actuales son sólo representaciones visuales; cualquier integración
  futura deberá preservar el aislamiento de la información personal y los permisos master.
- Ninguna de estas necesidades autoriza cambios en backend o base de datos durante el prototipo.
