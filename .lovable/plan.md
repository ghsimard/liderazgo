

## Changement — `ShareEncuestaDialog.tsx`

**Comportement souhaité :**
- Si l'utilisateur tape un email et clique directement **Enviar** (sans +), l'email saisi est automatiquement ajouté puis envoyé.
- Le bouton **+** reste disponible pour ajouter plusieurs emails avant l'envoi final.
- Le bouton **Enviar** est actif dès qu'il y a un email valide dans le champ OU dans la liste.

**Modifications :**

1. **`handleSend`** — Au début de la fonction, avant la vérification `emails.length === 0`, ajouter automatiquement `emailInput` s'il contient un email valide :
   ```ts
   let finalEmails = [...emails];
   const trimmed = emailInput.trim().toLowerCase();
   if (trimmed && emailRegex.test(trimmed) && !finalEmails.includes(trimmed)) {
     finalEmails.push(trimmed);
   }
   if (finalEmails.length === 0) { /* toast error + return */ }
   ```
   Utiliser `finalEmails` au lieu de `emails` pour le reste de la fonction. Vider `emailInput` après.

2. **Bouton Enviar `disabled`** — Changer la condition de :
   ```ts
   disabled={sending || emails.length === 0}
   ```
   à :
   ```ts
   disabled={sending || (emails.length === 0 && !emailRegex.test(emailInput.trim()))}
   ```

Le bouton **+** et le flux multi-emails restent inchangés.

