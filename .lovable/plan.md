

## Probleme

Sur Render (production), l'envoi d'email passe par `POST /api/email/send` (Express) qui exige `requireAuth` + `requireAdmin`. Les directivos ne sont pas des admins Express — ils s'identifient uniquement par cedula via sessionStorage, sans JWT admin. Le meme probleme existe sur les deux environnements :

| Environnement | Route | Protection | Probleme |
|---|---|---|---|
| Lovable Cloud | Edge function `send-email` | JWT admin + `has_admin_access` | Directivo n'a pas de JWT admin |
| Render | `POST /api/email/send` | `requireAuth` + `requireAdmin` | Directivo n'a pas de JWT Express |

## Solution

Ajouter une route Express **dediee** aux invitations 360° qui valide par cedula (sans exiger un admin JWT), en miroir de la modification de l'edge function.

### Etape 1 — Nouvelle route Express : `POST /api/email/send-invitation`

Creer dans `server/routes/email.ts` une seconde route **sans** `requireAuth`/`requireAdmin` :
- Accepte un champ `context: { type: "encuesta_invitation", directivo_cedula: string }` dans le body
- Valide que la cedula existe dans `fichas_rlt` via une requete SQL directe
- Si valide, envoie l'email via Resend (meme logique que la route admin existante)
- Si invalide, retourne 403
- La route admin existante (`POST /api/email/send`) reste inchangee

### Etape 2 — Modifier l'edge function `send-email`

Comme prevu dans le plan precedent : ajouter le mode `context.type === "encuesta_invitation"` qui valide la cedula via `get_ficha_by_cedula` (service role) au lieu d'exiger un JWT admin.

### Etape 3 — Mettre a jour `emailClient.ts`

- Ajouter `context?: { type: string; directivo_cedula: string }` a `SendEmailParams`
- En mode Express : si `context` est present, appeler `/api/email/send-invitation` au lieu de `/api/email/send`
- En mode Supabase : transmettre `context` dans le body de l'edge function (comme prevu)

### Etape 4 — Mettre a jour `ShareEncuestaDialog.tsx` et `Encuesta360Hub.tsx`

Passer `context: { type: "encuesta_invitation", directivo_cedula: directivoCedula }` dans les appels `sendEmail()`.

### Deploiement Render

- 🖥️ **Site statique (Frontend)** : Rebuild necessaire (modification de `emailClient.ts`, `ShareEncuestaDialog.tsx`)
- ⚙️ **Web Service (Backend Express)** : Redeploy necessaire (nouvelle route dans `server/routes/email.ts`)
- 🗄️ **Base de donnees** : Aucune modification requise

