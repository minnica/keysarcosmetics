# Área de trabajo del prototipo

Este directorio está reservado para la nueva experiencia visual de Payroll.

Estructura sugerida conforme crezca el prototipo:

```text
src/prototype/
├── components/  # piezas propias del prototipo
├── data/        # fixtures centralizados y claramente ficticios
├── screens/     # composiciones de cada pantalla
├── state/       # estado React en memoria
└── types/       # contratos de UI sin dependencias del backend
```

No es obligatorio crear todas las carpetas desde el principio. Agrégalas cuando exista código
real que colocar en ellas. La navegación de Next.js permanece en `src/app/` y puede importar
las pantallas desde este directorio.
