# Plan de pruebas para UI compartida y regresiones E2E

> Estado: pendiente de implementación  
> Fecha del plan: 2026-08-25  
> Propósito: entregar a otra sesión/modelo un plan ejecutable para impedir que un cambio en UI compartida rompa Envelope, Payroll u otra aplicación sin ser detectado antes de producción.

## 1. Instrucciones para retomar este plan

Antes de implementar:

1. Leer `CLAUDE.md` completo y revisar el estado actual del repositorio; este documento describe el estado observado el 25 de agosto de 2026 y el código puede haber cambiado.
2. Partir de la versión más reciente de `develop` y trabajar mediante una rama y un pull request. No hacer push directo a `develop` ni a `master`.
3. Confirmar que el árbol de trabajo esté limpio y preservar cualquier cambio ajeno a esta tarea.
4. Implementar el plan por fases y preferentemente en PR pequeños. No mezclar este trabajo con cambios funcionales, migraciones de BD o modificaciones del backend.
5. No ejecutar pruebas contra producción que escriban o eliminen datos.
6. Actualizar `CLAUDE.md`, `FLUJO_TRABAJO_Y_DESPLIEGUE.md` y `docs/RELEASE_RUNBOOK.md` cuando la implementación cambie comandos, checks obligatorios o el flujo de release.
7. No marcar la tarea como terminada hasta ejecutar la prueba de mutación controlada descrita en los criterios de aceptación.

## 2. Objetivo

Construir una red de seguridad que detecte, antes de producción:

- regresiones de comportamiento en componentes de `@cosmetics/ui`;
- regresiones visuales en componentes compartidos de alto riesgo;
- incompatibilidades provocadas por dependencias como Radix, Base UI, `react-day-picker` o TanStack Table;
- fallas de integración entre la UI compartida y Envelope/Payroll;
- fallas funcionales en los recorridos críticos de las aplicaciones;
- errores que los type-checks, builds y smoke tests actuales no pueden detectar.

El incidente de referencia es el cambio de Scheduler que modificó un selector de fecha compartido y rompió Envelope y Payroll en producción. El plan debe proteger no solo el DatePicker, sino cualquier superficie compartida con capacidad de afectar varias aplicaciones.

## 3. Diagnóstico actual

### 3.1 Qué protegen las validaciones existentes

Actualmente el repositorio cuenta con:

- lint y TypeScript;
- unit tests existentes, principalmente de lógica;
- builds productivos;
- validaciones de schema y migraciones Prisma;
- integración HTTP con PostgreSQL efímero;
- smoke tests de API para `/health`, `/ready` y el contrato `404`;
- smoke tests web que comprueban que el login carga y que email, password y submit son visibles;
- despliegues manuales protegidos y smoke tests de ambientes.

Esto protege compilación, contratos básicos del API, migraciones y disponibilidad, pero no demuestra que los componentes interactivos funcionen ni que los flujos principales de cada app sigan operando.

### 3.2 Los smoke tests sí son E2E, pero son deliberadamente pequeños

Los smoke tests actuales usan Playwright y atraviesan un sistema desplegado, por lo que son una forma de E2E. Sin embargo, solo validan que los servicios y la pantalla de login estén disponibles. No equivalen a una suite funcional E2E.

Por ejemplo, hoy no comprueban que:

- un calendario abra, navegue y seleccione una fecha;
- un rango de fechas se normalice correctamente;
- un combobox filtre y seleccione;
- una tabla ordene, filtre o pagine;
- un dialog confirme o cancele;
- el sidebar funcione en escritorio y móvil;
- Envelope o Payroll puedan autenticarse y recorrer sus vistas críticas;
- una actualización de `react-day-picker` sea compatible con los wrappers locales.

### 3.3 Decisión sobre componentes compartidos

Todos los exports públicos de `packages/ui/src/index.ts` deben tener por lo menos una prueba de contrato. Esto incluye componentes sencillos, compuestos, hooks y helpers públicos.

No todos necesitan la misma profundidad:

- un `Button` necesita pocas pruebas estables;
- un `DatePicker`, `DataTable` o `Sidebar` necesita varios escenarios de comportamiento;
- no se deben duplicar las pruebas internas de Radix, Base UI o `react-day-picker`;
- sí se debe verificar el contrato que Keysar expone y del cual dependen las aplicaciones.

