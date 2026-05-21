# Cosa 3 — Añadir jornada "Sabatina" a la Ficha RLT

## Constat

Las opciones actuales de **Jornadas de la IE** en la ficha son: Mañana, Tarde, **Nocturna**, Única.
→ "Nocturna" ya existe. Solo falta agregar **Sabatina**.

## Cambios

1. **Formulario directivo** — `src/pages/FichaRLT.tsx` (línea 1579)
   Añadir opción `{ value: "Sabatina", label: "Sabatina" }`.

2. **Formulario admin** — `src/pages/AdminEditFicha.tsx` (línea 1193)
   Añadir la misma opción.

3. **PDF lleno (Reporte ficha)** — `src/utils/pdfGenerator.ts`
   No requiere cambios: ya imprime el array `jornadas` unido con coma. Sabatina aparecerá automáticamente.

4. **PDF en blanco** — `src/utils/blankFichaPdfGenerator.ts`
   Verificar si lista las opciones; si solo deja casilla vacía, no requiere cambios. (A confirmar al editar.)

5. **Documentación de campos** — `src/utils/fichaFieldsPdfGenerator.ts` (línea 70)
   Actualizar regla: `Mañana / Tarde / Nocturna / Sabatina / Única`.

## Hors-scope

- BDD: el campo `jornadas` es `text[]`, no hay enum a migrar. 🗄️ Ningún cambio SQL.
- ⚙️ Backend Express: ningún cambio.
- 🖥️ Frontend: los 5 ajustes listados arriba.

## Acciones Render

- 🖥️ **Site statique (Frontend)**: redeploy automático tras merge.
- ⚙️ **Web Service (Backend Express)**: ningún cambio.
- 🗄️ **Base de datos (SQL manual)**: ninguno.
