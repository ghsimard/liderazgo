import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface Domain {
  id: string;
  key: string;
  label: string;
  sort_order: number;
}

export default function AdminDomainsManager() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDomain, setEditDomain] = useState<Partial<Domain> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("domains_360")
      .select("*")
      .order("sort_order");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDomains((data as Domain[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!editDomain?.key?.trim() || !editDomain?.label?.trim()) {
      toast({ title: "Campos requeridos", description: "Clave y etiqueta son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editDomain.id) {
        const { error } = await supabase.from("domains_360").update({
          key: editDomain.key,
          label: editDomain.label,
          sort_order: editDomain.sort_order ?? 0,
        }).eq("id", editDomain.id);
        if (error) throw error;
        toast({ title: "Dominio actualizado" });
      } else {
        const { error } = await supabase.from("domains_360").insert({
          key: editDomain.key,
          label: editDomain.label,
          sort_order: editDomain.sort_order ?? domains.length + 1,
        });
        if (error) throw error;
        toast({ title: "Dominio creado" });
      }
      setEditDomain(null);
      fetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("domains_360").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Dominio eliminado" });
      setDeleteId(null);
      fetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Dominios de Gestión</h3>
        <Button size="sm" onClick={() => setEditDomain({ key: "", label: "", sort_order: domains.length + 1 })} className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        {domains.map((d) => (
          <div key={d.id} className="flex items-center gap-3 p-3">
            <span className="text-xs text-muted-foreground w-8 text-center">{d.sort_order}</span>
            <div className="flex-1">
              <span className="text-sm font-medium">{d.label}</span>
              <span className="text-xs text-muted-foreground ml-2">({d.key})</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDomain(d)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {domains.length === 0 && <p className="text-sm text-muted-foreground p-4">Sin dominios configurados.</p>}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={!!editDomain} onOpenChange={(o) => !o && setEditDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDomain?.id ? "Editar" : "Nuevo"} Dominio</DialogTitle>
            <DialogDescription>Configure la clave interna y la etiqueta visible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Clave (interna)</label>
              <Input value={editDomain?.key ?? ""} onChange={(e) => setEditDomain((p) => ({ ...p, key: e.target.value }))} placeholder="gestion_personal" />
            </div>
            <div>
              <label className="text-xs font-medium">Etiqueta</label>
              <Input value={editDomain?.label ?? ""} onChange={(e) => setEditDomain((p) => ({ ...p, label: e.target.value }))} placeholder="Gestión Personal" />
            </div>
            <div>
              <label className="text-xs font-medium">Orden</label>
              <Input type="number" value={editDomain?.sort_order ?? 0} onChange={(e) => setEditDomain((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDomain(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar dominio?</DialogTitle>
            <DialogDescription>Se eliminarán también las competencias asociadas. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