También deben considerarse compartidos y de alto impacto:

- `packages/ui` y su barrel `src/index.ts`;
- dependencias directas y transitivas de UI;
- `pnpm-lock.yaml`;
- configuración Tailwind;
- CSS global, tokens, temas, fuentes y utilidades compartidas;
- cambios que alteren resolución, exports o compilación de paquetes.

## 4. Estrategia: cuatro capas complementarias

Ninguna capa sustituye a las demás. La protección adecuada combina pruebas rápidas y aisladas con pruebas integradas sobre ambientes reales.

### 4.1 Capa 1: pruebas de contrato de `@cosmetics/ui`

#### Herramientas propuestas

- Vitest;
- React Testing Library;
- `@testing-library/user-event`;
- `@testing-library/jest-dom`;
- jsdom.

Agregar scripts equivalentes a:

```json
{
  "test:ui": "vitest run",
  "test:ui:coverage": "vitest run --coverage"
}
```

Los nombres finales deben respetar la estructura real de `packages/ui` y los scripts del monorepo.

#### Nivel alto: comportamiento completo

Componentes iniciales:

- `DatePicker`;
- `DateRangePicker`;
- `Calendar`;
- `Combobox`;
- `DataTable`;
- `Select`;
- `Dialog`;
- `AlertDialog`;
- `Sheet`;
- `Sidebar`;
- `Tabs`;
- `Popover`;
- `Tooltip`;
- `Toast`/Toaster.

Validar según aplique:

- apertura y cierre;
- teclado y foco;
- selección y callbacks;
- estados disabled, empty y loading;
- comportamiento controlado y no controlado;
- etiquetas, roles y nombres accesibles;
- composición con componentes hijos;
- variantes públicas;
- valores límites y normalización.

#### Nivel medio: contrato esencial

Componentes iniciales:

- `Button` y `buttonVariants`;
- `Input`;
- `Textarea`;
- `Label`;
- `Progress`;
- `ProgressKeysar`;
- `useIsMobile`.

Validar según aplique:

- render;
- semántica;
- eventos;
- disabled;
- foco;
- forwarding de refs;
- `className` y variantes;
- cambios de viewport/matchMedia para `useIsMobile`.

#### Nivel bajo: prueba mínima de composición

Superficies iniciales:

- `Card` y sus subcomponentes;
- `Badge` y `badgeVariants`;
- `Skeleton`;
- `Separator`;
- wrappers de `Table`;
- `cn`.

Validar:

- render sin error;
- elemento/semántica esperada;
- composición con children;
- combinación de clases;
- variantes públicas cuando existan.

#### Matriz mínima de escenarios de alto riesgo

##### DatePicker

- muestra placeholder sin valor;
- muestra una fecha seleccionada en el formato esperado;
- abre y cierra el popover;
- selecciona un día y emite el valor esperado;
- respeta disabled;
- permite navegar de mes;
- no cambia el día por efectos de timezone;
- conserva el contrato de valor usado por las apps.

##### DateRangePicker

- representa rango vacío;
- selecciona `from` y `to`;
- conserva el orden y normaliza el rango;
- representa rango parcial;
- emite el callback esperado;
- cierra de acuerdo con su contrato actual.

##### Calendar

- navega entre meses;
- selecciona día;
- respeta días deshabilitados;
- conserva clases/estados de días seleccionados y externos al mes.

##### Combobox

- abre opciones;
- busca y filtra;
- muestra estado vacío;
- selecciona y limpia;
- funciona con teclado;
- respeta disabled.

##### DataTable

- muestra headers y filas;
- muestra estado vacío;
- ordena;
- filtra;
- pagina;
- cambia tamaño de página;
- conserva callbacks/column definitions públicos.

##### Select

- abre;
- selecciona;
- actualiza el valor;
- funciona con teclado y foco;
- respeta disabled.

##### Dialog, AlertDialog, Sheet, Popover y Tooltip

- abren desde el trigger;
- cierran con sus acciones y con Escape cuando corresponda;
- administran foco;
- exponen título/descripción accesibles;
- AlertDialog distingue confirmación y cancelación.

##### Sidebar

- modo desktop;
- modo móvil;
- expandir/colapsar;
- shortcut de teclado si forma parte del contrato;
- modo controlado;
- integración con `matchMedia`;
- persistencia/cookie solo si se conserva como contrato público.

