import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

const STEPS = [
  { file: "images/admin-step1-dashboard.jpg", label: "1. Tablero de Control", desc: "KPIs, gráficos y filtros en cascada por región" },
  { file: "images/admin-step2-fichas.jpg", label: "2. Fichas de Información", desc: "Gestión de datos personales e institucionales" },
  { file: "images/admin-step3-rubricas.jpg", label: "3. Rúbricas de Evaluación", desc: "Asignación de evaluadores y seguimiento por módulo" },
  { file: "images/admin-step4-360.jpg", label: "4. Encuesta 360°", desc: "Monitoreo de recolección y visibilidad por fase" },
  { file: "images/admin-step5-sistema.jpg", label: "5. Sistema", desc: "Cuentas, roles, actividad y configuración" },
];

const STEP_DURATION = 96;
const TITLE_DURATION = 60;

const ScreenStep: React.FC<{ step: typeof STEPS[0]; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const scale = interpolate(enterScale, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const labelY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 18 } }),
    [0, 1], [40, 0]
  );
  const labelOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });
  const floatY = Math.sin(frame * 0.04) * 3;

  return (
    <AbsoluteFill style={{ fontFamily, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        opacity, width: 1300, borderRadius: 16, overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
      }}>
        <div style={{
          background: "#1e293b", height: 36,
          display: "flex", alignItems: "center", paddingLeft: 16, gap: 8,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <Img src={staticFile(step.file)} style={{ width: "100%", display: "block" }} />
      </div>

      <div style={{
        position: "absolute", bottom: 60, left: 80,
        transform: `translateY(${labelY}px)`, opacity: labelOpacity,
      }}>
        <div style={{
          background: "rgba(30, 41, 59, 0.9)", borderRadius: 12,
          padding: "16px 28px", border: "1px solid rgba(148, 163, 184, 0.2)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
            {step.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
            {step.desc}
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 30, right: 80,
        display: "flex", gap: 10, opacity: labelOpacity,
      }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === index ? 28 : 10, height: 10, borderRadius: 5,
            background: i === index ? "#3b82f6" : "rgba(148,163,184,0.3)",
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 18 } }),
    [0, 1], [30, 0]
  );

  return (
    <AbsoluteFill style={{
      fontFamily,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div style={{
        fontSize: 56, fontWeight: 700, color: "#f1f5f9",
        transform: `translateY(${titleY}px)`, opacity: titleOpacity,
      }}>
        Panel de Administración
      </div>
      <div style={{
        fontSize: 24, fontWeight: 400, color: "#64748b", marginTop: 16,
        transform: `translateY(${subtitleY}px)`, opacity: subtitleOpacity,
      }}>
        Programa RLT / CLT · Colombia · 2026
      </div>
    </AbsoluteFill>
  );
};

export const AdminVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_DURATION}>
        <TitleCard />
      </Sequence>
      {STEPS.map((step, i) => (
        <Sequence key={i} from={TITLE_DURATION + i * STEP_DURATION} durationInFrames={STEP_DURATION}>
          <ScreenStep step={step} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
