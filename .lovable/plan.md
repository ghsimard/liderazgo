## Corriger le municipio de 3 instituciones (Oriente 2026)

### Constat (vérifié en prod)

| Institución | Municipio actuel (faux) | Municipio correct |
|---|---|---|
| Centro Educativo Rural Guamito | San Luis | **El Peñol** |
| Institución Educativa Rural La Josefina | San Carlos | **San Luis** |
| Institución Educativa Rural Santa Ana | El Peñol | **Granada** |

Le municipio est stocké uniquement dans `instituciones.municipio_id` (FK vers `municipios`). Aucune autre table ne dénormalise ce champ — donc **une seule table à mettre à jour**.

IDs cibles (branche liée à la région « Oriente 2026 » dans `region_municipios`, pour éviter les doublons de `municipios`) :
- El Peñol → `52b59959-0449-461f-90f8-93c174fb2f9d`
- San Luis → `94fbe7d9-bb9a-4ac2-844e-3c5770149866`
- Granada → `809f0ce9-9bf7-4266-92d8-4c485ce0f04d`

### Action

🗄️ **Base de données (SQL manuel via pgAdmin4 sur Render)** :

```sql
BEGIN;

-- Avant : contrôle
SELECT i.nombre, m.nombre AS municipio_actual
FROM instituciones i JOIN municipios m ON m.id = i.municipio_id
WHERE i.id IN (
  '7fcc711a-aace-4f23-8bfe-3d73a502786f',  -- Guamito
  '671ef66a-1173-4e1f-a661-a806cf31987c',  -- La Josefina
  '15daa903-fcaa-4957-b5c9-899fed85973b'   -- Santa Ana
);

-- Corrections
UPDATE instituciones SET municipio_id = '52b59959-0449-461f-90f8-93c174fb2f9d'
 WHERE id = '7fcc711a-aace-4f23-8bfe-3d73a502786f';  -- Guamito -> El Peñol

UPDATE instituciones SET municipio_id = '94fbe7d9-bb9a-4ac2-844e-3c5770149866'
 WHERE id = '671ef66a-1173-4e1f-a661-a806cf31987c';  -- La Josefina -> San Luis

UPDATE instituciones SET municipio_id = '809f0ce9-9bf7-4266-92d8-4c485ce0f04d'
 WHERE id = '15daa903-fcaa-4957-b5c9-899fed85973b';  -- Santa Ana -> Granada

-- Après : vérification (doit afficher les 3 nouveaux municipios)
SELECT i.nombre, m.nombre AS municipio_nuevo
FROM instituciones i JOIN municipios m ON m.id = i.municipio_id
WHERE i.id IN (
  '7fcc711a-aace-4f23-8bfe-3d73a502786f',
  '671ef66a-1173-4e1f-a661-a806cf31987c',
  '15daa903-fcaa-4957-b5c9-899fed85973b'
);

COMMIT;
```

Si le contrôle final montre bien El Peñol / San Luis / Granada → `COMMIT`. Sinon → `ROLLBACK`.

🖥️ **Frontend** : rien à faire.
⚙️ **Backend Express** : rien à faire.

### Note
Il existe des doublons de municipios (`El Peñol`, `San Luis`, `Granada`, `San Carlos`) sans lien vers une région — non traités ici. À nettoyer dans un ticket dédié si besoin.
