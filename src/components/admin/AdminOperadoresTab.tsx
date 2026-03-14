import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, UserCog, Edit } from "lucide-react";

interface OperatorPermission {
  id: string;
  cedula: string;
  nombre: string;
  section: string;
  region: string | null;
  entidad: string | null;
  institucion: string | null;
  module_number: number | null;
  created_at: string;
}

const AVAILABLE_SECTIONS = [
  { value: "asistencia", label: "Asistencia" },
  { value: "informe-modulo", label: "Informe de Módulo" },
  { value: "rubricas", label: "Rúbricas" },
  { value: "encuesta360", label: "Encuesta 360°" },
  { value: "fichas-rlt", label: "Fichas de Información" },
  { value: "ambiente-escolar", label: "Ambiente Escolar" },
  { value: "satisfacciones", label: "Satisfacciones" },
  { value: "mel", label: "MEL" },
  { value: "certificaciones", label: "Certificaciones" },
];

export default function AdminOperadoresTab() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<OperatorPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCedula, setFormCedula] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formEntidad, setFormEntidad] = useState("");
  const [formInstitucion, setFormInstitucion] = useState("");
  const [formModule, setFormModule] = useState("");

  // Available regions for dropdown
  const [regiones, setRegiones] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [permsRes, regionesRes] = await Promise.all([
      supabase.from("operator_permissions").select("*").order("cedula").order("section"),
      supabase.from("regiones").select("nombre").order("nombre"),
    ]);
    setPermissions((permsRes.data as OperatorPermission[]) || []);
    setRegiones((regionesRes.data || []).map((r: any) => r.nombre));
    setLoading(false);
  };

  const resetForm = () => {
    setFormCedula("");
    setFormNombre("");
    setFormSection("");
    setFormRegion("");
    setFormEntidad("");
    setFormInstitucion("");
    setFormModule("");
  };

  const handleAdd = async () => {
    if (!formCedula.trim() || !formSection) {
      toast({ title: "Complete los campos requeridos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("operator_permissions").insert({
      cedula: formCedula.trim(),
      nombre: formNombre.trim(),
      section: formSection,
      region: formRegion || null,
      entidad: formEntidad || null,
      institucion: formInstitucion || null,
      module_number: formModule ? parseInt(formModule) : null,
    });
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permiso agregado" });
      resetForm();
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("operator_permissions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permiso eliminado" });
      loadData();
    }
  };

  // Group permissions by cedula
  const grouped = permissions.reduce<Record<string, OperatorPermission[]>>((acc, p) => {
    if (!acc[p.cedula]) acc[p.cedula] = [];
    acc[p.cedula].push(p);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Operadores</h3>
          <p className="text-sm text-muted-foreground">
            Asigne permisos de acceso por cédula a secciones específicas del sistema.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar permiso
        </Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay operadores configurados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([ced, perms]) => (
            <Card key={ced}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  <span className="font-mono">{ced}</span>
                  {perms[0]?.nombre && (
                    <span className="text-muted-foreground font-normal">— {perms[0].nombre}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sección</TableHead>
                      <TableHead>Región</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Institución</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {AVAILABLE_SECTIONS.find((s) => s.value === p.section)?.label || p.section}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.region || "—"}</TableCell>
                        <TableCell className="text-sm">{p.entidad || "—"}</TableCell>
                        <TableCell className="text-sm">{p.institucion || "—"}</TableCell>
                        <TableCell className="text-sm">{p.module_number ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar permiso de operador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cédula *</Label>
                <Input
                  value={formCedula}
                  onChange={(e) => setFormCedula(e.target.value.replace(/\D/g, ""))}
                  placeholder="Número de cédula"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre del operador"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sección *</Label>
              <Select value={formSection} onValueChange={setFormSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una sección" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SECTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Filtros opcionales (dejar vacío = acceso total)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Región</Label>
                  <Select value={formRegion} onValueChange={setFormRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {regiones.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entidad Territorial</Label>
                  <Input
                    value={formEntidad}
                    onChange={(e) => setFormEntidad(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Institución</Label>
                  <Input
                    value={formInstitucion}
                    onChange={(e) => setFormInstitucion(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Módulo</Label>
                  <Input
                    type="number"
                    value={formModule}
                    onChange={(e) => setFormModule(e.target.value)}
                    placeholder="Opcional"
                    min={1}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
