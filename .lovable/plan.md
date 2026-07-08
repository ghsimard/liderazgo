
# Plan — Vérifier la réconciliation sur Render (prod)

## Objectif
Confirmer que le monitor prod affiche bien les 67 IE de la cohorte Medellín 2025 et que les 3 IE ajoutées (Bello Horizonte, El Diamante, Ciudad Don Bosco) apparaissent avec leurs encuestas comptabilisées.

## 🗄️ Base de données
Aucune action. La migration a déjà été appliquée en prod par l'utilisateur.

## ⚙️ Web Service (Backend Express)
Aucune action. La vue `v_ae_instituciones_por_cohorte` est déjà lue via le proxy `dbClient` existant.

## 🖥️ Site statique (Frontend)
Aucune modification de code.

**Test automatisé via Playwright** :
1. Ouvrir `https://rltficha.lovable.app`
2. Authentifier en Superadmin (demander credentials si nécessaires — sinon test sur route publique impossible)
3. Aller sur `/admin?tab=ambiente-escolar`
4. Sélectionner la cohorte **Medellín 2025**
5. Capturer une screenshot et vérifier :
   - Nombre total d'IE affichées = 67
   - Présence de Bello Horizonte (232 encuestas), El Diamante (94), Ciudad Don Bosco (1)
   - Ligne « institución Educativa Manuel Uribe Ángel » fusionnée (plus de doublon sans tilde)
6. Rapporter les captures et anomalies éventuelles

## Prérequis
Le monitor est derrière un login Superadmin. Il me faudra soit :
- Un jeu de credentials de test à me fournir en tant que secret temporaire, soit
- Que tu me confirmes que je peux tester en signant avec une cédula spécifique (à me communiquer).
