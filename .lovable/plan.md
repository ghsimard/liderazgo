

## Plan : Modèle de coûts avec dépendances inter-hubs cascadées

### Compréhension

Oui, je comprends. Au lieu de ne répartir que les modules d'infrastructure partagés, il faut aussi répartir le coût des **hubs fonctionnels** qui servent de dépendance à d'autres hubs. La Ficha, par exemple, est une dépendance de 6 hubs — chacun doit donc absorber 1/6 de son coût.

### Modèle de calcul

**Étape 1 — Coût propre de chaque hub** (heures directes + quote-part infra partagée, comme avant)

**Étape 2 — Dépendances inter-hubs**

| Hub | Dépend de |
|-----|-----------|
| Ficha | — (autonome) |
| Encuesta 360 | Ficha |
| Rúbricas | Ficha |
| Informe de Módulo | Ficha, Rúbricas |
| Ambiente Escolar | Ficha |
| Satisfacciones | — (autonome) |
| MEL | Encuesta 360, Rúbricas |
| Certificaciones | Ficha |

Ficha est utilisée par 6 hubs → chacun paie 1/6 de son coût propre.
Rúbricas est utilisée par 2 hubs (Informe, MEL) → chacun paie 1/2 de son coût propre.
Encuesta 360 est utilisée par 1 hub (MEL) → MEL paie 100% de son coût propre.

**Étape 3 — Coût total d'un hub** = coût propre + Σ (coût propre de chaque dépendance / nombre d'utilisateurs de cette dépendance)

**Étape 4 — Calibration**
- Coût total Encuesta 360 = coût propre 360 + (1/6 × coût propre Ficha) = **45 000 000 COP**
- → On en déduit le tarif horaire global
- → On applique ce tarif à tous les hubs pour obtenir le prix total de l'application

### Livrable

Régénération de `Valoracion_Aplicacion_RLT.pdf` avec :
1. Tableau des coûts propres (heures directes + infra)
2. Tableau des dépendances et quotes-parts inter-hubs
3. Coût total par hub (propre + dépendances)
4. Calibration explicite sur 360 = 45M COP
5. Prix total de l'application déduit
6. Graphe de dépendances mis à jour

