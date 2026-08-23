# Roles de Personal Keysar

Aplicación interna para administrar roles, horarios, descansos, vacaciones,
permisos y expedientes del personal de Keysar.

## Funciones principales

- Calendario semanal de turnos y descansos.
- Gestión de vacaciones, saldos y movimientos.
- Permisos por módulo y perfiles de acceso.
- Expedientes, biografías y estatus laboral.
- Operación y cobertura del equipo de facialistas.
- Importación de personal mediante una plantilla de Excel.

## Tecnologías

- Next.js 16 y React 19
- Vinext y Vite
- Cloudflare Workers
- Cloudflare D1 con Drizzle ORM
- Cloudflare R2
- TypeScript

## Requisitos

- Node.js `>=22.13.0`
- npm
- Linux, macOS o WSL para los scripts de compilación basados en Bash

> En Windows se recomienda WSL. Los scripts de compilación usan `flock`,
> `curl` y GNU `timeout`.

## Desarrollo local

1. Clona el repositorio.
2. Copia `.env.example` como `.env.local` si necesitas personalizar los límites
   de instalación o compilación.
3. Instala las dependencias:

   ```bash
   npm ci
   ```

4. Inicia el servidor local:

   ```bash
   npm run dev
   ```

La terminal mostrará la URL local. El entorno de desarrollo simula los enlaces
de D1 y R2 declarados en `.openai/hosting.json`.

## Comandos disponibles

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el entorno de desarrollo. |
| `npm run build` | Genera y valida el artefacto desplegable. |
| `npm test` | Compila y ejecuta las pruebas. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run validate:artifact` | Valida un artefacto ya compilado. |
| `npm run db:generate` | Genera migraciones de Drizzle. |

## Estructura del proyecto

```text
app/                  Interfaz, componentes y rutas de API
db/                   Acceso a D1 y esquema de datos
drizzle/              Migraciones de base de datos
public/               Archivos públicos y plantilla de importación
scripts/              Instalación, compilación y validación
tests/                Pruebas automatizadas
worker/               Entrada del Cloudflare Worker
.openai/hosting.json  Enlaces lógicos usados por OpenAI Sites
```

## Base de datos y archivos

La aplicación utiliza el enlace `DB` para D1 y `BUCKET` para R2. Los nombres
lógicos están en `.openai/hosting.json`; las credenciales y valores reales se
administran en la plataforma de alojamiento y nunca deben subirse al
repositorio.

Cuando cambie `db/schema.ts`, genera una migración, revísala y confírmala junto
con el cambio de código:

```bash
npm run db:generate
```

## Integración continua

El flujo `.github/workflows/ci.yml` instala las dependencias, ejecuta ESLint,
compila y corre las pruebas en cada pull request y cada actualización de
`main`.

## Despliegue

El proyecto está preparado para OpenAI Sites y genera una aplicación compatible
con Cloudflare Workers. GitHub almacena el código y ejecuta la validación; no es
el entorno de producción.

GitHub Pages no es compatible con esta aplicación porque Pages solo publica
archivos estáticos y este proyecto requiere rutas de servidor, D1 y R2.

## Seguridad y datos personales

- No confirmes archivos `.env`, tokens, credenciales ni exportaciones de la base
  de datos.
- Antes de hacer público el repositorio, revisa que los recursos en `public/` no
  contengan datos reales de empleados.
- Reporta vulnerabilidades mediante el canal descrito en `SECURITY.md`.

## Licencia

Código privado y propietario. Consulta `LICENSE.md`.
