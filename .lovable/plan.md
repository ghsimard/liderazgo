# Rúbricas — informe regional: n = 30 en lugar de 31

## Constatación

El gráfico y la tabla vienen del informe regional de rúbricas (`AdminRubricaRegionalReport`). La columna `n` de cada ítem se calcula así:

- se toman las filas de `rubrica_evaluaciones` del ítem que tienen `acordado_nivel` no nulo;
- se añaden los directivos que solo tienen `rubrica_seguimientos` para ese ítem.

Es decir, `n` no cuenta directivos asignados, sino registros con nivel acordado. Un `n` de 30 frente a 31 en los otros dos ítems del módulo 2 significa, casi con certeza, que **un directivo no tiene nivel acordado guardado para "Comunicación asertiva"** (celda vacía / valor nulo), aunque sí lo tiene para los demás ítems.

No puedo confirmarlo desde aquí: la base de datos del entorno de desarrollo no contiene evaluaciones de rúbrica, así que el diagnóstico debe verificarse con una consulta en producción antes de tocar nada.

## Paso 1 — Verificación en producción (SQL de solo lectura)

Identificar qué directivo falta en ese ítem:

```sql
-- Directivos con acordado en el módulo 2 pero sin acordado en "Comunicación asertiva"
WITH mod2 AS (
  SELECT i.id, i.item_label
  FROM rubrica_items i
  JOIN rubrica_modules m ON m.id = i.module_id
  WHERE m.module_number = 2
),
con_acordado AS (
  SELECT DISTINCT e.directivo_cedula
  FROM rubrica_evaluaciones e
  JOIN mod2 i ON i.id = e.item_id
  WHERE e.acordado_nivel IS NOT NULL
)
SELECT c.directivo_cedula,
       f.nombres_apellidos,
       f.nombre_ie,
       f.region,
       (SELECT e2.acordado_nivel
          FROM rubrica_evaluaciones e2
          JOIN mod2 i2 ON i2.id = e2.item_id
         WHERE e2.directivo_cedula = c.directivo_cedula
           AND i2.item_label ILIKE 'Comunicación asertiva%') AS nivel_comunicacion
FROM con_acordado c
LEFT JOIN fichas_rlt f ON f.numero_cedula = c.directivo_cedula
ORDER BY nivel_comunicacion NULLS FIRST, f.nombres_apellidos;
```

Y comprobar si hay filas duplicadas (mismo directivo, mismo ítem), que también distorsionarían el conteo:

```sql
SELECT e.item_id, e.directivo_cedula, count(*)
FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2 AND e.acordado_nivel IS NOT NULL
GROUP BY 1, 2 HAVING count(*) > 1;
```

## Paso 2 — Corrección, según el resultado

- **Caso A (lo más probable): falta el nivel acordado de un directivo.** No es un fallo de cálculo: el informe es correcto. El evaluador debe completar ese ítem en la rúbrica del directivo identificado, o se corrige con un `UPDATE` puntual si se conoce el nivel acordado real.
- **Caso B: hay filas duplicadas.** Se ajusta el cálculo para contar directivos únicos en lugar de filas.

## Mejora de la interfaz (independiente del caso)

Para que este tipo de diferencia sea evidente sin consultar la base de datos, añadir en la tabla del informe regional:

- una columna "Sin registro" con el número de directivos de la región que no tienen nivel acordado ni seguimiento para ese ítem;
- un aviso visual cuando la `n` de un ítem es inferior a la `n` máxima del módulo, con el listado de los directivos ausentes en un tooltip.

## Detalles técnicos

- Archivo afectado: `src/components/admin/AdminRubricaRegionalReport.tsx` (bloque `moduleDistributions`, líneas ~161-238).
- El universo de referencia serían las `rubrica_asignaciones` de la región (deduplicadas por cédula), comparadas con las cédulas que tienen `acordado_nivel` o seguimiento.
- Los porcentajes seguirían calculándose sobre `n` (respuestas efectivas), sin cambiar los valores actuales.

## Acciones por entorno

- 🖥️ Site statique (Frontend) : republier tras la mejora de la interfaz.
- ⚙️ Web Service (Backend Express) : nada.
- 🗄️ Base de données : ejecutar en producción las consultas de verificación; luego, si aplica, el `UPDATE` puntual del nivel faltante.
