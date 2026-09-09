# Baseline de restauración visual del POS

> Fase: RV0 de `PLAN_RESTAURACION_VISUAL_POS.md`.
> Fecha de auditoría: 8 de septiembre de 2026.
> Referencia visual única: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Estado: RV0 completada; baseline canónico de 208 capturas publicado y
> verificado.

## 1. Estado fijado

| Dato                   | Valor                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Rama de integración    | `feature/pos-frontend-clean`                                                              |
| HEAD inicial           | `e57b9ee9d48519cb762ca2d9294496abe93ce81e`                                                |
| HEAD final de la fase  | El mismo HEAD; RV0 queda como cambios de worktree hasta que el responsable cree el commit |
| Worktree inicial       | Limpio                                                                                    |
| Referencia             | `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`                                                |
| Padre de la referencia | `866ff7e5eda6ab79194181486f9c27566541391f`                                                |
| Árbol `apps/pos`       | `799db3868f280fb969f335536e53999e48e3445e`                                                |
| Árbol renderer         | `e1afb4e4e52f121d601d3c1f7c4bd6deb5daaf1a`                                                |
| Árbol `packages/ui`    | `1512e2df7ee16b99461c4b0f8df2fcb16e492b96`                                                |
| Fecha fija             | `2026-09-08T17:00:00.000Z` (11:00 en Ciudad de México)                                    |
| Datos                  | Mocks históricos del SHA, ejecutados sólo dentro de la extracción aislada                 |
| Persistencia/API       | Prohibidas por el arnés de referencia                                                     |

GitHub MCP confirmó el commit, su autoría, su padre y el cambio final de 30
líneas en `packages/ui/src/components/ui/date-picker.tsx`. El árbol remoto de
`apps/pos` coincide con los objetos Git locales. El backend candidato efectivo
al iniciar RV0 es `e57b9ee`; `6097a4b` queda sólo como el estado que se había
analizado al redactar el plan.

## 2. Runtime, fuentes y assets

La referencia declara Node `>=20`, pnpm `10.0.0`, React `18.3.1`, Vite
`5.4.21`, Tailwind `3.4.19`, TypeScript `5.9.3` y Electron `31.7.7` resuelto por
el lockfile. El candidato fija Node `22.23.2` y Electron `35.7.5`. La evidencia
canónica se produjo con Node `22.23.2` y pnpm `10.0.0`; no se mezcló con la
sesión inicial que usaba Node `24.18.0`.

El arnés usa Playwright `1.60.0`, Chromium, escala 1, locale `es-MX`, zona
`America/Mexico_City`, esquema claro y movimiento reducido. Los hashes de
Emofera, las cuatro variantes de Gilroy, el logo y los blobs esenciales se
encuentran en `apps/e2e/pos-visual/reference-fixture.json`. Esos hashes son
iguales entre referencia y candidato. Los productos usan los seis PNG
versionados en `apps/pos/public/products`.

La captura canónica utilizó Chromium for Testing `148.0.7778.96`, dato fijado
en `capture-index.json`. Google Chrome del sistema era `152.0.7977.82` y no se
usó. Electron de la referencia no dispone de binario instalado; su validación
queda para el gate posterior de runtime/hardware. El candidato deberá usar el
mismo Chromium y runtime al compararse con este baseline.

## 3. Fixture determinista y aislamiento

`apps/e2e/pos-visual/reference-fixture.json` fija reloj, zona, locale, semilla
de `Math.random`, UUID deterministas, escala y política de red. El capturador:

- sirve el build mediante interceptación de requests, sin abrir un puerto;
- aborta cualquier request que no apunte a `dist` o `public` de la extracción;
- no consulta API, base de datos ni servicios externos;
- descubre el acceso demostrativo dentro de la copia efímera y nunca lo guarda
  en fixtures, índices o documentación;
- vuelve deterministas fecha, hora, aleatoriedad y UUID;
- oculta visualmente textos que revelan claves históricas, conservando su caja
  y geometría para la comparación;
- escribe primero en `/tmp` y no publica capturas parciales.

Los mocks históricos son parte de la referencia renderizada, no un fallback del
candidato ni una fuente operativa. Para comparar el candidato se debe construir
explícitamente con fixtures equivalentes fuera de su compilación productiva.

## 4. Inventario de pantallas

El manifiesto asigna escenarios a los 25 `ScreenId` del SHA:

| Grupo             | Pantallas                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Acceso y jornada  | Login, error, conteo inicial, confirmación, conteo final, Close Day y autorización de cierre   |
| Ventas            | Ventas, Mis ventas, Receipts, Customers, Catálogo digital y Close Day                          |
| Relación y agenda | Citas y Membresías                                                                             |
| Inventario        | Inventory, Pedido sucursales, Almacén matriz, Proveedores, Movimientos, Paquetes y promociones |
| Analítica         | Dashboard, X-Report, Reports, Cash manager y Competition                                       |
| Sistema           | Employees, Websites, Data update, Settings, Clock In y My Account                              |

