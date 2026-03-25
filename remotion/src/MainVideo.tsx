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
  { file: "images/step1-login.png", label: "1. Ingreso con cédula", desc: "El evaluador ingresa su número de cédula" },
  { file: "images/step2-panel.png", label: "2. Mi Panel", desc: "Vista del panel del evaluador" },
  { file: "images/step3-encuestas.png", label: "3. Encuestas 360° — Entrada", desc: "Lista de instituciones asignadas" },
  { file: "images/step4-expanded.png", label: "4. Institución desplegada", desc: "Directivos visibles con su cédula" },
];

const STEP_DURATION = 105; // 3.5s per step
const TRANSITION = 20;
const TITLE_DURATION = 60; // 2s title card

const ScreenStep: React.FC<{ step: typeof STEPS[0]; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const scale = interpolate(enterScale, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Label slide in
  const labelY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 18 } }),
    [0, 1],
    [40, 0]
  );
  const labelOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  // Subtle float
  const floatY = Math.sin(frame * 0.04) * 3;

  // Cursor animation for step 1 (typing) and step 3 (clicking to expand)
  const showCursor = index === 0 || index === 2;
  const cursorOpacity = showCursor ? interpolate(frame, [30, 40], [0, 1], { extrapolateRight: "clamp" }) : 0;

  let cursorX = 0, cursorY = 0;
  if (index === 0) {
    // Cursor moves to cédula input
    cursorX = interpolate(frame, [40, 60], [400, 0], { extrapolateRight: "clamp" });
    cursorY = interpolate(frame, [40, 60], [200, 0], { extrapolateRight: "clamp" });
  } else if (index === 2) {
    // Cursor moves to first institution
    cursorX = interpolate(frame, [40, 60], [300, -50], { extrapolateRight: "clamp" });
    cursorY = interpolate(frame, [40, 60], [100, -80], { extrapolateRight: "clamp" });
  }

  // Pulse ring on cursor at click moment
  const clickFrame = 65;
  const clickRing = index === 2 ? interpolate(frame, [clickFrame, clickFrame + 15], [0, 30], { extrapolateRight: "clamp" }) : 0;
  const clickRingOpacity = index === 2 ? interpolate(frame, [clickFrame, clickFrame + 15], [0.6, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ fontFamily, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Screenshot */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        opacity,
        width: 1300,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
      }}>
        {/* macOS title bar */}
        <div style={{
          background: "#1e293b",
          height: 36,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          gap: 8,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <Img src={staticFile(step.file)} style={{ width: "100%", display: "block" }} />
      </div>

      {/* Cursor */}
      {showCursor && (
        <div style={{
          position: "absolute",
          top: `calc(50% + ${cursorY}px)`,
          left: `calc(50% + ${cursorX}px)`,
          opacity: cursorOpacity,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}>
          {/* Click ring */}
          {clickRing > 0 && (
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: clickRing * 2,
              height: clickRing * 2,
              borderRadius: "50%",
              border: "2px solid #60a5fa",
              opacity: clickRingOpacity,
            }} />
          )}
          {/* Cursor dot */}
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(96, 165, 250, 0.8)",
            border: "2px solid white",
            boxShadow: "0 0 20px rgba(96,165,250,0.5)",
          }} />
        </div>
      )}

      {/* Step label */}
      <div style={{
        position: "absolute",
        bottom: 60,
        left: 80,
        transform: `translateY(${labelY}px)`,
        opacity: labelOpacity,
      }}>
        <div style={{
          background: "rgba(30, 41, 59, 0.9)",
          backdropFilter: "none",
          borderRadius: 12,
          padding: "16px 28px",
          border: "1px solid rgba(148, 163, 184, 0.2)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
            {step.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
            {step.desc}
          </div>
        </div>
      </div>

      {/* Step indicator dots */}
      <div style={{
        position: "absolute",
        bottom: 30,
        right: 80,
        display: "flex",
        gap: 10,
        opacity: labelOpacity,
      }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === index ? 28 : 10,
            height: 10,
            borderRadius: 5,
            background: i === index ? "#3b82f6" : "rgba(148,163,184,0.3)",
            transition: "none",
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
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
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
        Encuestas 360° — Flujo del Evaluador
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

export const MainVideo: React.FC = () => {
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
