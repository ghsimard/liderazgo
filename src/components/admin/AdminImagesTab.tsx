import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/dbClient";
import { useToast } from "@/hooks/use-toast";
import { APP_IMAGE_CONFIGS, invalidateAppImagesCache, useAppImages } from "@/hooks/useAppImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, RotateCcw, Loader2 } from "lucide-react";
import { apiFetch, getToken } from "@/utils/apiFetch";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export default function AdminImagesTab() {
  const { toast } = useToast();
  const { images, loading } = useAppImages();
  const [uploading, setUploading] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (imageKey: string, file: File) => {
    setUploading(imageKey);
    try {
      let publicUrl: string;

      if (USE_EXPRESS) {
        // ── Render / Express mode ──
        // Use the dedicated /api/images/:imageKey endpoint which handles
        // both file storage and DB upsert in a single call.
        const token = getToken();
        if (!token) throw new Error("Session admin expirée. Reconnectez-vous.");

        const formData = new FormData();
        formData.append("file", file);

        const apiUrl = import.meta.env.VITE_API_URL as string;
        const resp = await fetch(`${apiUrl}/api/images/${imageKey}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: resp.statusText }));
          throw new Error(err.error || resp.statusText);
        }

        const result = await resp.json();
        // The Express route returns { image_key, storage_path } where
        // storage_path is like "/uploads/logo_rlt.png"
        publicUrl = result.storage_path;
      } else {
        // ── Lovable Cloud / Supabase mode ──
        const ext = file.name.split(".").pop() || "png";
        const storagePath = `${imageKey}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("app-images")
          .upload(storagePath, file, { upsert: true, cacheControl: "0" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("app-images").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;

        // Upsert metadata row with the full URL
        const { error: dbError } = await supabase
          .from("app_images")
          .upsert(
            { image_key: imageKey, storage_path: publicUrl, updated_at: new Date().toISOString() },
            { onConflict: "image_key" }
          );

        if (dbError) throw dbError;
      }

      // Show new image locally (bust cache)
      setLocalOverrides((prev) => ({ ...prev, [imageKey]: `${publicUrl}?t=${Date.now()}` }));
      invalidateAppImagesCache();

      toast({ title: "Image mise à jour", description: `${imageKey} a été remplacée.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setUploading(null);
  };

  const handleReset = async (imageKey: string) => {
    setUploading(imageKey);
    try {
      if (USE_EXPRESS) {
        // ── Render / Express mode ──
        const token = getToken();
        if (!token) throw new Error("Session admin expirée. Reconnectez-vous.");

        const apiUrl = import.meta.env.VITE_API_URL as string;
        const resp = await fetch(`${apiUrl}/api/images/${imageKey}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: resp.statusText }));
          throw new Error(err.error || resp.statusText);
        }
      } else {
        // ── Lovable Cloud / Supabase mode ──
        const { data: existing } = await supabase
          .from("app_images")
          .select("storage_path")
          .eq("image_key", imageKey)
          .maybeSingle();

        if (existing) {
          await supabase.storage.from("app-images").remove([existing.storage_path]);
        }
        await supabase.from("app_images").delete().eq("image_key", imageKey);
      }

      setLocalOverrides((prev) => {
        const copy = { ...prev };
        delete copy[imageKey];
        return copy;
      });
      invalidateAppImagesCache();
      toast({ title: "Image réinitialisée", description: `${imageKey} utilise maintenant l'image par défaut.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setUploading(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Remplacez les logos et images de l'application. Cliquez sur « Téléverser » pour choisir un nouveau fichier. « Réinitialiser » restaure l'image par défaut.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {APP_IMAGE_CONFIGS.map((config) => {
          const currentSrc = localOverrides[config.key] || images[config.key];
          const isUploading = uploading === config.key;
          const hasCustom = localOverrides[config.key] || (images[config.key] !== config.fallback);
          const isDarkBg = config.label.includes("fond foncé");

          return (
            <Card key={config.key} className="overflow-hidden">
              <div className={cn("flex items-center justify-center h-32 p-4", isDarkBg ? "bg-gray-800" : "bg-muted/50")}>
                <img
                  src={currentSrc}
                  alt={config.label}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = config.fallback; }}
                />
              </div>
              <CardContent className="p-4 space-y-2">
                <h4 className="font-medium text-sm">{config.label}</h4>
                <p className="text-xs text-muted-foreground">{config.description}</p>
                <div className="flex gap-2">
                  <input
                    ref={(el) => { fileInputRefs.current[config.key] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(config.key, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[config.key]?.click()}
                    className="gap-1.5 flex-1"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Téléverser
                  </Button>
                  {hasCustom && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isUploading}
                      onClick={() => handleReset(config.key)}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> Réinitialiser
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