##### Toast

- renderiza contenido;
- ejecuta acción;
- cierra;
- conserva variantes y región accesible.

#### Cobertura

Objetivo después de cubrir todo el barrel público:

- 80% en líneas;
- 80% en statements;
- 80% en funciones;
- 75% en branches;
- 100% de exports públicos con al menos una prueba de contrato.

La cobertura no debe usarse para escribir pruebas vacías. La prioridad es cubrir contratos y riesgos.

### 4.2 Capa 2: testbed visual y regresión por screenshots

Crear una app interna, por ejemplo `apps/ui-testbed`, que renderice estados deterministas de los componentes compartidos.

Requisitos:

- Next.js compatible con el monorepo;
- no conectarse a API ni BD;
- no contener secretos;
- no desplegarse a Vercel;
- mostrar estados representativos, no todas las permutaciones posibles;
- usar datos fijos y fechas fijas;
- desactivar animaciones durante screenshots;
- esperar a que las fuentes estén cargadas.

Tomar screenshots de los componentes de alto riesgo con Playwright local en CI.

Configuración determinista propuesta:

- Chromium en runner Ubuntu;
- viewport desktop `1440x900`;
- viewport móvil `390x844`;
- locale `es-MX`;
- timezone `America/Mexico_City`;
- animaciones desactivadas;
- baselines versionados en Git.

Los cambios visuales intencionales deben actualizar los baselines en el mismo PR y ser revisados conscientemente. No habilitar actualización automática de snapshots en CI.

Snapshots iniciales:

- DatePicker cerrado y abierto;
- DateRangePicker vacío, parcial y completo;
- Calendar en desktop y móvil;
- Combobox abierto, con resultados y vacío;
- DataTable normal, vacía, filtrada y paginada;
- Select abierto;
- Dialog y AlertDialog abiertos;
- Sidebar desktop expandido/colapsado y móvil;
- estados principales de Toast.

No agregar inicialmente:

- Storybook o Chromatic;
- screenshot de cada color/variante menor;
- baselines de páginas completas;
- snapshots inestables con datos o fechas reales.

### 4.3 Capa 3: E2E funcional autenticado en desarrollo

Usar los alias estables de Vercel para `develop`; no usar URLs únicas de deployments porque cambian y complican CORS.

Ejecutar contra:

- API `cosmetics-api-dev.fly.dev`;
- Supabase de desarrollo;
- alias estable de Envelope en `develop`;
- alias estable de Payroll en `develop`.

Crear cuentas E2E dedicadas, de mínimo privilegio y exclusivas de desarrollo. Guardar sus credenciales como secrets del environment `development`, por ejemplo:

```text
E2E_ENVELOPE_EMAIL
E2E_ENVELOPE_PASSWORD
E2E_PAYROLL_EMAIL
E2E_PAYROLL_PASSWORD
```

Nunca registrar los valores en Git, logs, screenshots o trazas.

#### Primera versión: solo lectura

Implementar entre 6 y 10 recorridos críticos por cada aplicación madura. No es necesario convertir todas las páginas en E2E.

##### Envelope

Priorizar:

1. Login y carga del dashboard.
2. Apertura y uso de un filtro de fecha.
3. Carga de una tabla real y paginación/orden si existe.
4. Uso representativo de Combobox o Select.
5. Apertura y cancelación de un Dialog o AlertDialog sin mutar datos.
6. Navegación entre ventas, citas, empleados o reportes.
7. Sidebar desktop y navegación móvil.
8. Un recorrido representativo de ventas o citas que llegue hasta antes de confirmar escritura.

##### Payroll

Priorizar:

1. Login y carga del dashboard.
2. Selector de periodo quincenal/mensual.
3. Carga de esquemas y asignaciones.
4. Carga de movimientos.
5. Carga de recibos/reportes.
6. Uso representativo de DatePicker/DateRangePicker.
7. Uso de DataTable, Combobox y Select.
8. Apertura y cancelación de Dialog/AlertDialog.
9. Sidebar desktop y navegación móvil.

Para prevenir específicamente el incidente histórico, Envelope y Payroll deben incluir al menos una interacción real con fecha/calendario en cada suite.

#### Segunda versión: escrituras controladas en desarrollo

