import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, RotateCcw, RefreshCw, ImageIcon } from "lucide-react";
import { APP_IMAGE_CONFIGS, invalidateAppImagesCache, useAppImages } from "@/hooks/useAppImages";
import { apiFetch, getToken } from "@/utils/apiFetch";
import { supabase as cloudClient } from "@/utils/dbClient";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;
const API_BASE = import.meta.env.VITE_API_URL || "";

export default function AdminImagesTab() {
  const { images, loading } = useAppImages();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const markBusy = (key: string, val: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: val }));

  const handleUpload = async (key: string, file: File) => {
    markBusy(key, true);
    try {
      if (USE_EXPRESS) {
        const formData = new FormData();
        formData.append("file", file);
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/images/${key}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error" }));
          throw new Error(err.error || "Upload failed");
        }
      } else {
        // Lovable Cloud: upload to storage then upsert app_images
        const ext = file.name.split(".").pop() || "png";
        const storagePath = `app-images/${key}.${ext}`;
        const { error: upErr } = await cloudClient.storage
          .from("app-images")
          .upload(storagePath, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = cloudClient.storage
          .from("app-images")
          .getPublicUrl(storagePath);
        const { error: dbErr } = await cloudClient
          .from("app_images")
          .upsert(
            { image_key: key, storage_path: urlData.publicUrl, updated_at: new Date().toISOString() },
            { onConflict: "image_key" }
          );
        if (dbErr) throw dbErr;
      }

      invalidateAppImagesCache();
      setRefreshKey((k) => k + 1);
      toast({ title: "Imagen actualizada", description: `Se actualizó "${key}" correctamente.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      markBusy(key, false);
    }
  };

  const handleReset = async (key: string) => {
    markBusy(key, true);
    try {
      if (USE_EXPRESS) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/images/${key}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Error al eliminar");
      } else {
        await cloudClient.from("app_images").delete().eq("image_key", key);
      }

      invalidateAppImagesCache();
      setRefreshKey((k) => k + 1);
      toast({ title: "Imagen restablecida", description: `"${key}" usa ahora la imagen por defecto.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      markBusy(key, false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Gestión de imágenes</h3>
        <p className="text-sm text-muted-foreground">
          Visualice, reemplace o restablezca los logos e íconos utilizados en la aplicación y los PDFs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {APP_IMAGE_CONFIGS.map((cfg) => {
          const src = images[cfg.key] || cfg.fallback;
          const isBusy = busy[cfg.key] || false;

          return (
            <Card key={`${cfg.key}-${refreshKey}`} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{cfg.label}</CardTitle>
                <CardDescription className="text-xs">{cfg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Preview */}
                <div className="flex items-center justify-center rounded-md border bg-muted/30 p-4 min-h-[80px]">
                  <img
                    src={src}
                    alt={cfg.label}
                    className="max-h-16 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = cfg.fallback;
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <input
                    ref={(el) => { fileRefs.current[cfg.key] = el; }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(cfg.key, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isBusy}
                    onClick={() => fileRefs.current[cfg.key]?.click()}
                  >
                    {isBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Subir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={() => handleReset(cfg.key)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Defecto
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
