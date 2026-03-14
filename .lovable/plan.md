

## Plan : Dialogue de choix pour Évaluateur + Opérateur

### Problème
Actuellement, si une cédula est à la fois évaluateur et opérateur, le `Case 0` (ligne 79) redirige directement vers `/operador`, bloquant l'accès au panel évaluateur.

### Solution
Étendre la logique de choix de rôle existante (déjà en place pour admin+évaluateur) pour couvrir aussi le cas opérateur+évaluateur/directivo.

### Changement unique : `src/pages/Index.tsx`

1. **Modifier le Case 0** (ligne 78-82) : au lieu de rediriger directement, vérifier si l'utilisateur est aussi évaluateur ou directivo. Si oui, afficher le dialogue de choix de rôle (réutiliser `showRoleChoice`). Si non, rediriger vers `/operador`.

2. **Étendre le dialogue de choix de rôle** (le `AlertDialog` existant en bas du fichier) : ajouter un bouton "Panel de Operador" avec l'icône `Briefcase` quand `is_operator` est vrai, en plus des boutons existants (Evaluador / Admin).

Logique révisée :
```text
Case 0: is_operator && (is_evaluador || is_directivo) → showRoleChoice (avec options évaluateur + opérateur)
Case 0b: is_operator && !is_admin && !is_evaluador && !is_directivo → navigate("/operador")
Case 1: is_admin && (is_evaluador || is_directivo || is_operator) → showRoleChoice (avec toutes les options applicables)
Case 2: is_admin only → navigate("/admin/login")
Case 3: is_evaluador || is_directivo → navigate("/mi-panel")
```

Le dialogue affichera dynamiquement les boutons selon les rôles détectés (évaluateur, opérateur, admin).

