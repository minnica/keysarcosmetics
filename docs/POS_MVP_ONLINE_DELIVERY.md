# Entrega del MVP online POS para revisión del PO

> Fecha técnica: 2026-09-09.
> Rama: `feature/pos-frontend-clean`.
> Referencia visual inmutable: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Alcance: MVP online; no equivale a listo para producción.

## Resultado

El camino técnico RV0–RV7, RV9 bloqueante y RV10 está implementado. El renderer conserva las 25 pantallas, diez secciones de Settings, once reportes, diez vistas de Bodega y los estados/diálogos del diseño aprobado. El backend real cubre sesión y jornada, catálogo/clientas/inventario/configuración, venta y pagos, membresías/Agenda, reportes, caja y notificaciones.

RV5 retiró el diálogo adicional de autorización bajo mínimo y reutiliza el campo ya aprobado en Producto. Receipts, métodos de pago y X-Report validan sus campos master contra el servidor. La autorización de Receipts queda ligada a sesión/terminal, sirve para una sola revisión o cancelación y no puede reutilizarse. Checkout persiste nombre, apellido, cumpleaños, género, teléfono, WhatsApp, empresa, folio y sucursal de registro; Visa/Mastercard se envían mediante el ID vigente del catálogo.

Los diálogos de mutación esperan la respuesta del servidor antes de cerrar o anunciar éxito. Los estados sensibles se limpian al consumir el token o bloquear la sesión.

## Evidencia reproducible

- PostgreSQL 16 desechable: 45/45 migraciones desde una base vacía.
- Integración HTTP/BD: 18/18 pruebas habilitadas; una prueba de carga independiente omitida por su gate explícito.
- Recorrido RV5 dentro de la integración: servicio de $199.00, dos pagos de $100.00 y $99.00, alta completa de clienta, revisión y cancelación con autorización de Receipts, y `403` al reutilizarla.
- Unitarias API: 25 archivos, 135 pruebas.
- Type-check: types, API client, API y POS.
- API lint y build Vite del POS: `PASS`; se conserva la advertencia preexistente del chunk principal mayor a 500 kB.
- Matriz Chromium final: 208/208 `PASS` con Node 22.23.2, pnpm 10.0.0, Playwright 1.60.0 y Chromium 148.0.7778.96.
- Diferencias no nulas: 34 píxeles en Settings/clientes, 11 en diálogo de paquetes y 21 en gate de Customers; todas son antialiasing y el máximo `0.000026235` queda bajo `0.000027`.

La captura candidata quedó temporalmente en `/tmp/keysar-pos-mvp-final-candidate-2` y la comparación en `/tmp/keysar-pos-mvp-final-diff-2/comparison.json`. El baseline versionado no se regeneró ni modificó.

## Backend conservado, adaptado y retirado

- Conservado: motor autoritativo de cotización/tickets, idempotencia, ledger, compensación de cancelación, tarjetones, Agenda interna, datasets/exportaciones y notificaciones.
- Adaptado: identidad anidada de clienta en Checkout, traducción de redes de tarjeta, autorización genérica consumible de Receipts y accesos master online.
- Retirado: diálogo visual adicional de venta bajo mínimo, alias master duplicados en revisión/cancelación y validaciones de PIN locales que nunca podían funcionar en modo API.
- Sin migración nueva: los cambios son de contrato/renderer/servicio y utilizan las 45 migraciones aditivas existentes.

## Backlog post-MVP

- RV8 completa: offline/outbox, recuperación, conflictos, reinicio, instalable Electron, `file://`, impresión y hardware.
- Materialización de revisiones complejas mediante compensaciones completas en todas las proyecciones financieras, de inventario, membresías y Agenda. El MVP registra el evento de revisión, pero no afirma que el cambio ya esté proyectado.
- Administración avanzada de membresías (cambio de vendedor/estado y cierres) en cuanto Producto determine cómo exponerla sin inventar otra pantalla.
- Sandbox/webhooks externos de Agenda, incidencias y reintentos exhaustivos.
- Certificación con 10/20/30 sucursales, volumen extremo, datos productivos, piloto, rollback y aceptación operativa.
- B01: copy veraz de Close Day; B02/B03: My Account SaaS y Websites sin alcance backend aprobado.
- Limpieza no bloqueante, actualización desde snapshot productivo y rollback operacional de migraciones.

## Entrega

El artefacto se denomina **MVP online para revisión del PO**. El PO debe evaluar fidelidad y recorrido sobre esta misma referencia, no aprobar un diseño sustituto. La promoción a producción sigue condicionada a los gates post-MVP aplicables.
