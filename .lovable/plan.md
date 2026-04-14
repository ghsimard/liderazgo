
# Plan : Restructurer le PDF de valorisation en 3 scénarios

## Contexte financier calculé
- **Valeur totale application** : ~$181.818.182 COP (~$43.290 USD au taux 4.200)
- **Hébergement mensuel** : ~$100 USD/mois (DB, email, domaine, API, app web)
- **Modèle licence par usager** : 100 utilisateurs/an × 5 ans = 500 user-years → ~$87 USD/usager/an → ~$7 USD/usager/mois

## Structure du nouveau PDF (6 pages)

### Page 1 — Méthodologie (existante, conservée)
Explication du modèle LOC proportionnel, sans changement.

### Page 2 — Décomposition LOC + Valorisation (pages 2-3 actuelles fusionnées)
Tableau LOC et tableau de valeurs par hub, plus compact.

### Page 3 — Scénario 1 : Licence perpétuelle
- Prix unique = valeur totale de l'application
- **Inclus** : code source complet, 1 an de support technique
- **Exclus** : hébergement DB, email transactionnel, nom de domaine, serveur web/API
- **Coûts récurrents** : ~$100 USD/mois pour l'infrastructure (variable selon utilisateurs, trafic, volume de données)
- Pas de nouveaux développements inclus

### Page 4 — Scénario 2 : Licence par usager (SaaS)
- **Définition licence** : 1 compte actif = directivo, admin, coach, operador ou evaluador
- **Objectif** : amortir la valeur totale en 5 ans avec ~100 utilisateurs/an
- **Calcul** : ~$87 USD/usager/an (~$7 USD/usager/mois)
- Tableau de projection sur 5 ans montrant revenus cumulés
- Note : hébergement (~$100 USD/mois) inclus dans le prix ou facturé séparément selon le modèle

### Page 5 — Scénario 3 (à définir)
Le troisième scénario n'a pas été précisé. **Question : quel serait le 3e scénario ?** Options possibles :
- Licence annuelle (location sans transfert de code)
- Modèle hybride (licence + pourcentage par usager)
- Développement sur mesure (facturation horaire)

### Page 6 — Diagramme de dépendances entre hubs (existant, conservé)

## Implémentation technique
- Réécriture de `/tmp/gen_valorisation_v9.py` pour ajouter les pages scénarios
- Régénération du titre via le script existant
- QA visuelle page par page via `pdftoppm`
