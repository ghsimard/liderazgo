

# Plan : Montants en COP uniquement + Scénario 2 "on demand"

## Changements requis dans `/tmp/gen_valorisation_final.py`

### 1. Supprimer toutes les références USD
- Retirer `fmt_usd()` et `TOTAL_USD`
- Convertir tous les montants en COP (taux $4.200 COP = $1 USD)
- Infrastructure : ~$420.000 COP/mes (au lieu de $100 USD)
- Tarifa de referencia : uniquement "$2.466 COP/LOC"

### 2. Scénario 2 — Licence par usager "on demand"
Reformuler : pas d'amortissement sur 5 ans, mais un **prix par usager actif par mois**, facturé à la demande.

**Calcul :**
- Valeur totale : $181.818.182 COP
- Amortissement cible : 500 user-years → **$363.636 COP/usager/an** → **~$30.303 COP/usager/mes**
- Présentation simplifiée : **$30.000 COP/usuario/mes** (arrondi)

**Contenu page 4 :**
- Prix affiché : ~$30.000 COP/usuario/mes
- Définition licence (directivo, admin, coach, operador, evaluador)
- Tableau de projection conservé mais en COP
- "On demand" = facturation mensuelle selon utilisateurs réels

### 3. Scénario 1 — Montants en COP uniquement
- Prix affiché : $181.818.182 COP (sans "≈ $43,290 USD")
- Table infrastructure convertie en COP/mes

### 4. Scénario 3 — Montants en COP uniquement  
- Cuota mensuelle : ~$5.050.505 COP/mes (36 cuotas)
- Per-user : ~$21.000 COP/usuario/mes

### 5. Régénération + QA visuelle des 6 pages

