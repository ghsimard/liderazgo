import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { moduleTitle, moduleNumber, moduleObjective, distribution } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a data summary for the AI
    const dataSummary = distribution
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intente más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Agregue fondos en Configuración." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rubrica-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