Agregar solo cuando la versión de lectura sea estable:

- datos con prefijo único por ejecución;
- limpieza en `afterEach`/`afterAll` o endpoint administrativo seguro de test;
- ningún dato parecido a información real de nómina;
- idempotencia;
- ejecución exclusiva si existe riesgo de colisión.

No ejecutar estos recorridos sobre producción.

#### Aplicaciones menos maduras

- Scheduler no se agrega aún al smoke productivo. Mientras siga en fase anterior, se protege mediante contratos de `@cosmetics/ui`, testbed, build y un canary local cuando consuma UI compartida.
- HR y Finance quedan inicialmente protegidos por sus builds y por las pruebas de UI compartida. Agregar E2E autenticado cuando su backend y autenticación estén maduros.

### 4.4 Capa 4: smoke de producción

Conservar los smoke tests actuales de solo lectura:

- `/health`;
- `/ready`;
- contrato `404`;
- carga de login de Envelope y Payroll.

Después de estabilizar los E2E de desarrollo, agregar 2 a 4 verificaciones autenticadas de solo lectura por app, usando una cuenta de monitoreo dedicada y de mínimo privilegio:

- iniciar sesión;
- abrir una pantalla principal;
- cargar un listado/reportaje inocuo;
- cerrar sesión.

Reglas invariables:

- no crear, editar, aprobar, pagar ni borrar datos;
- no usar cuenta personal;
- no guardar credenciales en artifacts;
- no permitir screenshots/traces con información sensible;
- no sustituir la validación de desarrollo por pruebas agresivas en producción.

## 5. Integración en CI

### 5.1 Nuevos checks obligatorios

Agregar checks con nombres estables:

```text
Shared UI contracts
UI regression canaries
```

`Shared UI contracts` ejecuta los tests de `packages/ui` y cobertura.  
`UI regression canaries` ejecuta el testbed y screenshots de los componentes de alto riesgo.

Los jobs deben aparecer siempre en los PR para que GitHub pueda exigirlos. Si un cambio es irrelevante, el job puede determinar internamente que no aplica y terminar correctamente; evitar omitir completamente el job mediante filtros de workflow que hagan que el required check quede pendiente.

### 5.2 Cambios que deben activar validación completa de UI

- `packages/ui/**`;
- `pnpm-lock.yaml`;
- `package.json` raíz;
- manifests que cambien dependencias de React, Radix, Base UI, `react-day-picker`, TanStack Table, Tailwind o herramientas de compilación;
- configuraciones Tailwind;
- CSS global, temas, tokens y fuentes compartidas;
- barrel exports;
- configuración TypeScript/Next que afecte resolución del paquete compartido.

Ante estos cambios, CI debe:

1. ejecutar contratos de UI;
2. ejecutar canaries visuales;
3. construir todos los consumidores de `@cosmetics/ui`, no solo la app modificada;
4. conservar los checks actuales de lint, type-check y build.

Las actualizaciones de Dependabot relacionadas con UI deben tratarse como cambios de alto riesgo y pasar la misma matriz.

### 5.3 E2E de desarrollo

Los E2E autenticados necesitan un frontend y API ya desplegados. La implementación debe elegir una de estas estrategias sin debilitar el gate:

1. workflow posterior al deploy de `develop`, que valida el SHA exacto desplegado y bloquea la promoción a `master`; o
2. deployment previews estables por PR con credenciales y CORS controlados, si Vercel/Fly permiten hacerlo de forma reproducible.

Para el contexto actual se recomienda la primera opción: merge protegido a `develop`, deploy manual del backend cuando corresponda, E2E contra `development` y solo después abrir/promover el PR `develop → master`.

No exigir un E2E de ambiente si el SHA probado no corresponde al SHA que se pretende promover.

### 5.4 Checklist del PR

Agregar preguntas explícitas al template:

- ¿Modifica `@cosmetics/ui`, dependencias UI, CSS global, tokens o fuentes?
- ¿Qué aplicaciones consumidoras fueron construidas?
- ¿Qué contrato público cambió?
- ¿Los cambios visuales de snapshots son intencionales?
- ¿Se probó DatePicker/Calendar cuando aplica?
- ¿Se requiere E2E de desarrollo antes de promoción?

## 6. Flujo resultante

