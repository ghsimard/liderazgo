import { describe, it, vi } from "vitest";
import { generarPDFAmbienteDelta } from "@/utils/ambienteDeltaPdfGenerator";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

vi.mock("@/utils/pdfLogoHelper", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/utils/pdfLogoHelper")>();
  return {
    ...mod,
    loadPdfLogos: vi.fn(() =>
      Promise.resolve({
        rltB64: tinyPng,
        cltB64: tinyPng,
        cosmoB64: tinyPng,
        rltSize: { width: 1, height: 1 },
        cltSize: { width: 1, height: 1 },
        cosmoSize: { width: 1, height: 1 },
        showRlt: true,
        showClt: true,
      })
    ),
  };
});

async function writePdf(path: string) {
  const data: any = {
    cohorteNombre: "Rionegro 2025",
    maxScore: 5,
    cohortIni: 3.2,
    cohortEvo: 3.6,
    cohortDelta: 0.4,
    groups: [
      {
        grupo: "docentes",
        countIni: 10,
        countEvo: 12,
        iniGlobal: 3.1,
        evoGlobal: 3.5,
        deltaGlobal: 0.4,
        sections: [{ title: "Ambiente de aprendizaje", ini: 3.2, evo: 3.6, delta: 0.4 }],
      },
    ],
    institucionDeltas: [],
    regionesLabel: "Todas",
    analysisHtml:
      `<p>La cohorte presenta un <strong>avance general positivo</strong> de <em>+0.40 puntos</em> entre la fase Inicial y la de Evolución. Este resultado refleja un clima escolar que ha mejorado de manera moderada.</p>` +
      `<p>Entre las fortalezas destacadas se encuentran:</p>` +
      `<ul><li><strong>Ambiente de aprendizaje:</strong> mejora de 0.40 pt, reflejo de mayores oportunidades de participación y retroalimentación entre docentes y estudiantes.</li>` +
      `<li><strong>Relaciones interpersonales:</strong> estancamiento menor a 0.2 pt, lo cual requiere atención en los próximos ciclos.</li></ul>` +
      `<p>Se recomienda <em>reforzar los espacios de diálogo</em> en el corto plazo para consolidar los avances.</p>`,
  };
  const blob = await generarPDFAmbienteDelta(
    data,
    {
      logoRLT: tinyPng,
      logoCLT: tinyPng,
      logoCosmo: tinyPng,
      showLogoRLT: true,
      showLogoCLT: true,
    },
    { returnBlob: true }
  );
  const fs = await import("fs");
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob as Blob);
  });
  const base64 = dataUrl.split(",")[1];
  fs.writeFileSync(path, Buffer.from(base64, "base64"));
}

describe("QA - PDF analysis", () => {
  it("writes analysis PDF", async () => {
    await writePdf("/tmp/qa-delta-analysis.pdf");
  });
});
