## Problème

Le user est sur `/admin/ficha/:id` qui utilise `AdminEditFicha.tsx`, pas `FichaRLT.tsx`. Les changements précédents s'appliquaient uniquement à la ficha utilisateur. Il faut répliquer les mêmes ajustements dans `AdminEditFicha.tsx`.

## Actions

🖥️ **Site statique (Frontend) uniquement** — `src/pages/AdminEditFicha.tsx`

1. **Section 5 — sedes rural / urbana (lignes 1174 & 1181)**
   - Remplacer `type="number" min={0} max={999}` + `className="form-input …"` par un input simple : `type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}`, onInput qui tronque à 4 chiffres, `className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring shrink-0"`.

2. **Section 6 — Personal (lignes 1256-1272)**
   - Remplacer les 4 `FormFieldWrapper` + `FormInput` par la structure label-à-gauche / input-simple-à-droite (identique à la Section 5), avec maxLength 4.

3. **Section 7 — Estudiantes (lignes 1292-1314)**
   - Remplacer l'input `type="number"` par l'input simple avec `maxLength={4}` et onInput de troncature ; conserver la logique de sync `niveles_educativos`.

Aucun changement backend, aucun changement de schéma Zod (les champs restent des strings).