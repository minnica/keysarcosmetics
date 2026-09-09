# Evidencia visual aprobada del POS

La única raíz de referencia válida es:

```text
docs/artifacts/pos-visual-baseline/
└── 12fb8045cc264b565cb6e764d95ad7b2447fbfa1/
    └── reference/
        ├── capture-index.json
        └── *.png
```

Las imágenes deben provenir exclusivamente del árbol aislado del commit
`12fb8045cc264b565cb6e764d95ad7b2447fbfa1`. El capturador valida el hash
agregado de la fuente, blobs esenciales, fuentes y logo antes de abrir Chromium,
genera todo en un directorio temporal y sólo publica el conjunto si concluye
completo. Nunca se usa el candidato para crear o actualizar esta referencia.

El baseline publicado contiene 208 PNG y un `capture-index.json` generado con
Chromium `148.0.7778.96`; los hashes individuales fueron verificados sin
discrepancias el 8 de septiembre de 2026.

`candidate/` y `diff/` son evidencia local descartable y están ignorados por
Git. El procedimiento, matriz y limitaciones están en
`docs/POS_VISUAL_BASELINE.md`.
