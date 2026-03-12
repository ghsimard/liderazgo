import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reportTitle, filterType, filterModule, filterRegion, totalResponses, sectionTitles, generalSatisfaction, overallSatisfaction, commentsCount } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Eres un experto en evaluación educativa del Programa Rectores Líderes Transformadores (RLT) en Colombia. 
Genera un RESUMEN EJECUTIVO (Executive Summary) profesional y conciso para el siguiente informe de satisfacción.

Datos del informe:
- Título: ${reportTitle}
- Tipo de encuesta: ${filterType}
- Módulo: ${filterModule}
- Región: ${filterRegion}
- Total de respuestas: ${totalResponses}
- Secciones del informe: ${sectionTitles.join(", ")}
- Nivel general de satisfacción: ${overallSatisfaction}%
${generalSatisfaction.map((g: any) => `  - ${g.label}: ${g.value}%`).join("\n")}
- Cantidad de comentarios textuales: ${commentsCount}

Instrucciones:
- Escribe en español formal, en tercera persona
- Máximo 3 párrafos (150-250 palabras)
- Incluye: contexto breve, hallazgos principales, nivel de satisfacción, y una conclusión/recomendación clave
- No uses viñetas, solo prosa fluida
- No incluyas título "Resumen Ejecutivo", solo el contenido`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un redactor experto en informes de evaluación educativa en América Latina." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
