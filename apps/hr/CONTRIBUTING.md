# Contribuir

## Flujo de trabajo

1. Crea una rama desde `main` con un nombre breve, por ejemplo
   `feat/saldo-vacaciones` o `fix/filtro-permisos`.
2. Instala dependencias con `npm ci`.
3. Realiza un cambio enfocado y agrega o actualiza pruebas cuando corresponda.
4. Ejecuta `npm run lint` y `npm test`.
5. Abre un pull request usando la plantilla del repositorio.

## Base de datos

Si modificas `db/schema.ts`, ejecuta `npm run db:generate`, revisa el SQL
generado y confirma la migración en `drizzle/` junto con el código.

No edites una migración que ya fue aplicada en producción; crea una nueva.

## Privacidad

Usa datos ficticios en pruebas, capturas, ejemplos y descripciones de pull
requests. Nunca confirmes credenciales, archivos `.env`, exportaciones de D1 o
R2, ni información personal de empleados.

## Criterios de aceptación

- La compilación y las pruebas terminan correctamente.
- La interfaz conserva accesibilidad básica y comportamiento adaptable.
- Los cambios de permisos se validan tanto en cliente como en servidor.
- La documentación se actualiza cuando cambia el flujo de uso o despliegue.
