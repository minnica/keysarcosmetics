# RV2 — Restauración de presentación del POS

> Cierre: 2026-09-09  
> Referencia visual: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`  
> Base del worktree: `2dabbf24b1347ce0bdbd4ddc1b6fa07ed5696471`  
> Estado: completada; RV3–RV10 permanecen pendientes

## Resultado

RV2 recuperó la presentación aprobada sin reemplazar el runtime integrado. La
matriz canónica produjo 208/208 capturas y la comparación automatizada aprobó
208/208. De ellas, 205 son idénticas con tolerancia cero. Las tres restantes
contienen únicamente variación de antialiasing:

| Escenario                          | Píxeles distintos |     Total |  Proporción |
| ---------------------------------- | ----------------: | --------: | ----------: |
| `settings.clientes-y-procedencias` |                34 | 1,296,000 | 0.000026235 |
| `customers.seller-gate`            |                21 | 1,296,000 | 0.000016204 |
| `sale.deals.dialog`                |                11 | 1,296,000 | 0.000008488 |

El umbral de cierre fue `0.000027` (0.0027%). La inspección de los mapas de
diferencia localizó sólo bordes rasterizados de iconos y superficies, con
desviaciones de uno a tres niveles RGB. No se enmascararon regiones ni se
aceptaron cambios de geometría, copy, controles o composición.

La evidencia local quedó en `/tmp/pos-rv2-pass4` y el reporte aceptado en
`/tmp/pos-rv2-pass4-diff-accepted/comparison.json`. Son artefactos efímeros; el
baseline versionado de RV0 permanece intacto.

## Presentación recuperada

- Se restauraron los formularios aprobados de cambio de sucursal y cancelación
  de ticket, sin los campos de alias, PIN o motivo añadidos por la integración.
- Employees volvió a mostrar sólo los módulos imprimibles de la referencia.
- Diseño de ticket recuperó la altura y composición aprobadas; la acción extra
  para guardar la empresa comercial no forma parte del visual de `12fb804`.
- El `DatePicker` compartido recuperó una variante delimitada de locale español
  y las props opcionales de navegación rápida por mes/año. Checkout las usa
  para cumpleaños con el rango `1920`–año actual; el default compartido no
  cambió y los canarios de otras apps conservaron sus snapshots.
- Catálogo sigue dentro de Ventas; Sistema conserva su densidad, Salir no
  ejecuta Close Day y se mantuvieron los estados responsive de 1440, 920, 390,
  320 px y los límites adyacentes a breakpoints.
- `apps/pos/src/renderer/src/index.css` y los assets ya coincidían con la
  referencia y no fueron sustituidos. Tampoco se modificaron main, preload,
  IPC, aislamiento del renderer, almacenamiento offline ni rutas relativas, por
  lo que se conserva el mismo soporte HTTP/`file://` del runtime actual.

## Límite entre fixture y runtime

El build normal mantiene `VITE_POS_DATA_MODE=api` por defecto. El acceso de la
matriz sólo se habilita cuando coinciden las dos condiciones explícitas
`VITE_POS_DATA_MODE=mock` y `VITE_POS_VISUAL_FIXTURE=1`. La credencial master de
captura es efímera, llega por variable de entorno y no se guarda en el código,
la documentación ni el índice de capturas.

Las copias necesarias para reproducir la métrica tipográfica de los estados de
acceso también se inyectan únicamente en ese build aislado. En un build API se
muestran mensajes seguros y una falla de red/API no conmuta a mock. Después de
la captura se debe reconstruir siempre el build API normal.

## Operaciones no acreditadas por RV2

RV2 acredita presentación, no persistencia completa. En particular:

- el diálogo aprobado de cancelación no contiene la autorización delegada que
  exige hoy el endpoint; adaptar ese contrato sin añadir campos corresponde a
  RV5;
- el visual aprobado no contiene una acción independiente para persistir la
  identidad comercial; su contrato permanece disponible, pero su conexión se
  resolverá con el flujo aprobado en RV3/RV5;
- login, empleados/roles, jornada, ventas, pagos, membresías, inventario,
  reportes, offline y conciliación conservan sus fases funcionales RV3–RV8;
- My Account SaaS y Websites mantienen su presentación, pero continúan fuera
  del backend POS según RV1.

Ninguna de estas operaciones usa éxito ficticio ni fallback silencioso para
hacer pasar las capturas.

## Reproducción

La captura candidata requiere un build visual explícito y valores sintéticos
locales no versionados:

```bash
VITE_POS_DATA_MODE=mock \
VITE_POS_VISUAL_FIXTURE=1 \
VITE_POS_VISUAL_FIXTURE_MASTER_CODE="<codigo-efimero-de-4-digitos>" \
VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY="<copy-sintetico-del-baseline>" \
VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY="<copy-sintetico-del-baseline>" \
pnpm --filter @cosmetics/pos exec vite build

POS_VISUAL_MODE=candidate \
POS_VISUAL_ROOT="$PWD" \
POS_CANDIDATE_SHA="<sha-o-identificador-del-worktree>" \
POS_VISUAL_OUTPUT="<directorio-candidato-vacio>" \
POS_VISUAL_FIXTURE_MASTER_CODE="<mismo-codigo-efimero>" \
pnpm pos:visual:capture

POS_BASELINE_REFERENCE="$PWD/docs/artifacts/pos-visual-baseline/12fb8045cc264b565cb6e764d95ad7b2447fbfa1/reference" \
POS_BASELINE_CANDIDATE="<directorio-candidato>" \
POS_VISUAL_DIFF_OUTPUT="<directorio-diff-vacio>" \
POS_VISUAL_MAX_DIFF_RATIO=0.000027 \
pnpm pos:visual:compare
```

El comparador sigue usando tolerancia cero por defecto. RV2 corrigió el conteo
para obtener el número binario de píxeles distintos también con builds HDRI de
ImageMagick; el valor `AE` de HDRI representa magnitud de error de canal y no un
conteo entero fiable.

## Validaciones de cierre

Ejecutadas durante RV2:

- captura candidata: 208/208;
- comparación con tolerancia cero: 205 `PASS`, 3 variaciones medidas;
- comparación con `POS_VISUAL_MAX_DIFF_RATIO=0.000027`: 208/208 `PASS`;
- `pnpm --filter @cosmetics/pos type-check`;
- `pnpm --filter @cosmetics/ui type-check`;
- `pnpm test:ui`: 14 archivos y 40 pruebas aprobadas;
- `pnpm test:ui:visual`: build del testbed y 22/22 canarios aprobados en desktop
  y móvil;
- build Vite de renderer, main y preload en modo fixture y reconstrucción final
  en modo API.

El bundle API final no contiene la credencial efímera ni las copias sintéticas
usadas por la captura. Electron instalable, hardware físico, PostgreSQL y
recorridos operativos pertenecen a gates posteriores y no forman parte del
alcance de presentación de RV2.
