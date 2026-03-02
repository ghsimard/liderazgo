import logoCosmoFooter from "@/assets/logo_cosmo_dark.png";

export default function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-50 py-3" style={{ background: "hsl(var(--primary))" }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        <img
          src={logoCosmoFooter}
          alt="Cosmo Schools"
          className="h-8 w-auto object-contain"
        />
        <p className="text-white text-xs opacity-60">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
