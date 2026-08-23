# Publicar el código en GitHub

## Configuración recomendada

- Nombre: `roles-personal-keysar`
- Visibilidad: **Private**
- Rama principal: `main`
- Descripción: `Gestión interna de roles, horarios, vacaciones y permisos del personal de Keysar.`
- Temas: `nextjs`, `react`, `typescript`, `cloudflare-workers`, `drizzle-orm`, `d1`

No inicialices el repositorio de GitHub con README, licencia ni `.gitignore`:
estos archivos ya están incluidos.

## Primera publicación

Desde la carpeta descomprimida del proyecto:

```bash
git init
git add .
git commit -m "chore: preparar proyecto para GitHub"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/roles-personal-keysar.git
git push -u origin main
```

Sustituye `TU-USUARIO` por la cuenta u organización que será propietaria del
repositorio. Si usas SSH, cambia la URL del remoto por la proporcionada por
GitHub.

## Protección recomendada de `main`

En **Settings → Rules → Rulesets**, crea una regla para `main` con:

- pull request obligatorio;
- al menos una aprobación;
- comprobación `Lint, build and test` obligatoria;
- conversaciones resueltas antes de integrar;
- bloqueo de force pushes y eliminaciones.

## Seguridad

En **Settings → Security**:

- activa Dependabot alerts y security updates;
- activa secret scanning y push protection si están disponibles;
- activa Private vulnerability reporting;
- limita los colaboradores a las personas que realmente administran el sistema.

Mantén el repositorio privado: el código describe flujos internos de personal y
los archivos públicos incluyen una plantilla de importación, aunque contiene
solo un ejemplo ficticio.

## Despliegue

El flujo de GitHub Actions valida el código, pero no publica producción. El sitio
actual continúa alojado en OpenAI Sites. GitHub Pages no ejecuta rutas de
servidor, D1 ni R2 y no debe habilitarse para este repositorio.
