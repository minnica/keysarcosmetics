# Relevo de implementación del MVP POS

> Documento vivo. Actualizar antes de cada commit de respaldo y antes de terminar una sesión.
> Rama: `feature/pos-frontend-clean`.
> Referencia visual inmutable: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Objetivo vigente: MVP online funcional para revisión del PO; RV8 y endurecimiento post-MVP están en backlog.

## Estado actual

- RV0–RV2: completadas.
- RV3: implementada; cierre formal pendiente sólo por B01 (texto histórico de Close Day).
- RV4: completada y documentada.
- RV5–RV7: pendientes.
- RV8: fuera del camino crítico; backlog post-MVP.
- RV9: pendiente, limitada a limpieza bloqueante y cierre de migraciones del MVP.
- RV10: pendiente, entrega acotada del MVP online al PO.

## RV4 ya implementado

- Contratos, tipos, cliente HTTP y persistencia para catálogo, clientes, proveedores, insumos, paquetes, vouchers, listas de precios, conceptos de inventario, pedidos de bodega, sucursales y configuración de ticket.
- Migración aditiva `20260909010000_pos_rv4_catalog_inventory_settings` y ambos schemas Prisma sincronizados.
- Autorizaciones de servidor para costos, clientes, vouchers, promociones, competencias y acciones sensibles de bodega.
- Edición de pedidos conserva folio, incrementa versión y registra revisiones append-only.
- Los diálogos conectados esperan la confirmación del servidor antes de cerrar o mostrar éxito.
- La carga inicial paraleliza consultas independientes.

## Evidencia aprobada hasta este punto

- Type-check: `@cosmetics/types`, `@cosmetics/api-client`, `@cosmetics/api` y `@cosmetics/pos` en PASS.
- API: lint en PASS; 25 archivos y 135 pruebas unitarias en PASS.
- PostgreSQL 16: reconstrucción limpia de 45 migraciones en PASS.
- Integración HTTP/BD: 18/18 pruebas habilitadas en PASS; una prueba de carga permanece tras su gate independiente.
- Build web POS en PASS.
- Manifiesto visual: 208 escenarios.
- Comparación RV4: 208/208 PASS con tolerancia de rasterizado `0.000027`; 206 exactas y dos diferencias de antialiasing de 34 y 20 píxeles. El baseline no se modificó.

## Pendientes inmediatos

1. Crear el commit de respaldo remoto de RV4.
2. Implementar el recorrido online MVP de RV5: venta, checkout, pagos, ticket y consulta/cancelación principal.
3. Implementar recorridos principales RV6 y RV7; ejecutar RV9 bloqueante y la verificación final RV10.

## Reglas para retomar

- No regenerar ni actualizar el baseline visual para aceptar diferencias del candidato.
- No reintroducir datos operativos mock ni confirmaciones antes de persistir.
- No borrar trabajo local ni reescribir migraciones aplicadas.
- Mantener fuera de alcance RV8, hardware, piloto productivo, escala extrema y pruebas offline; están documentados en el backlog del plan.
- Antes de cerrar otra sesión: actualizar este archivo, ejecutar las verificaciones posibles y hacer `git add`, `git commit` y `git push origin feature/pos-frontend-clean`.
