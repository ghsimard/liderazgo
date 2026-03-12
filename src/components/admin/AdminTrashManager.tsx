import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Undo2, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

interface DeletedRecord {
  id: string;
  record_type: string;
  record_label: string;
  deleted_data: any;
  deleted_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  domain: "Dominio",
  competency: "Competencia",
  item: "Ítem",
  encuesta_360: "Encuesta 360",
  ficha_rlt: "Ficha RLT",
  region: "Región",
  entidad_territorial: "Entidad Territorial",
  municipio: "Municipio",
  institucion: "Institución",
  admin_user: "Administrador",
  satisfaccion_response: "Respuesta Satisfacción",
};

export default function AdminTrashManager() {
  const { toast } = useToast();
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  // User restore dialog (needs new password)
  const [userRestoreRecord, setUserRestoreRecord] = useState<DeletedRecord | null>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [userRestoreLoading, setUserRestoreLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deleted_records")
      .select("*")
      .order("deleted_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setRecords((data as DeletedRecord[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRestore = async (record: DeletedRecord) => {
    // Admin users need a password — show dialog instead
    if (record.record_type === "admin_user") {
      setUserRestoreRecord(record);
      setRestorePassword("");
      setShowRestorePassword(false);
      return;
    }

    setRestoring(record.id);
    try {
      const d = record.deleted_data;

      if (record.record_type === "domain") {
        await supabase.from("domains_360").insert(d.domain);
        if (d.competencies?.length > 0) await supabase.from("competencies_360").insert(d.competencies);
        if (d.items?.length > 0) await supabase.from("items_360").insert(d.items);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "competency") {
        await supabase.from("competencies_360").insert(d.competency);
        if (d.items?.length > 0) await supabase.from("items_360").insert(d.items);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "item") {
        await supabase.from("items_360").insert(d.item);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "encuesta_360") {
        const { id, ...rest } = d;
        await supabase.from("encuestas_360").insert([{ id, ...rest }]);
      } else if (record.record_type === "ficha_rlt") {
        const { ficha, encuestas, rubrica_evaluaciones, rubrica_asignaciones, rubrica_submission_dates, rubrica_seguimientos } = d;
        await supabase.from("fichas_rlt").insert([ficha]);
        if (encuestas?.length > 0) {
          await supabase.from("encuestas_360").insert(encuestas);
        }
        if (rubrica_evaluaciones?.length > 0) await supabase.from("rubrica_evaluaciones").insert(rubrica_evaluaciones);
        if (rubrica_asignaciones?.length > 0) await supabase.from("rubrica_asignaciones").insert(rubrica_asignaciones);
        if (rubrica_submission_dates?.length > 0) await supabase.from("rubrica_submission_dates").insert(rubrica_submission_dates);
        if (rubrica_seguimientos?.length > 0) await supabase.from("rubrica_seguimientos").insert(rubrica_seguimientos);
      } else if (record.record_type === "region") {
        if (d.region) await supabase.from("regiones").insert([d.region]);
        if (d.entidades?.length > 0) await supabase.from("region_entidades").insert(d.entidades.map(({ id, ...rest }: any) => rest));
        if (d.municipios?.length > 0) await supabase.from("region_municipios").insert(d.municipios.map(({ id, ...rest }: any) => rest));
        if (d.instituciones?.length > 0) await supabase.from("region_instituciones").insert(d.instituciones.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "entidad_territorial") {
        if (d.entidad) await supabase.from("entidades_territoriales").insert([d.entidad]);
        if (d.municipios?.length > 0) await supabase.from("municipios").insert(d.municipios);
        if (d.instituciones?.length > 0) await supabase.from("instituciones").insert(d.instituciones);
        if (d.region_entidades?.length > 0) await supabase.from("region_entidades").insert(d.region_entidades.map(({ id, ...rest }: any) => rest));
        if (d.region_municipios?.length > 0) await supabase.from("region_municipios").insert(d.region_municipios.map(({ id, ...rest }: any) => rest));
        if (d.region_instituciones?.length > 0) await supabase.from("region_instituciones").insert(d.region_instituciones.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "municipio") {
        if (d.municipio) await supabase.from("municipios").insert([d.municipio]);
        if (d.instituciones?.length > 0) await supabase.from("instituciones").insert(d.instituciones);
        if (d.region_municipios?.length > 0) await supabase.from("region_municipios").insert(d.region_municipios.map(({ id, ...rest }: any) => rest));
        if (d.region_instituciones?.length > 0) await supabase.from("region_instituciones").insert(d.region_instituciones.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "institucion") {
        if (d.institucion) await supabase.from("instituciones").insert([d.institucion]);
        if (d.region_instituciones?.length > 0) await supabase.from("region_instituciones").insert(d.region_instituciones.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "satisfaccion_response") {
        const { id, ...rest } = d;
        await supabase.from("satisfaccion_responses").insert([{ id, ...rest }]);
      }

      await supabase.from("deleted_records").delete().eq("id", record.id);
      toast({ title: "Restaurado", description: `${TYPE_LABELS[record.record_type]} "${record.record_label}" restaurado(a) correctamente.` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error al restaurar", description: err.message, variant: "destructive" });
    }
    setRestoring(null);
  };

  const handleRestoreUser = async () => {
    if (!userRestoreRecord || !restorePassword) return;
    setUserRestoreLoading(true);
    try {
      const d = userRestoreRecord.deleted_data;
      if (USE_EXPRESS) {
        const { error } = await apiFetch("/api/users", {
          method: "POST",
          body: { email: d.email, password: restorePassword, role: d.role || "admin" },
        });
        if (error) throw new Error(error);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke("create-user", {
          body: {
            email: d.email,
            password: restorePassword,
            makeAdmin: true,
            makeSuperAdmin: d.role === "superadmin",
          },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
      }

      await supabase.from("deleted_records").delete().eq("id", userRestoreRecord.id);
      toast({ title: "Administrador restaurado", description: `${d.email} ha sido recreado con una nueva contraseña.` });
      setUserRestoreRecord(null);
      setRestorePassword("");
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error al restaurar", description: err.message, variant: "destructive" });
    }
    setUserRestoreLoading(false);
  };

  const handlePurge = async () => {
    if (!purgeId) return;
    try {
      await supabase.from("deleted_records").delete().eq("id", purgeId);
      toast({ title: "Eliminado permanentemente" });
      setPurgeId(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePurgeAll = async () => {
    try {
      await supabase.from("deleted_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast({ title: "Papelera vaciada", description: "Todos los registros han sido eliminados permanentemente." });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Papelera</h3>
          <p className="text-xs text-muted-foreground mt-1">Elementos eliminados que pueden ser restaurados.</p>
        </div>
        <div className="flex gap-2">
          {records.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="w-4 h-4" /> Vaciar papelera
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Vaciar toda la papelera?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán permanentemente {records.length} registro(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePurgeAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Vaciar papelera
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">La papelera está vacía.</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <Badge variant="outline" className="text-xs shrink-0">{TYPE_LABELS[r.record_type] ?? r.record_type}</Badge>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{r.record_label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(r.deleted_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={restoring === r.id}
                onClick={() => handleRestore(r)}
              >
                {restoring === r.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Restaurar
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPurgeId(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Purge confirm */}
      <Dialog open={!!purgeId} onOpenChange={(o) => !o && setPurgeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar permanentemente?</DialogTitle>
            <DialogDescription>Esta acción eliminará el registro de la papelera de forma definitiva. No podrá ser restaurado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handlePurge}>Eliminar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore user dialog (needs new password) */}
      <Dialog open={!!userRestoreRecord} onOpenChange={(o) => { if (!o) { setUserRestoreRecord(null); setRestorePassword(""); setShowRestorePassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar administrador</DialogTitle>
            <DialogDescription>
              Se recreará la cuenta <strong>{userRestoreRecord?.deleted_data?.email}</strong> con el rol <strong>{userRestoreRecord?.deleted_data?.role}</strong>. Ingresa una nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              type={showRestorePassword ? "text" : "password"}
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              className="pr-10"
            />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10" onClick={() => setShowRestorePassword(!showRestorePassword)} tabIndex={-1}>
              {showRestorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserRestoreRecord(null)}>Cancelar</Button>
            <Button onClick={handleRestoreUser} disabled={userRestoreLoading || restorePassword.length < 6}>
              {userRestoreLoading ? "Restaurando…" : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