Además del estado inicial de cada pantalla, el manifiesto cubre:

- sidebar expandido, colapsado, fijado, salida de sesión y cambio de contexto;
- carrito vacío/poblado, producto, paquetes, descuento y Checkout;
- vista, edición, cancelación y medio de impresión de ticket;
- búsqueda sin resultados, consulta protegida y carga masiva de clientes;
- filtros de Citas, membresías y estados protegidos;
- cuatro temas, navegación, bloqueo y desbloqueo del Catálogo digital;
- alta de producto, pedidos, proveedores, movimientos y paquetes;
- acceso y diálogos de vendedores/roles en Employees;
- las diez secciones de Settings;
- los once reportes de Ventas, Mercancía, Empleados y Clientes;
- siete pestañas de bodega matriz y tres solicitudes de sucursal;
- estados de impresión, exportación, vacío, scroll y acceso protegido.

Las salidas no basadas sólo en screenshot también tienen identificador:
ticket térmico, Close Day, expediente de cliente, PDF/XLSX de reportes,
membresías e inventario, y PNG de cumpleaños. RV2 y las fases funcionales deben
comparar tanto su presentación como el contenido autoritativo.

El detalle ejecutable vive en
`apps/e2e/pos-visual/reference-scenarios.json`. La validación fail-closed exige
exactamente los 25 `ScreenId`, 10 secciones de Settings, 11 reportes y 10
pestañas de bodega.

## 5. Viewports y breakpoints

Cada pantalla se programa en la matriz base:

| Identificador | Tamaño     | Uso                                       |
| ------------- | ---------- | ----------------------------------------- |
| `desktop`     | `1440×900` | Escritorio obligatorio                    |
| `tablet`      | `920×900`  | Tablet obligatorio y breakpoint principal |
| `mobile`      | `390×844`  | Móvil obligatorio                         |
| `minimum`     | `320×844`  | Ancho mínimo obligatorio                  |

Las sondas adicionales cubren ambos lados de `920`, `720`, `640` y `420` px,
además de ambos lados de `760` px de alto. El CSS histórico contiene más
breakpoints locales (`1280`, `1180`, `1120`, `1100`, `1050`, `1000`, `980`,
`900`, `880`, `820`, `800`, `780`, `760`, `700`, `650`, `620`, `560`, `520`,
`480`, `430`, `400` y `390`). Se asignaron las sondas de geometría de mayor
riesgo; un componente que cambie en RV2 debe añadir los pares adyacentes que le
correspondan antes de cerrar esa fase.

No se conocen todavía los anchos físicos de las terminales piloto. Deben
agregarse al manifiesto en cuanto Operación los entregue; no se sustituyen por
una suposición.

## 6. Interacciones y tiempos

El manifiesto conserva recorridos y tiempos verificables:

| Interacción                   | Tiempo histórico a observar | Evidencia                           |
| ----------------------------- | --------------------------: | ----------------------------------- |
| Colapsar sidebar              |                    `220 ms` | geometría, foco e iconos            |
| Auto-colapsar sidebar         |                      `20 s` | estado antes/después                |
| Cambio de página del catálogo |                    `560 ms` | inicio, mitad y fin                 |
| Apertura de diálogo           |                    `200 ms` | overlay, foco y retorno             |
| Bloqueo de módulo master      |                     `180 s` | acceso revocado sin perder pantalla |
| Actualización automática      |                     `300 s` | contador y estado actualizado       |

Las capturas deshabilitan movimiento sólo después de cargar la vista. Las
pruebas temporales se ejecutan aparte con el reloj manual del fixture; una
captura congelada no acredita animación, foco, teclado, scroll ni bloqueo.

## 7. Procedimiento reproducible

Preparar la referencia sin tocar el worktree actual:

```bash
reference_dir="$(mktemp -d /tmp/keysar-pos-12fb804-XXXXXX)"
git archive 12fb8045cc264b565cb6e764d95ad7b2447fbfa1 | tar -x -C "$reference_dir"
pnpm --dir "$reference_dir" install --offline --frozen-lockfile
pnpm --dir "$reference_dir" --filter @cosmetics/pos type-check
pnpm --dir "$reference_dir" --filter @cosmetics/pos exec vite build
```

Validar el inventario sin abrir un navegador:

```bash
pnpm pos:visual:manifest
```

Capturar la referencia en un host que permita Chromium:

```bash
POS_VISUAL_MODE=reference \
POS_VISUAL_ROOT="$reference_dir" \
POS_VISUAL_OUTPUT="$PWD/docs/artifacts/pos-visual-baseline/12fb8045cc264b565cb6e764d95ad7b2447fbfa1/reference" \
pnpm pos:visual:capture
```

Si la extracción compilada permanece bajo `/tmp/keysar-pos-12fb804-*` y se usa
Node `22.23.2`, el atajo detecta la copia más reciente y configura las rutas:

