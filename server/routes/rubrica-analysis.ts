import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * POST /api/rubrica-analysis
 * Proxies AI analysis request to Google Gemini (or compatible) API.
 * Requires GEMINI_API_KEY env variable on Render.
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { moduleTitle, moduleNumber, moduleObjective, distribution } = req.body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en el servidor." });
    }

    // Build data summary
    const dataSummary = (distribution || [])
      .map(
        (item: any) =>
          `- ${item.itemType} "${item.itemLabel}": Avanzado ${item.avanzado}%, Intermedio ${item.intermedio}%, Básico ${item.basico}%, Sin evidencia ${item.sinEvidencia}% (n=${item.total})`
      )
      .join("\n");

    const systemPrompt = `Eres un experto en evaluación educativa y liderazgo directivo escolar en Colombia. 
Tu tarea es redactar un párrafo de análisis interpretativo (4-6 oraciones) sobre los resultados de un módulo de rúbrica de evaluación de directivos docentes.
El análisis debe:
1. Identificar fortalezas (ítems con mayor porcentaje en Avanzado/Intermedio)
2. Identificar áreas de mejora (ítems con mayor porcentaje en Básico/Sin evidencia)
3. Ofrecer una interpretación pedagógica de los resultados
4. Usar un tono profesional y constructivo
5. Ser conciso y directo (máximo 150 palabras)
Responde SOLO con el párrafo de análisis, sin títulos ni encabezados.`;

    const userPrompt = `Módulo ${moduleNumber}: "${moduleTitle}"
Objetivo: ${moduleObjective}

Distribución de niveles por ítem (nivel acordado):
${dataSummary}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      return res.status(500).json({ error: "Error del servicio de IA" });
    }

    const data = await response.json();
    const analysis =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.json({ analysis });
  } catch (err: any) {
    console.error("rubrica-analysis error:", err);
    res.status(500).json({ error: err.message || "Error desconocido" });
  }
});

export default router;
