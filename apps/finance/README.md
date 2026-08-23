# VAM Control — Rentas y pagos

Aplicación web para administrar sucursales, rentas, servicios, pagos, estados financieros, financiamientos, socios, aportaciones, proyecciones, accesos y reportes.

Esta entrega reconstruye el sitio de referencia como un proyecto React/Vite editable y autocontenido. No depende de los endpoints privados del despliegue original: los cambios se guardan en `localStorage` del navegador, por lo que es ideal para demostración, prototipado y como base para conectar un backend real.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalación y ejecución

```bash
corepack enable
pnpm install
pnpm dev
```

Abre la dirección indicada por Vite, normalmente `http://localhost:5173`.

## Compilación para producción

```bash
pnpm build
pnpm preview
```

Los archivos finales se generan en `dist/`.

También puedes usar `npm install` y `npm run dev` si prefieres npm.

## Datos y persistencia

- Los datos iniciales viven en `src/data/seed.js`.
- Los cambios se conservan localmente en el navegador bajo la clave `vam-control-data-v1`.
- Para restaurar los datos iniciales usa **Restablecer demo** en el pie del menú lateral.
- No se incluyen contraseñas, llaves ni credenciales del sitio original.

## Funciones incluidas

- Panel consolidado y navegación mensual.
- Altas y cambios de estado de sucursales.
- Registro de rentas, pagos, ventas, gastos, servicios, financiamientos, socios y aportaciones.
- Cálculos de saldos, utilidad, deuda y proyección.
- Exportación de reportes en CSV compatible con Excel.
- Vista de impresión/PDF mediante el diálogo del navegador.
- PWA instalable con manifiesto, iconos y service worker.
- Diseño adaptable para escritorio, tableta y móvil.

## Estructura

```text
vam-control-rentas/
├─ public/              # Logo, iconos, manifiesto y service worker
├─ src/
│  ├─ components/      # Componentes compartidos
│  ├─ data/seed.js     # Datos de demostración
│  ├─ pages/           # Módulos del sistema
│  ├─ App.jsx          # Estado, rutas internas y composición
│  ├─ main.jsx         # Entrada de React
│  ├─ styles.css       # Sistema visual adaptable
│  └─ utils.js         # Formato, CSV y persistencia
├─ .env.example
├─ .github/workflows/ci.yml
├─ .gitignore
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
└─ vite.config.js
```

## Publicar en GitHub

Este proyecto ya incluye `.gitignore` y los archivos de configuración necesarios. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial commit: VAM Control"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

No se realizó ningún despliegue ni publicación como parte de esta entrega.

## Siguiente paso para producción

Para uso multiusuario real conviene sustituir `localStorage` por una API con base de datos, autenticación y permisos en servidor. Los módulos y el estado están separados para facilitar esa migración.
