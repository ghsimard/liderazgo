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
import { Progress } from "@/components/ui/progress";

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
  const [regionInstituciones, setRegionInstituciones] = useState<{ region_id: string; institucion_id: string }[]>([]);
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
  const [regionSelectedInstituciones, setRegionSelectedInstituciones] = useState<string[]>([]);
  const [editRegion, setEditRegion] = useState<Region | null>(null);

  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Accordion open state to preserve focus after CRUD operations
  const [openEntidades, setOpenEntidades] = useState<string[]>([]);
  const [openMunicipios, setOpenMunicipios] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [e, m, i, r, rm, ri] = await Promise.all([
      supabase.from("entidades_territoriales").select("*").order("nombre"),
      supabase.from("municipios").select("*").order("nombre"),
      supabase.from("instituciones").select("*").order("nombre"),
      supabase.from("regiones").select("*").order("nombre"),
      supabase.from("region_municipios").select("*"),
      supabase.from("region_instituciones").select("*"),
    ]);
    setEntidades(e.data ?? []);
    setMunicipios(m.data ?? []);
    setInstituciones(i.data ?? []);
    setRegiones(r.data ?? []);
    setRegionMunicipios(rm.data ?? []);
    setRegionInstituciones(ri.data ?? []);
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
    const entidadId = addMunicipioOpen;
    const { error } = await supabase.from("municipios").insert({ nombre: newName.trim(), entidad_territorial_id: entidadId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Municipio creado" });
      // Keep the parent entidad accordion open
      setOpenEntidades(prev => prev.includes(entidadId) ? prev : [...prev, entidadId]);
      setAddMunicipioOpen(null); setNewName(""); fetchAll();
    }
    setSaving(false);
  };

  const addInstitucion = async () => {
    if (!newName.trim() || !addInstitucionOpen) return;
    setSaving(true);
    const munId = addInstitucionOpen;
    const { error } = await supabase.from("instituciones").insert({ nombre: newName.trim(), municipio_id: munId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Institución creada" });
      // Keep the parent municipio accordion open (and its parent entidad)
      const muni = municipios.find(m => m.id === munId);
      if (muni) {
        setOpenEntidades(prev => prev.includes(muni.entidad_territorial_id) ? prev : [...prev, muni.entidad_territorial_id]);
      }
      setOpenMunicipios(prev => prev.includes(munId) ? prev : [...prev, munId]);
      setAddInstitucionOpen(null); setNewName(""); fetchAll();
    }
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
      setRegionSelectedInstituciones(regionInstituciones.filter(ri => ri.region_id === region.id).map(ri => ri.institucion_id));
    } else {
      setEditRegion(null);
      setRegionName("");
      setRegionEntidad("");
      setRegionSelectedMunicipios([]);
      setRegionSelectedInstituciones([]);
    }
    setAddRegionOpen(true);
  };

  const saveRegion = async () => {
    if (!regionName.trim() || !regionEntidad) return;
    setSaving(true);

    const syncInstituciones = async (regionId: string) => {
      await supabase.from("region_instituciones").delete().eq("region_id", regionId);
      if (regionSelectedInstituciones.length > 0) {
        await supabase.from("region_instituciones").insert(
          regionSelectedInstituciones.map(iid => ({ region_id: regionId, institucion_id: iid }))
        );
      }
    };

    if (editRegion) {
      await supabase.from("regiones").update({ nombre: regionName.trim(), entidad_territorial_id: regionEntidad }).eq("id", editRegion.id);
      await supabase.from("region_municipios").delete().eq("region_id", editRegion.id);
      if (regionSelectedMunicipios.length > 0) {
        await supabase.from("region_municipios").insert(
          regionSelectedMunicipios.map(mid => ({ region_id: editRegion.id, municipio_id: mid }))
        );
      }
      await syncInstituciones(editRegion.id);
      toast({ title: "Región actualizada" });
    } else {
      const { data, error } = await supabase.from("regiones").insert({ nombre: regionName.trim(), entidad_territorial_id: regionEntidad }).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      if (data) {
        if (regionSelectedMunicipios.length > 0) {
          await supabase.from("region_municipios").insert(
            regionSelectedMunicipios.map(mid => ({ region_id: data.id, municipio_id: mid }))
          );
        }
        await syncInstituciones(data.id);
      }
      toast({ title: "Región creada" });
    }

    setAddRegionOpen(false);
    fetchAll();
    setSaving(false);
  };

  // ── CSV helpers ────────────────────────────────────────────────
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const detectDelimiter = (headerLine: string): string => {
    // Count occurrences of common delimiters outside quotes
    const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
    let inQuotes = false;
    for (const char of headerLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes && char in counts) counts[char]++;
    }
    // Return the delimiter with the most occurrences
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // ── CSV Import (batch) ─────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast({ title: "Archivo vacío o sin datos", variant: "destructive" });
        return;
      }

      const delimiter = detectDelimiter(lines[0]);

      // Parse header
      const header = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      const entidadIdx = header.findIndex(h => h.includes("entidad"));
      const municipioIdx = header.findIndex(h => h.includes("municipio"));
      const institucionIdx = header.findIndex(h => h.includes("institucion"));

      if (entidadIdx === -1 || municipioIdx === -1) {
        toast({ title: "El archivo debe tener columnas 'entidad' y 'municipio'", variant: "destructive" });
        return;
      }

      setSaving(true);
      setImportProgress({ current: 0, total: 4 }); // 4 phases

      // ── Phase 1: Parse all rows ──
      interface ParsedRow { entidad: string; municipio: string; institucion: string }
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter);
        let entidadName = cols[entidadIdx]?.trim() || "";
        let municipioName = cols[municipioIdx]?.trim() || "";
        const institucionName = institucionIdx >= 0 ? cols[institucionIdx]?.trim() || "" : "";

        // Handle edge case: "Bogotá, D.C." where comma splits the name incorrectly
        // If municipio is empty but the raw line has content, treat the whole line as entidad=municipio
        if (entidadName && !municipioName) {
          // Reconstruct the full value from all columns
          const fullValue = cols.join(delimiter === "," ? ", " : delimiter).trim();
          entidadName = fullValue;
          municipioName = fullValue;
        }

        if (!entidadName || !municipioName) continue;
        rows.push({ entidad: entidadName, municipio: municipioName, institucion: institucionName });
      }

      // ── Phase 2: Batch upsert entidades ──
      setImportProgress({ current: 1, total: 4 });
      await new Promise(r => setTimeout(r, 0));

      const uniqueEntidades = [...new Set(rows.map(r => r.entidad))];

      // Load existing entidades
      const { data: existingEntidades } = await supabase.from("entidades_territoriales").select("id, nombre");
      const entidadMap = new Map<string, string>(); // name -> id
      (existingEntidades ?? []).forEach(e => entidadMap.set(e.nombre, e.id));

      const newEntidades = uniqueEntidades.filter(name => !entidadMap.has(name));
      if (newEntidades.length > 0) {
        // Insert in chunks of 50
        for (let i = 0; i < newEntidades.length; i += 50) {
          const chunk = newEntidades.slice(i, i + 50).map(nombre => ({ nombre }));
          const { data } = await supabase.from("entidades_territoriales").insert(chunk).select("id, nombre");
          (data ?? []).forEach(e => entidadMap.set(e.nombre, e.id));
        }
      }

      // ── Phase 3: Batch upsert municipios ──
      setImportProgress({ current: 2, total: 4 });
      await new Promise(r => setTimeout(r, 0));

      // Build unique municipio entries
      const uniqueMunicipios = new Map<string, { nombre: string; entidad_territorial_id: string }>();
      for (const row of rows) {
        const entidadId = entidadMap.get(row.entidad);
        if (!entidadId) continue;
        const key = `${row.municipio}|${entidadId}`;
        if (!uniqueMunicipios.has(key)) {
          uniqueMunicipios.set(key, { nombre: row.municipio, entidad_territorial_id: entidadId });
        }
      }

      // Load existing municipios
      const { data: existingMunicipios } = await supabase.from("municipios").select("id, nombre, entidad_territorial_id");
      const municipioMap = new Map<string, string>(); // "name|entidadId" -> id
      (existingMunicipios ?? []).forEach(m => municipioMap.set(`${m.nombre}|${m.entidad_territorial_id}`, m.id));

      const newMunicipios: { nombre: string; entidad_territorial_id: string }[] = [];
      for (const [key, val] of uniqueMunicipios) {
        if (!municipioMap.has(key)) newMunicipios.push(val);
      }

      if (newMunicipios.length > 0) {
        for (let i = 0; i < newMunicipios.length; i += 50) {
          const chunk = newMunicipios.slice(i, i + 50);
          const { data } = await supabase.from("municipios").insert(chunk).select("id, nombre, entidad_territorial_id");
          (data ?? []).forEach(m => municipioMap.set(`${m.nombre}|${m.entidad_territorial_id}`, m.id));
        }
      }

      // ── Phase 4: Batch upsert instituciones ──
      setImportProgress({ current: 3, total: 4 });
      await new Promise(r => setTimeout(r, 0));

      let createdInstituciones = 0;
      const instRows = rows.filter(r => r.institucion);
      if (instRows.length > 0) {
        // Build unique instituciones
        const uniqueInstituciones = new Map<string, { nombre: string; municipio_id: string }>();
        for (const row of instRows) {
          const entidadId = entidadMap.get(row.entidad);
          if (!entidadId) continue;
          const municipioId = municipioMap.get(`${row.municipio}|${entidadId}`);
          if (!municipioId) continue;
          const key = `${row.institucion}|${municipioId}`;
          if (!uniqueInstituciones.has(key)) {
            uniqueInstituciones.set(key, { nombre: row.institucion, municipio_id: municipioId });
          }
        }

        // Load existing instituciones
        const { data: existingInst } = await supabase.from("instituciones").select("id, nombre, municipio_id");
        const instSet = new Set((existingInst ?? []).map(i => `${i.nombre}|${i.municipio_id}`));

        const newInst: { nombre: string; municipio_id: string }[] = [];
        for (const [key, val] of uniqueInstituciones) {
          if (!instSet.has(key)) newInst.push(val);
        }

        if (newInst.length > 0) {
          for (let i = 0; i < newInst.length; i += 50) {
            const chunk = newInst.slice(i, i + 50);
            const { data } = await supabase.from("instituciones").insert(chunk).select("id");
            createdInstituciones += (data ?? []).length;
          }
        }
      }

      setImportProgress({ current: 4, total: 4 });

      const desc = `${newEntidades.length} entidades, ${newMunicipios.length} municipios, ${createdInstituciones} instituciones creadas`;
      toast({ title: "Importación completada", description: desc });
    } catch (err: any) {
      toast({ title: "Error al importar", description: err?.message || "Error desconocido", variant: "destructive" });
    } finally {
      setSaving(false);
      setImportProgress(null);
      setImportOpen(false);
      e.target.value = "";
      fetchAll();
    }
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
        <Accordion type="multiple" className="rounded-lg border bg-background" value={openEntidades} onValueChange={setOpenEntidades}>
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
                  <Accordion type="multiple" className="ml-4" value={openMunicipios} onValueChange={setOpenMunicipios}>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Municipios incluidos</label>
                  {municipiosByEntidad(regionEntidad).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => {
                        const allMuniIds = municipiosByEntidad(regionEntidad).map(m => m.id);
                        const allSelected = allMuniIds.every(id => regionSelectedMunicipios.includes(id));
                        if (allSelected) {
                          setRegionSelectedMunicipios([]);
                          setRegionSelectedInstituciones([]);
                        } else {
                          setRegionSelectedMunicipios(allMuniIds);
                          const allInstIds = allMuniIds.flatMap(mid => institucionesByMunicipio(mid).map(i => i.id));
                          setRegionSelectedInstituciones(prev => [...new Set([...prev, ...allInstIds])]);
                        }
                      }}
                    >
                      {municipiosByEntidad(regionEntidad).every(m => regionSelectedMunicipios.includes(m.id)) ? "Deseleccionar todo" : "Seleccionar todo"}
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-0.5">
                  {municipiosByEntidad(regionEntidad).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Esta entidad no tiene municipios</p>
                  ) : (
                    municipiosByEntidad(regionEntidad).map(m => {
                      const isChecked = regionSelectedMunicipios.includes(m.id);
                      const muniInstituciones = institucionesByMunicipio(m.id);
                      return (
                        <div key={m.id}>
                          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRegionSelectedMunicipios(prev => [...prev, m.id]);
                                  // Auto-select all instituciones of this municipio
                                  const instIds = muniInstituciones.map(i => i.id);
                                  setRegionSelectedInstituciones(prev => [...new Set([...prev, ...instIds])]);
                                } else {
                                  setRegionSelectedMunicipios(prev => prev.filter(id => id !== m.id));
                                  // Deselect all instituciones of this municipio
                                  const instIds = new Set(muniInstituciones.map(i => i.id));
                                  setRegionSelectedInstituciones(prev => prev.filter(id => !instIds.has(id)));
                                }
                              }}
                              className="accent-primary w-4 h-4"
                            />
                            <span className="font-medium">{m.nombre}</span>
                            {muniInstituciones.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {muniInstituciones.filter(i => regionSelectedInstituciones.includes(i.id)).length}/{muniInstituciones.length} inst.
                              </span>
                            )}
                          </label>
                          {isChecked && muniInstituciones.length > 0 && (
                            <div className="ml-8 pl-2 border-l border-muted space-y-0.5 mb-1">
                              <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer py-0.5 px-1 hover:bg-muted/50 rounded">
                                <input
                                  type="checkbox"
                                  checked={muniInstituciones.every(i => regionSelectedInstituciones.includes(i.id))}
                                  onChange={(e) => {
                                    const instIds = muniInstituciones.map(i => i.id);
                                    if (e.target.checked) {
                                      setRegionSelectedInstituciones(prev => [...new Set([...prev, ...instIds])]);
                                    } else {
                                      const toRemove = new Set(instIds);
                                      setRegionSelectedInstituciones(prev => prev.filter(id => !toRemove.has(id)));
                                    }
                                  }}
                                  className="accent-primary w-3.5 h-3.5"
                                />
                                <span className="font-medium">Todas</span>
                              </label>
                              {muniInstituciones.map(inst => (
                                <label key={inst.id} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 px-1 hover:bg-muted/50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={regionSelectedInstituciones.includes(inst.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setRegionSelectedInstituciones(prev => [...prev, inst.id]);
                                      else setRegionSelectedInstituciones(prev => prev.filter(id => id !== inst.id));
                                    }}
                                    className="accent-primary w-3.5 h-3.5"
                                  />
                                  <School className="w-3 h-3 shrink-0 text-muted-foreground" />
                                  {inst.nombre}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
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
          <div className="py-4 space-y-3">
            <Input type="file" accept=".csv,.txt,.tsv" onChange={handleImport} disabled={saving} />
            {saving && importProgress && (
              <div className="space-y-2">
                <Progress value={Math.round((importProgress.current / importProgress.total) * 100)} className="h-2" />
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="animate-spin w-4 h-4" />
                  {importProgress.current === 0 && "Analizando archivo…"}
                  {importProgress.current === 1 && "Importando entidades…"}
                  {importProgress.current === 2 && "Importando municipios…"}
                  {importProgress.current === 3 && "Importando instituciones…"}
                  {importProgress.current === 4 && "¡Completado!"}
                </p>
              </div>
            )}
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
