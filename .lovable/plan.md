

L'utilisateur veut :
1. Le rapport PDF avec deltas + analyse automatisée + système de notation (déjà planifié)
2. **NOUVEAU** : Afficher aussi le rapport dans l'UI (pas seulement en PDF téléchargeable)

Je vais réviser le plan pour inclure l'affichage UI en plus du PDF.

## Plan révisé — Rapport Δ Ambiente Escolar (UI + PDF)

### Objectif
Dans l'onglet **Admin → Ambiente Escolar → Análisis por Campaña**, ajouter :
- Une **sección "Sistema de calificación"** (statique, toujours visible)
- Une **sección "Análisis automatizado"** (générée par Grok, affichée dans l'UI avec bouton "Generar análisis")
- Un bouton **"Descargar informe PDF"** qui exporte le tout (couverture + tableau deltas + sistema notación + análisis)

### Composants

| Fichier | Action |
|---|---|
| `src/components/admin/AdminAmbienteDeltaTab.tsx` | Ajouter 2 cartes UI (Sistema notación + Análisis automatizado) + 2 boutons (Generar análisis / Descargar PDF) + état `analysisText` |
| `server/routes/generate-section-text.ts` | Étendre avec un nouveau `sectionType: "ambiente_delta"` qui reçoit cohorte + deltas par grupo/sección et retourne narrativa interprétative |
| `src/utils/ambienteDeltaPdfGenerator.ts` | **Nouveau** — jsPDF + autoTable, marges 32/18mm, logos `_white`, dates DD/MM/YYYY |

### Sección "Sistema de calificación" (UI + PDF, contenu statique espagnol)
- Escala Likert 1-5 (Nunca → Siempre)
- Cálculo del Δ : promedio Salida − promedio Entrada, por sección y grupo
- Umbral significativo : ΔP ≥ 0.5 puntos
- Convención visual : ▲ verde (+), ▼ rojo (−), = gris (estable)
- Promedio cohorte = media no ponderada de los 3 grupos

### Sección "Análisis automatizado"
- Bouton **"Generar análisis"** → POST `/api/generate-section-text` avec `sectionType: "ambiente_delta"` + payload `{ cohorte, deltasPorGrupo, n_inicial, n_evolucion }`
- Prompt système : "Experto en clima escolar. Interpreta deltas Entrada→Salida por grupo (Docentes, Estudiantes, Acudientes), identifica 2 fortalezas y 2 áreas de mejora, propón 1 recomendación. Máx 250 palabras. Respuesta en HTML simple."
- Affichage UI : carte avec `dangerouslySetInnerHTML` (cohérent avec les autres analyses Grok du projet)
- Stockage : état local React (régénérable, non persisté en DB — cohérent avec le reste du système)

### Inclusion dans le PDF
1. Page 1 : couverture (logos blancs, cohorte, fechas campañas Inicial/Evolución, n respuestas)
2. Page 2 : "Sistema de calificación" (texte statique)
3. Page 3+ : tableau deltas par grupo (Docentes / Estudiantes / Acudientes) + Δ global cohorte
4. Page finale : "Análisis automatizado" (HTML stripé en texte)

Si l'analyse n'a pas encore été générée, le PDF affiche un encart "— Genere el análisis automatizado en la interfaz antes de exportar —".

### Récap déploiement

| Cible | Action |
|---|---|
| 🖥️ Site statique (Frontend) | **Redéployer** (cartes UI + boutons + générateur PDF) |
| ⚙️ Web Service (Backend Express) | **Redéployer** (extension `generate-section-text` avec `sectionType: "ambiente_delta"`) |
| 🗄️ Base de données | Aucune |