Ejemplo de un cambio en DatePicker provocado por Scheduler:

```text
feature/scheduler
  ↓
PR hacia develop
  ├─ lint + type-check + unit/integration actuales
  ├─ Shared UI contracts
  ├─ UI regression canaries
  └─ builds de Envelope, Payroll, Scheduler y demás consumidores
  ↓
merge a develop
  ↓
deploy de development cuando corresponda
  ↓
E2E autenticado de Envelope y Payroll sobre el SHA desplegado
  ↓
PR develop → master + respaldo + aprobación
  ↓
deploy protegido de producción
  ↓
smoke productivo de solo lectura
```

El incidente histórico debería ser detectado en varios puntos:

1. el contrato del DatePicker/Calendar fallaría si cambia su comportamiento;
2. los screenshots detectarían un cambio visual inesperado;
3. los builds de consumidores detectarían incompatibilidades de tipos/imports;
4. el E2E de Envelope y Payroll fallaría al interactuar con sus fechas;
5. la promoción a producción se detendría antes del merge o deploy.

## 7. Plan de implementación por fases

### Fase 1: infraestructura y componentes de mayor riesgo

- configurar Vitest, Testing Library, user-event, jest-dom y jsdom en `packages/ui`;
- crear setup común y helpers de render;
- probar DatePicker, DateRangePicker, Calendar, Combobox, Select, Dialog/AlertDialog y DataTable;
- agregar script raíz para ejecutar contratos;
- incorporar `Shared UI contracts` a CI;
- validar localmente y en un PR.

Resultado: protección conductual inmediata para el área que causó el incidente.

### Fase 2: cobertura completa del barrel público

- inventariar cada export de `packages/ui/src/index.ts`;
- agregar contrato mínimo a todos los exports;
- cubrir Sidebar, Toast, Sheet, Tabs, Popover y Tooltip con mayor profundidad;
- configurar umbrales de cobertura;
- agregar checklist de cambios compartidos al PR template;
- documentar cómo agregar pruebas a un componente nuevo.

Resultado: ningún componente global queda fuera de la red de seguridad.

### Fase 3: testbed y regresión visual

- crear `apps/ui-testbed` sin deploy;
- renderizar estados deterministas de componentes de alto riesgo;
- configurar screenshots desktop/móvil;
- versionar baselines;
- agregar `UI regression canaries` a CI;
- documentar el proceso para aceptar un cambio visual intencional.

Resultado: protección frente a cambios visuales que compilan pero rompen layout o interacción.

### Fase 4: E2E autenticado de desarrollo

- crear cuentas E2E de mínimo privilegio en Supabase dev;
- configurar secrets en GitHub environment `development`;
- implementar autenticación reutilizable en Playwright mediante `storageState` sin exponer credenciales;
- implementar 6 a 10 recorridos críticos de solo lectura en Envelope;
- implementar 6 a 10 recorridos críticos de solo lectura en Payroll;
- incluir interacción de fecha en ambas apps;
- vincular la ejecución al SHA realmente desplegado en development;
- documentar diagnóstico y artifacts seguros.

Resultado: validación real de que las aplicaciones funcionan integradas antes de promoverlas.

### Fase 5: producción y endurecimiento

- agregar 2 a 4 smoke autenticados de solo lectura por app;
- crear cuenta de monitoreo productiva de mínimo privilegio;
- revisar que traces/screenshots no filtren datos o secrets;
- sincronizar los nuevos required checks con los rulesets de GitHub;
- actualizar `CLAUDE.md`, `FLUJO_TRABAJO_Y_DESPLIEGUE.md` y `docs/RELEASE_RUNBOOK.md`;
- ejecutar prueba de mutación controlada;
- medir duración y flakiness durante varios PR.

Resultado: cierre operativo y gate verificable de release.

## 8. PR sugeridos

Evitar un PR único y masivo. División recomendada:

1. `test(ui): add contract test infrastructure and high-risk coverage`.
2. `test(ui): cover all public exports and enforce coverage`.
3. `test(ui): add deterministic visual regression testbed`.
4. `test(e2e): add authenticated development journeys`.
5. `test(release): harden production read-only smoke gates`.

Cada PR debe dejar su propia fase usable y pasar los checks existentes.

## 9. Archivos previstos

