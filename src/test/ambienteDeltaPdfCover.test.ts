import { describe, it, expect, vi } from "vitest";
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

function makeData(cohorteNombre: string) {
  return {
    cohorteNombre,
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
        sections: [
          { title: "Ambiente de aprendizaje", ini: 3.2, evo: 3.6, delta: 0.4 },
        ],
      },
    ],
    institucionDeltas: [],
    regionesLabel: "Todas",
  };
}

describe("Ambiente Delta PDF cover", () => {
  it("generates a PDF with a long cohorte name without throwing", async () => {
    const blob = await generarPDFAmbienteDelta(
      makeData("Rionegro 2025, Itagüí 2025, Medellín 2025, Oriente 2026, Quibdó 2026"),
      {
        logoRLT: tinyPng,
        logoCLT: tinyPng,
        logoCosmo: tinyPng,
        showLogoRLT: true,
        showLogoCLT: true,
      },
      { returnBlob: true }
    );
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).size).toBeGreaterThan(0);
  });

  it("generates a PDF with a single cohorte name without throwing", async () => {
    const blob = await generarPDFAmbienteDelta(
      makeData("Rionegro 2025"),
      {
        logoRLT: tinyPng,
        logoCLT: tinyPng,
        logoCosmo: tinyPng,
        showLogoRLT: true,
        showLogoCLT: true,
      },
      { returnBlob: true }
    );
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).size).toBeGreaterThan(0);
  });
});