```bash
pnpm pos:visual:capture:reference
```

El capturador valida además el SHA-256 agregado de los 110 archivos fuente de
`apps/pos`, `packages/ui` y la configuración raíz relevante; rehúsa una raíz
alterada y rehúsa sobrescribir una salida con contenido. Para actualizar la referencia hay que
eliminar conscientemente el directorio anterior después de revisar por qué se
necesita otra captura; nunca apuntar el candidato al directorio `reference`.

Capturar y comparar un candidato ya compilado:

```bash
POS_VISUAL_MODE=candidate \
POS_VISUAL_ROOT="$PWD" \
POS_CANDIDATE_SHA="$(git rev-parse HEAD)" \
POS_VISUAL_OUTPUT="$PWD/docs/artifacts/pos-visual-baseline/candidate/$(git rev-parse HEAD)" \
POS_VISUAL_FIXTURE_MASTER_CODE="<codigo-efimero-usado-al-compilar>" \
pnpm pos:visual:capture

POS_BASELINE_REFERENCE="$PWD/docs/artifacts/pos-visual-baseline/12fb8045cc264b565cb6e764d95ad7b2447fbfa1/reference" \
POS_BASELINE_CANDIDATE="$PWD/docs/artifacts/pos-visual-baseline/candidate/$(git rev-parse HEAD)" \
POS_VISUAL_DIFF_OUTPUT="$PWD/docs/artifacts/pos-visual-baseline/diff/$(git rev-parse HEAD)" \
pnpm pos:visual:compare
```

La comparación requiere ImageMagick, exige el mismo navegador y versión,
Playwright, Node, gestor de paquetes, escala, fecha, locale, zona, esquema,
movimiento reducido y hashes de fixture/manifiesto; después usa píxeles
diferentes binarios, rechaza un directorio de diffs con contenido y aplica
tolerancia cero por default. El conteo binario evita confundir la magnitud `AE`
de builds HDRI de ImageMagick con un número entero de píxeles. Una tolerancia
distinta sólo puede registrar variación de rasterizado medida; no autoriza
geometría, texto, estilos o controles diferentes. RV2 documenta su build
aislado, resultado y umbral en `docs/POS_RV2_PRESENTATION_RESTORATION.md`.

## 8. Evidencia ejecutada en RV0

La extracción temporal usada para la captura final fue
`/tmp/keysar-pos-12fb804-QhzgOp`. Sobre esa copia se ejecutaron con resultado
correcto:

```text
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos exec vite build
```

Vite transformó 3054 módulos y generó renderer, main y preload. El único aviso
fue el tamaño de chunks ya existente; no hubo corrección técnica ni visual.
Después se ejecutó:

```text
pnpm pos:visual:capture:reference
[208/208] breakpoint.short.below--short-below.png
Evidencia completa: docs/artifacts/pos-visual-baseline/12fb8045cc264b565cb6e764d95ad7b2447fbfa1/reference
```

El directorio publicado contiene 208 PNG más `capture-index.json` (69 MiB). El
índice registra Chromium `148.0.7778.96`, Playwright `1.60.0`, Node `22.23.2`,
pnpm `10.0.0`, fecha fija, locale, zona, escala y los 208 hashes individuales.
La verificación posterior confirmó 208 nombres únicos y cero discrepancias de
SHA-256; las dimensiones de cada archivo coinciden con el viewport registrado.
También se revisó visualmente una muestra transversal de acceso, conteos,
Ventas, Dashboard móvil, Inventory, solicitudes de sucursal, Receipts,
Catálogo, Employees, Close Day y el breakpoint de `420px`.
Una autocomparación controlada del conjunto mediante
`pnpm pos:visual:compare`, con tolerancia cero, informó 208 comparaciones
aprobadas y ninguna diferencia; esto valida también el recorrido del comparador.

Los intentos iniciales en la sesión restringida fallaron antes de crear una
página (`sandbox_host_linux`/`setsockopt`: `Operation not permitted`) y no
publicaron evidencia parcial. El reinicio con Full Access eliminó ese bloqueo.
Electron sigue sin binario local, pero no fue el motor elegido para el baseline
canónico de RV0.

## 9. Estado de cierre y pendientes

RV0 deja implementados el congelamiento criptográfico de los 110 archivos de
fuente relevantes, fixture, inventario de 208 capturas, matriz responsive,
recorridos, tiempos, capturador atómico y
comparador fail-closed. Cada pantalla objetivo tiene escenario asignado y el
snapshot compila sin modificación.

La fase queda **completada**. RV2 puede capturar el candidato con las mismas
condiciones y compararlo por píxel contra este conjunto. La captura Electron y
los tamaños físicos de terminales se incorporarán en sus gates posteriores
cuando estén disponibles; son ampliaciones de validación de runtime/hardware y
no invalidan el baseline Chromium aprobado en RV0.
