# RV4 — Catálogo, clientes, inventario, bodega y configuración

> Fecha de cierre: 2026-09-09.
> Estado de partida: `1212b10eff0db1cef32c765183e2eee9c14ef83f`.
> Referencia visual: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Resultado: completada.

## Resultado funcional

RV4 conserva la presentación aprobada y sustituye los guardados locales del modo API por operaciones reales. Productos, servicios, membresías, taxonomías, publicación, imágenes, beneficios y las cuatro apariencias del catálogo digital usan los contratos canónicos. Los costos sólo se incluyen para una sesión Master o con `REPORTS_COSTS`.

El directorio de clientas conserva nombre, apellido, cumpleaños, género, teléfono/WhatsApp, procedencia, empresa, folio, sucursal y cartera. Búsqueda, alta, edición, baja lógica y carga masiva persisten; las acciones destructivas exigen una autorización Master nueva y consumible una sola vez.

Proveedores, insumos, existencias, conceptos, ajustes, pedidos de matriz/sucursal, resurtidos, recepción, cancelación y reversas se conectaron al ledger y a solicitudes canónicas. Editar un pedido `REQUESTED` mantiene su folio, comprueba la versión esperada y agrega una revisión append-only con actor y snapshot.

Settings persiste sucursales, métodos y catálogos de pago existentes, listas de precios MXN/USD, cortesías, vouchers, paquetes/promociones, competencias, empresa y diseño de ticket. Logo, ancho y campos impresos sobreviven recarga. My Account SaaS y Websites permanecen en B02/B03: no se fabricaron cobros ni integraciones externas.

## Persistencia y migración

La migración aditiva `20260909010000_pos_rv4_catalog_inventory_settings` incorpora campos visibles faltantes y agrega:

- asignación de paquetes a sucursales;
- conceptos configurables de inventario;
- revisiones versionadas de pedidos de bodega;
- precio USD en listas;
- logo/ancho de ticket y datos de catálogo/clienta requeridos por el visual.

Ambas copias de `schema.prisma` permanecen idénticas. PostgreSQL 16 desechable reconstruyó desde cero las 45 migraciones del repositorio.

## Seguridad e integridad

- Las sucursales solicitadas se validan contra el alcance efectivo antes de escribir.
- Los DTO omiten costos para sesiones sin permiso; el renderer no decide qué costo puede leer.
- Aprobaciones, recepción, cancelación, canje, publicación y administración de clientas usan autorizaciones ligadas a propósito, sesión y terminal.
- La segunda utilización de una autorización destructiva devuelve `403`.
- Los diálogos esperan la respuesta autoritativa antes de cerrar o mostrar éxito.
- Listas de precios y pedidos históricos conservan snapshots; los reemplazos no reescriben historia.

## Validación ejecutada

- `@cosmetics/types`, `@cosmetics/api-client`, `@cosmetics/api` y `@cosmetics/pos`: type-check `PASS`.
- API lint: `PASS`.
- API unitarias: 25 archivos, 135 pruebas `PASS`.
- Schemas Prisma: sincronizados.
- PostgreSQL 16: 45/45 migraciones aplicadas desde una base vacía.
- Integración HTTP/BD: 18/18 pruebas habilitadas `PASS`; una prueba de carga conserva su gate independiente y quedó omitida.
- POS: build web y Electron `PASS`; la advertencia de chunk mayor a 500 kB es preexistente y no bloquea el MVP.
- Visual Chromium: 208/208 `PASS`; 206 capturas exactas y dos diferencias de antialiasing de 34 y 20 píxeles bajo la tolerancia medida `0.000027`.

El baseline RV0 no se regeneró ni modificó. Las últimas correcciones sólo cambiaron callbacks/autorización y manejo de errores; no alteraron DOM, textos o estilos de los estados capturados.

## Decisiones y pendientes externos

- B05 queda resuelto con edición versionada append-only bajo el mismo folio.
- R05–R07 quedan retirados para el alcance operativo RV4; R09 queda resuelto en inventario y continúa para expediente/historial de ticket en RV5.
- B01, B02 y B03 siguen abiertos bajo sus decisiones existentes.
- RV8 y su certificación offline están fuera del MVP y pasan al backlog post-MVP; RV4 acredita operación online.
