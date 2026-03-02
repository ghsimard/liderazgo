import logoCosmoFooter from "@/assets/logo_cosmo_dark.png";

export default function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-50 py-3 text-center" style={{ background: "hsl(var(--primary))" }}>
      <div className="flex flex-col items-center gap-2">
        <img
          src={logoCosmoFooter}
          alt="Cosmo Schools"
          className="h-9 w-auto object-contain"
        />
        <p className="text-white text-xs opacity-60">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
