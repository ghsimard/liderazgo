import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Upload, RefreshCw, ChevronRight, MapPin, Building2, School } from "lucide-react";

interface Entidad {
  id: string;
  nombre: string;
}

interface Municipio {
  id: string;
  nombre: string;
  entidad_territorial_id: string;
}

interface Institucion {
  id: string;
  nombre: string;
  municipio_id: string;
}

interface Region {
  id: string;
  nombre: string;
  entidad_territorial_id: string;
}

export default function AdminGeographyTab() {
  const { toast } = useToast();

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [regionMunicipios, setRegionMunicipios] = useState<{ region_id: string; municipio_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addEntidadOpen, setAddEntidadOpen] = useState(false);
  const [addMunicipioOpen, setAddMunicipioOpen] = useState<string | null>(null); // entidad_id
  const [addInstitucionOpen, setAddInstitucionOpen] = useState<string | null>(null); // municipio_id
  const [addRegionOpen, setAddRegionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Edit dialogs
  const [editItem, setEditItem] = useState<{ type: string; id: string; nombre: string } | null>(null);
  const [editName, setEditName] = useState("");

  // Delete dialog
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; nombre: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Region dialog
  const [regionName, setRegionName] = useState("");
  const [regionEntidad, setRegionEntidad] = useState("");
  const [regionSelectedMunicipios, setRegionSelectedMunicipios] = useState<string[]>([]);
  const [editRegion, setEditRegion] = useState<Region | null>(null);

  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [e, m, i, r, rm] = await Promise.all([
      supabase.from("entidades_territoriales").select("*").order("nombre"),
      supabase.from("municipios").select("*").order("nombre"),
      supabase.from("instituciones").select("*").order("nombre"),
      supabase.from("regiones").select("*").order("nombre"),
      supabase.from("region_municipios").select("*"),
    ]);
    setEntidades(e.data ?? []);
    setMunicipios(m.data ?? []);
    setInstituciones(i.data ?? []);
    setRegiones(r.data ?? []);
    setRegionMunicipios(rm.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD helpers ──────────────────────────────────────────────
  const addEntidad = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("entidades_territoriales").insert({ nombre: newName.trim() });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Entidad creada" }); setAddEntidadOpen(false); setNewName(""); fetchAll(); }
    setSaving(false);
  };

  const addMunicipio = async () => {
    if (!newName.trim() || !addMunicipioOpen) return;
    setSaving(true);
    const { error } = await supabase.from("municipios").insert({ nombre: newName.trim(), entidad_territorial_id: addMunicipioOpen });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Municipio creado" }); setAddMunicipioOpen(null); setNewName(""); fetchAll(); }
    setSaving(false);
  };

  const addInstitucion = async () => {
    if (!newName.trim() || !addInstitucionOpen) return;
    setSaving(true);
    const { error } = await supabase.from("instituciones").insert({ nombre: newName.trim(), municipio_id: addInstitucionOpen });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Institución creada" }); setAddInstitucionOpen(null); setNewName(""); fetchAll(); }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    setSaving(true);
    const table = editItem.type === "entidad" ? "entidades_territoriales" : editItem.type === "municipio" ? "municipios" : "instituciones";
    const { error } = await supabase.from(table).update({ nombre: editName.trim() }).eq("id", editItem.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Actualizado" }); setEditItem(null); fetchAll(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    const table = deleteItem.type === "entidad" ? "entidades_territoriales"
      : deleteItem.type === "municipio" ? "municipios"
      : deleteItem.type === "institucion" ? "instituciones"
      : "regiones";
    const { error } = await supabase.from(table).delete().eq("id", deleteItem.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); setDeleteItem(null); fetchAll(); }
    setDeleteLoading(false);
  };

  // ── Region CRUD ───────────────────────────────────────────────
  const openRegionDialog = (region?: Region) => {
    if (region) {
      setEditRegion(region);
      setRegionName(region.nombre);
      setRegionEntidad(region.entidad_territorial_id);
      setRegionSelectedMunicipios(regionMunicipios.filter(rm => rm.region_id === region.id).map(rm => rm.municipio_id));
    } else {
      setEditRegion(null);
      setRegionName("");
      setRegionEntidad("");
      setRegionSelectedMunicipios([]);
    }
    setAddRegionOpen(true);
  };

  const saveRegion = async () => {
    if (!regionName.trim() || !regionEntidad) return;
    setSaving(true);

    if (editRegion) {
      // Update region
      await supabase.from("regiones").update({ nombre: regionName.trim(), entidad_territorial_id: regionEntidad }).eq("id", editRegion.id);
      // Sync municipios
      await supabase.from("region_municipios").delete().eq("region_id", editRegion.id);
      if (regionSelectedMunicipios.length > 0) {
        await supabase.from("region_municipios").insert(
          regionSelectedMunicipios.map(mid => ({ region_id: editRegion.id, municipio_id: mid }))
        );
      }
      toast({ title: "Región actualizada" });
    } else {
      // Create region
      const { data, error } = await supabase.from("regiones").insert({ nombre: regionName.trim(), entidad_territorial_id: regionEntidad }).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      if (regionSelectedMunicipios.length > 0 && data) {
        await supabase.from("region_municipios").insert(
          regionSelectedMunicipios.map(mid => ({ region_id: data.id, municipio_id: mid }))
        );
      }
      toast({ title: "Región creada" });
    }

    setAddRegionOpen(false);
    fetchAll();
    setSaving(false);
  };

  // ── CSV Import ────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast({ title: "Archivo vacío o sin datos", variant: "destructive" });
      return;
    }

    // Parse header
    const header = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.replace(/"/g, "").trim());
    const entidadIdx = header.findIndex(h => h.includes("entidad"));
    const municipioIdx = header.findIndex(h => h.includes("municipio"));
    const institucionIdx = header.findIndex(h => h.includes("institucion") || h.includes("institución"));

    if (entidadIdx === -1 || municipioIdx === -1) {
      toast({ title: "El archivo debe tener columnas 'entidad' y 'municipio'", variant: "destructive" });
      return;
    }

    setSaving(true);
    let created = { entidades: 0, municipios: 0, instituciones: 0 };

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map(c => c.replace(/"/g, "").trim());
      const entidadName = cols[entidadIdx];
      const municipioName = cols[municipioIdx];
      const institucionName = institucionIdx >= 0 ? cols[institucionIdx] : "";

      if (!entidadName || !municipioName) continue;

      // Upsert entidad
      let { data: entidad } = await supabase.from("entidades_territoriales").select("id").eq("nombre", entidadName).maybeSingle();
      if (!entidad) {
        const { data } = await supabase.from("entidades_territoriales").insert({ nombre: entidadName }).select("id").single();
        entidad = data;
        created.entidades++;
      }
      if (!entidad) continue;

      // Upsert municipio
      let { data: municipio } = await supabase.from("municipios").select("id").eq("nombre", municipioName).eq("entidad_territorial_id", entidad.id).maybeSingle();
      if (!municipio) {
        const { data } = await supabase.from("municipios").insert({ nombre: municipioName, entidad_territorial_id: entidad.id }).select("id").single();
        municipio = data;
        created.municipios++;
      }
      if (!municipio) continue;

      // Upsert institucion if present
      if (institucionName) {
        const { data: existing } = await supabase.from("instituciones").select("id").eq("nombre", institucionName).eq("municipio_id", municipio.id).maybeSingle();
        if (!existing) {
          await supabase.from("instituciones").insert({ nombre: institucionName, municipio_id: municipio.id });
          created.instituciones++;
        }
      }
    }

    toast({
      title: "Importación completada",
      description: `${created.entidades} entidades, ${created.municipios} municipios, ${created.instituciones} instituciones creadas`,
    });
    setSaving(false);
    setImportOpen(false);
    fetchAll();
  };

  const municipiosByEntidad = (entidadId: string) => municipios.filter(m => m.entidad_territorial_id === entidadId);
  const institucionesByMunicipio = (municipioId: string) => instituciones.filter(i => i.municipio_id === municipioId);

  if (loading) {
    return <div className="flex justify-center py-10"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { setNewName(""); setAddEntidadOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Entidad
        </Button>
        <Button size="sm" variant="outline" onClick={() => openRegionDialog()} className="gap-1.5">
          <MapPin className="w-4 h-4" /> Región
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
          <Upload className="w-4 h-4" /> Importar CSV
        </Button>
      </div>

      {/* Regiones section */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Regiones</h3>
        <div className="rounded-lg border bg-background overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Entidad Territorial</TableHead>
                <TableHead>Municipios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regiones.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sin regiones</TableCell></TableRow>
              ) : regiones.map((r) => {
                const entidad = entidades.find(e => e.id === r.entidad_territorial_id);
                const rMunis = regionMunicipios.filter(rm => rm.region_id === r.id);
                const muniNames = rMunis.map(rm => municipios.find(m => m.id === rm.municipio_id)?.nombre).filter(Boolean);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-sm">{entidad?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={muniNames.join(", ")}>
                      {muniNames.length > 0 ? muniNames.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRegionDialog(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteItem({ type: "region", id: r.id, nombre: r.nombre })} className="text-destructive hover:text-destructive" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Entidades → Municipios → Instituciones tree */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Entidades Territoriales</h3>
        <Accordion type="multiple" className="rounded-lg border bg-background">
          {entidades.map((ent) => (
            <AccordionItem key={ent.id} value={ent.id} className="border-b last:border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium">{ent.nombre}</span>
                  <span className="text-xs text-muted-foreground">({municipiosByEntidad(ent.id).length} municipios)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={() => { setNewName(""); setAddMunicipioOpen(ent.id); }} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Municipio
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditItem({ type: "entidad", id: ent.id, nombre: ent.nombre }); setEditName(ent.nombre); }} className="gap-1 text-xs">
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteItem({ type: "entidad", id: ent.id, nombre: ent.nombre })} className="gap-1 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </Button>
                </div>
                {municipiosByEntidad(ent.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground ml-4">Sin municipios</p>
                ) : (
                  <Accordion type="multiple" className="ml-4">
                    {municipiosByEntidad(ent.id).map((mun) => (
                      <AccordionItem key={mun.id} value={mun.id} className="border-b last:border-0">
                        <AccordionTrigger className="py-2 hover:no-underline text-sm">
                          <div className="flex items-center gap-2 flex-1">
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span>{mun.nombre}</span>
                            <span className="text-xs text-muted-foreground">({institucionesByMunicipio(mun.id).length} inst.)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 pb-2">
                          <div className="flex gap-2 mb-2">
                            <Button size="sm" variant="outline" onClick={() => { setNewName(""); setAddInstitucionOpen(mun.id); }} className="gap-1 text-xs">
                              <Plus className="w-3 h-3" /> Institución
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditItem({ type: "municipio", id: mun.id, nombre: mun.nombre }); setEditName(mun.nombre); }} className="gap-1 text-xs">
                              <Pencil className="w-3 h-3" /> Editar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteItem({ type: "municipio", id: mun.id, nombre: mun.nombre })} className="gap-1 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" /> Eliminar
                            </Button>
                          </div>
                          {institucionesByMunicipio(mun.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin instituciones</p>
                          ) : (
                            <ul className="space-y-1">
                              {institucionesByMunicipio(mun.id).map((inst) => (
                                <li key={inst.id} className="flex items-center justify-between group text-sm py-1 px-2 rounded hover:bg-muted/50">
                                  <div className="flex items-center gap-1.5">
                                    <School className="w-3 h-3 text-muted-foreground" />
                                    <span>{inst.nombre}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem({ type: "institucion", id: inst.id, nombre: inst.nombre }); setEditName(inst.nombre); }}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteItem({ type: "institucion", id: inst.id, nombre: inst.nombre })}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────── */}

      {/* Add Entidad */}
      <Dialog open={addEntidadOpen} onOpenChange={(o) => { setAddEntidadOpen(o); if (!o) setNewName(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Entidad Territorial</DialogTitle></DialogHeader>
          <Input placeholder="Nombre de la entidad" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEntidadOpen(false)}>Cancelar</Button>
            <Button onClick={addEntidad} disabled={saving}>{saving ? "Guardando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Municipio */}
      <Dialog open={!!addMunicipioOpen} onOpenChange={(o) => { if (!o) { setAddMunicipioOpen(null); setNewName(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Municipio</DialogTitle>
            <DialogDescription>Para: {entidades.find(e => e.id === addMunicipioOpen)?.nombre}</DialogDescription>
          </DialogHeader>
          <Input placeholder="Nombre del municipio" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMunicipioOpen(null)}>Cancelar</Button>
            <Button onClick={addMunicipio} disabled={saving}>{saving ? "Guardando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Institucion */}
      <Dialog open={!!addInstitucionOpen} onOpenChange={(o) => { if (!o) { setAddInstitucionOpen(null); setNewName(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Institución</DialogTitle>
            <DialogDescription>Para: {municipios.find(m => m.id === addInstitucionOpen)?.nombre}</DialogDescription>
          </DialogHeader>
          <Input placeholder="Nombre de la institución" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInstitucionOpen(null)}>Cancelar</Button>
            <Button onClick={addInstitucion} disabled={saving}>{saving ? "Guardando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar {editItem?.type}</DialogTitle></DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Region Dialog */}
      <Dialog open={addRegionOpen} onOpenChange={(o) => { if (!o) setAddRegionOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRegion ? "Editar" : "Nueva"} Región</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Input placeholder="Nombre de la región" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
            <div>
              <label className="text-sm font-medium mb-1 block">Entidad Territorial</label>
              <select
                value={regionEntidad}
                onChange={(e) => { setRegionEntidad(e.target.value); setRegionSelectedMunicipios([]); }}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Seleccionar…</option>
                {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            {regionEntidad && (
              <div>
                <label className="text-sm font-medium mb-1 block">Municipios incluidos</label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {municipiosByEntidad(regionEntidad).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Esta entidad no tiene municipios</p>
                  ) : (
                    municipiosByEntidad(regionEntidad).map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={regionSelectedMunicipios.includes(m.id)}
                          onChange={(e) => {
                            if (e.target.checked) setRegionSelectedMunicipios(prev => [...prev, m.id]);
                            else setRegionSelectedMunicipios(prev => prev.filter(id => id !== m.id));
                          }}
                          className="accent-primary w-4 h-4"
                        />
                        {m.nombre}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRegionOpen(false)}>Cancelar</Button>
            <Button onClick={saveRegion} disabled={saving || !regionName || !regionEntidad}>{saving ? "Guardando…" : editRegion ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar datos geográficos</DialogTitle>
            <DialogDescription>
              Suba un archivo CSV con las columnas: entidad, municipio, institucion (opcional).
              El separador puede ser coma, punto y coma, o tabulación.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="file" accept=".csv,.txt,.tsv" onChange={handleImport} disabled={saving} />
            {saving && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><RefreshCw className="animate-spin w-4 h-4" /> Importando…</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteItem?.type} "{deleteItem?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará también todos los datos dependientes. Es irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
