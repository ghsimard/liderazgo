import { useAppImages } from "@/hooks/useAppImages";

export default function AppFooter() {
  const { images } = useAppImages();
  const logoCosmo = images.logo_cosmo;

  return (
    <footer className="py-5 text-center" style={{ background: "hsl(var(--primary))" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white rounded-xl px-6 py-3 shadow-md inline-flex items-center justify-center">
          <img
            src={logoCosmo}
            alt="Cosmo Schools"
            className="h-9 w-auto object-contain"
          />
        </div>
        <p className="text-white text-xs opacity-60">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
