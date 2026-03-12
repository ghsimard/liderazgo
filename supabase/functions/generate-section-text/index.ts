import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sectionType, sectionTitle, chartData, generalStats, filterType, filterModule, filterRegion, totalResponses, comments, overallSatisfaction } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    } else {
      throw new Error(`Tipo de sección no soportado: ${sectionType}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un redactor experto en informes de evaluación educativa en América Latina. Respondes exclusivamente en español." },
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
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
