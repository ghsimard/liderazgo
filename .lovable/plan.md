## Objetivo

Añadir el total de directivos (longitud del array `acompanamiento_directivos`) al lado del título **"Registro por directivo"**, para que el usuario sepa cuántas filas se han registrado sin tener que contarlas.

## Cambios

### 1. `src/components/admin/AdminInformeModuloForm.tsx` (línea 245)
Reemplazar el `<Label>` actual por un encabezado que muestre también el conteo:

```tsx
<Label className="text-xs text-muted-foreground">
  Registro por directivo{" "}
  <Badge variant="secondary" className="ml-1">
    {parseJson<AcompanamientoDirectivo[]>(data.acompanamiento_directivos, []).length} directivos
  </Badge>
</Label>
```

### 2. `src/pages/InformeModulo.tsx` (línea 676) — vista del coach
Aplicar el mismo cambio para mantener coherencia entre la vista admin y la vista del usuario coach.

### 3. `src/utils/informeModuloPdfGenerator.ts` (línea 346) — PDF
Incluir el total entre paréntesis en el título del PDF:
```
"Registro por directivo (N directivos)"
```

## Resultado esperado

En el caso actual de Quibdó Módulo 1, el título mostrará: **Registro por directivo · 20 directivos**, evidenciando que el coach registró 20 de los 25 esperados.