La ruta exacta puede ajustarse después de auditar el repositorio, pero se espera trabajar en:

```text
packages/ui/package.json
packages/ui/vitest.config.*
packages/ui/src/test/setup.*
packages/ui/src/**/*.test.tsx
apps/ui-testbed/**
apps/e2e/playwright.config.ts
apps/e2e/tests/**
.github/workflows/ci.yml
.github/workflows/staging-smoke.yml
.github/pull_request_template.md
package.json
pnpm-lock.yaml
turbo.json
CLAUDE.md
FLUJO_TRABAJO_Y_DESPLIEGUE.md
docs/RELEASE_RUNBOOK.md
```

No modificar API, Prisma, migraciones, BD o variables de producción como parte de las fases 1 a 3.

## 10. Criterios de aceptación

La iniciativa se considera completada cuando:

- [ ] cada export público de `@cosmetics/ui` tiene al menos una prueba de contrato;
- [ ] DatePicker, DateRangePicker y Calendar tienen cobertura de interacción, navegación, disabled y timezone;
- [ ] una ruptura intencional del DatePicker o Calendar bloquea el PR;
- [ ] una actualización incompatible de `react-day-picker` bloquea el PR;
- [ ] un cambio en UI compartida construye todos los consumidores;
- [ ] los componentes de alto riesgo tienen snapshots desktop y móvil estables;
- [ ] Envelope tiene al menos un E2E autenticado que interactúa con fechas;
- [ ] Payroll tiene al menos un E2E autenticado que interactúa con fechas;
- [ ] existen recorridos críticos de solo lectura para ambas apps en development;
- [ ] ningún test automático escribe en producción;
- [ ] los artifacts no contienen passwords, bypass secrets, JWT ni datos sensibles;
- [ ] los nuevos checks tienen nombres estables y están requeridos por los rulesets correspondientes;
- [ ] la suite de componentes tarda menos de 2 minutos;
- [ ] el conjunto de required checks permanece idealmente por debajo de 10 minutos;
- [ ] tests de componentes tienen cero retries;
- [ ] E2E permite como máximo un retry y todo caso flaky se corrige o se retira del gate;
- [ ] documentación y flujo de release están actualizados.

### Prueba de mutación controlada obligatoria

Antes de cerrar la iniciativa, en una rama temporal:

1. introducir deliberadamente una ruptura pequeña en DatePicker o Calendar, por ejemplo alterar el callback o impedir la selección;
2. comprobar que al menos `Shared UI contracts` falla;
3. comprobar que el canary visual o E2E también falla cuando la mutación afecta su alcance;
4. revertir completamente la mutación;
5. volver a ejecutar las suites y confirmar verde;
6. no fusionar jamás la mutación.

Esto demuestra que los tests detectan el tipo de regresión para el cual fueron creados.

## 11. Límites y decisiones explícitas

- No se cambian contratos de API, modelo de datos ni schema Prisma con este plan.
- Se prefieren selectores accesibles por rol, nombre y label. Usar `data-testid` solo cuando no exista un selector estable y semántico.
- No se busca probar internamente librerías de terceros; se prueba el wrapper y contrato público de Keysar.
- No se pretende tener E2E para cada botón o variante visual.
- No se pretende reproducir todo el CRUD en producción.
- No se agrega Scheduler al smoke productivo hasta que el usuario lo decida y su madurez lo justifique.
- No se agrega inicialmente Storybook, Chromatic ni un servicio externo de screenshots.
- No se deben aprobar snapshots cambiados sin revisar la imagen resultante.
- Los tests aislados de UI no sustituyen builds ni E2E; los E2E no sustituyen contratos rápidos de componentes.

## 12. Principio de mantenimiento

La regla para evitar una suite lenta y duplicada es:

> Probar el comportamiento detallado una sola vez dentro de `@cosmetics/ui`, probar una integración representativa en cada aplicación consumidora y mantener smoke tests productivos pequeños y de solo lectura.

Cuando se agregue un nuevo export público a `packages/ui/src/index.ts`, el mismo PR debe:

1. clasificar su riesgo como bajo, medio o alto;
2. agregar su prueba de contrato;
3. agregarlo al testbed si el riesgo es alto o visualmente crítico;
4. agregar o ajustar un E2E de aplicación solo si introduce un flujo de negocio nuevo o una integración que no esté representada.
