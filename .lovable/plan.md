

## Plan : Ajouter le hub Certification au PDF de valorisation

### Modifications
Régénérer le script Python `/tmp/gen_valorisation_es.py` avec :

1. **Nouveau hub "Certificaciones"** : ~40h, ajouté au tableau de ventilation (Page 2)
2. **Total recalculé** : ~1,960h (au lieu de 1,920h), prix total ajusté en COP
3. **Grafo de dependencias** (Page 3) : Ajouter une boîte "Certificaciones" connectée à "Ficha"
4. **Paquetes** (Page 4) : Intégrer Certificaciones dans les packs pertinents (Pack Complet au minimum, possiblement Pack Évaluation Complète)
5. **Pourcentages recalculés** pour tous les hubs

### Données du hub
- Hub : Certificaciones
- Heures : 40h
- % du total : ~2%
- Prix : 40 × 315,000 = $12,600,000 COP

### Output
- Fichier : `/mnt/documents/Valoracion_Aplicacion_RLT.pdf` (remplace l'existant)

