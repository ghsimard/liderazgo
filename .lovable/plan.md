## Objetivo
Ajouter une nouvelle Q/R dans la section **Encuesta 360°** du FAQ admin (`src/pages/FaqPage.tsx`) expliquant comment activer la 360° pour une institution / région / fase.

## Emplacement
`src/pages/FaqPage.tsx`, section "Encuesta 360°" (autour de la ligne 88), insérée juste après la question « ¿Qué debe configurar el administrador antes de que funcione? ».

## Contenu à ajouter

**Q :** ¿Cómo activa el administrador la Encuesta 360° para una institución o región?

**R :**
1. Ir a **Admin → Encuesta 360° → Visibilidad** (`AdminEncuesta360VisibilityTab`).
2. Crear una nueva regla de visibilidad con:
   - **Ámbito**: Institución específica **o** Región completa.
   - **Tipo de formulario**: `autoevaluacion`, `heteroevaluacion`, `coevaluacion` (uno o varios).
   - **Fase**: `inicial` (Entrada) o `final` (Salida).
   - **Visible**: activado.
3. Guardar. Los directivos y evaluadores del ámbito verán inmediatamente el botón **Encuesta 360°** en su *Mi Panel* tras un refresh (Ctrl+Shift+R).

Notas :
- Sin regla activa para la región/institución y fase, el botón permanece oculto en *Mi Panel*.
- Se pueden crear reglas separadas por fase para controlar Entrada vs Salida de forma independiente.

## Actions par catégorie
- 🖥️ **Site statique (Frontend)** : édition de `src/pages/FaqPage.tsx` uniquement.
- ⚙️ **Web Service (Backend Express)** : aucune.
- 🗄️ **Base de données (SQL manuel)** : aucune.
