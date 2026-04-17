import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * POST /api/generate-section-text
 * Proxies satisfaction report AI text generation to xAI Grok.
 * Mirrors the Supabase edge function generate-section-text.
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      sectionType,
      sectionTitle,
      chartData,
      generalStats,
      filterType,
      filterModule,
      filterRegion,
      totalResponses,
      comments,
      overallSatisfaction,
      // ambiente_delta payload
      cohorteNombre,
      maxScore,
      cohortIni,
      cohortEvo,
      cohortDelta,
      deltasPorGrupo,
    } = req.body;

    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
      return res.status(500).json({ error: "XAI_API_KEY no está configurada en el servidor." });
    }

    let prompt = "";
    const context = `Programa Rectores Líderes Transformadores (RLT) en Colombia. Encuesta de satisfacción ${filterType}, módulo ${filterModule}, región: ${filterRegion}. Total respuestas: ${totalResponses}.`;

    if (sectionType === "text") {
      prompt = `${context}

Sección del informe: "${sectionTitle}"

Redacta un párrafo profesional (100-200 palabras) para esta sección del informe de satisfacción. El texto debe ser:
- En español formal, tercera persona
- Contextual y relevante para el Programa RLT
- Profesional y bien estructurado
${overallSatisfaction ? `- El nivel general de satisfacción es ${overallSatisfaction}%` : ""}

Responde SOLO con el contenido en HTML simple (usa <p>, <strong>, <em> si necesario). Sin título.`;
    } else if (sectionType === "chart_analysis") {
      const dataDesc = (chartData || []).map((d: any) => `- ${d.label}: ${d.value}%`).join("\n");
      prompt = `${context}

Sección: "${sectionTitle}"
Datos del gráfico:
${dataDesc}

Redacta un análisis interpretativo (3-5 oraciones, 80-150 palabras) de estos resultados:
1. Identifica los indicadores más altos y más bajos
2. Interpreta los resultados en el contexto educativo
3. Menciona fortalezas y áreas de mejora
4. Tono profesional y constructivo

Responde SOLO con el análisis en HTML simple (usa <p>, <strong>, <em>). Sin título.`;
    } else if (sectionType === "satisfaction_summary") {
      const statsDesc = (generalStats || []).map((g: any) => `- ${g.label}: ${g.value}%`).join("\n");
      prompt = `${context}

Niveles de satisfacción por bloque temático:
${statsDesc}
Satisfacción general: ${overallSatisfaction}%

Redacta un párrafo introductorio (80-150 palabras) que:
1. Presente el nivel general de satisfacción
2. Destaque los bloques con mayor y menor satisfacción
3. Ofrezca una lectura general de los resultados
4. Tono profesional

Responde SOLO con el texto en HTML simple. Sin título.`;
    } else if (sectionType === "bullet_list") {
      const sampleComments = (comments || []).slice(0, 20).join("\n- ");
      const statsDesc = (generalStats || []).map((g: any) => `- ${g.label}: ${g.value}%`).join("\n");
      prompt = `${context}

Datos de satisfacción:
${statsDesc}
Satisfacción general: ${overallSatisfaction}%

Muestra de comentarios de los participantes:
- ${sampleComments}

Genera entre 4 y 6 puntos clave (viñetas) que sinteticen:
1. Los principales aportes cualitativos de los participantes
2. Las oportunidades de mejora identificadas
3. Las fortalezas destacadas

Cada viñeta debe ser un párrafo corto (1-2 oraciones). Usa HTML simple (<p>, <strong>, <em>).
Responde SOLO con las viñetas, una por línea, separadas por |||. Sin numeración ni viñetas de texto.`;
    } else if (sectionType === "ambiente_delta") {
      const groupsDesc = (deltasPorGrupo || []).map((g: any) => {
        const secs = (g.sections || [])
          .map((s: any) => `    · ${s.title}: Inicial ${s.ini ?? "—"} → Evolución ${s.evo ?? "—"} (Δ ${s.delta ?? "—"})`)
          .join("\n");
        return `Grupo ${g.grupo} (n inicial=${g.countIni}, n evolución=${g.countEvo}, promedio global Inicial ${g.iniGlobal ?? "—"} → Evolución ${g.evoGlobal ?? "—"}, ΔGlobal ${g.deltaGlobal ?? "—"}):\n${secs}`;
      }).join("\n\n");

      prompt = `Programa Rectores Líderes Transformadores (RLT) en Colombia. Cohorte: ${cohorteNombre}.
Análisis comparativo Δ del Ambiente Escolar entre la fase Inicial (línea base) y la fase Evolución (cierre).
Escala Likert 1 (Nunca) a ${maxScore} (Siempre). Umbral pedagógico significativo: ΔP ≥ 0.5 puntos.

Promedio global cohorte: Inicial ${cohortIni ?? "—"} → Evolución ${cohortEvo ?? "—"} (ΔGlobal ${cohortDelta ?? "—"} pt)

Detalle por grupo y sección:
${groupsDesc}

Como experto en clima escolar, redacta un análisis interpretativo (200-280 palabras) que:
1. Comente brevemente la evolución global de la cohorte.
2. Identifique 2 fortalezas claras (mayores deltas positivos) por grupo, citando la sección y el valor del Δ.
3. Identifique 2 áreas de mejora (deltas negativos o estancamiento por debajo de 0.2 pt) por grupo, citando la sección y el valor.
4. Cierre con 1 recomendación pedagógica concreta y accionable para el equipo directivo.

Tono profesional, formativo, en español formal, tercera persona. No menciones "IA" ni el modelo. Estructura tu respuesta en HTML simple usando <p>, <strong> y <em>. Sin título principal.`;
    } else {
      return res.status(400).json({ error: `Tipo de sección no soportado: ${sectionType}` });
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        messages: [
          {
            role: "system",
            content: "Eres un redactor experto en informes de evaluación educativa en América Latina. Respondes exclusivamente en español.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("xAI API error:", response.status, t);
      return res.status(500).json({ error: "Error del servicio de IA" });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    res.json({ text });
  } catch (err: any) {
    console.error("generate-section-text error:", err);
    res.status(500).json({ error: err.message || "Error desconocido" });
  }
});

export default router;
