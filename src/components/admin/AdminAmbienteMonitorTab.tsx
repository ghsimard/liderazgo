import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Mail, Phone, Eye } from "lucide-react";

interface Directivo {
  nombre_ie: string;
  nombres_apellidos: string;
  correo_personal: string;
  correo_institucional: string | null;
  celular_personal: string;
  telefono_ie: string | null;
  prefiere_correo: string;
  cargo_actual: string;
}

interface Submission {
  institucion_educativa: string;
  tipo_formulario: string;
}

function CountBadge({ count }: { count: number }) {
  const variant = count === 0 ? "destructive" : count < 25 ? "secondary" : "default";
  const className = count > 0 && count < 25 ? "bg-amber-500 text-white hover:bg-amber-600 border-transparent" : "";
  return <Badge variant={variant} className={className}>{count}</Badge>;
}

export default function AdminAmbienteMonitorTab() {
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactDialog, setContactDialog] = useState<Directivo | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fichasRes, subRes] = await Promise.all([
        supabase.from("fichas_rlt").select("nombre_ie, nombres_apellidos, correo_personal, correo_institucional, celular_personal, telefono_ie, prefiere_correo, cargo_actual"),
        supabase.from("encuestas_ambiente_escolar").select("institucion_educativa, tipo_formulario"),
      ]);
      setDirectivos((fichasRes.data as Directivo[]) || []);
      setSubmissions((subRes.data as Submission[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const { rows, totals } = useMemo(() => {
    const institutions = new Set<string>();
    directivos.forEach((d) => institutions.add(d.nombre_ie));
    submissions.forEach((s) => institutions.add(s.institucion_educativa));

    const countMap: Record<string, { docentes: number; estudiantes: number; acudientes: number }> = {};
    for (const ie of institutions) {
      countMap[ie] = { docentes: 0, estudiantes: 0, acudientes: 0 };
    }
    for (const s of submissions) {
      const key = s.tipo_formulario as keyof (typeof countMap)[string];
      if (countMap[s.institucion_educativa] && key in countMap[s.institucion_educativa]) {
        countMap[s.institucion_educativa][key]++;
      }
    }

    const sorted = Array.from(institutions).sort();
    const totalD = sorted.reduce((a, ie) => a + countMap[ie].docentes, 0);
    const totalE = sorted.reduce((a, ie) => a + countMap[ie].estudiantes, 0);
    const totalA = sorted.reduce((a, ie) => a + countMap[ie].acudientes, 0);

    return {
      rows: sorted.map((ie) => ({ ie, ...countMap[ie], directivo: directivos.find((d) => d.nombre_ie === ie) })),
      totals: { docentes: totalD, estudiantes: totalE, acudientes: totalA, total: totalD + totalE + totalA },
    };
  }, [directivos, submissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium">Total: {totals.total} respuestas</span>
        <span>Docentes: <strong>{totals.docentes}</strong></span>
        <span>Estudiantes: <strong>{totals.estudiantes}</strong></span>
        <span>Acudientes: <strong>{totals.acudientes}</strong></span>
        <span className="ml-auto text-muted-foreground">{rows.length} instituciones</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="destructive">0 = Sin respuestas</Badge>
        <Badge className="bg-amber-500 text-white border-transparent">1-24 = Pocas</Badge>
        <Badge>25+ = Suficientes</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institución</TableHead>
            <TableHead className="text-center w-24">Docentes</TableHead>
            <TableHead className="text-center w-24">Estudiantes</TableHead>
            <TableHead className="text-center w-24">Acudientes</TableHead>
            <TableHead className="text-center w-20">Contacto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.ie}>
              <TableCell className="font-medium text-sm">{r.ie}</TableCell>
              <TableCell className="text-center"><CountBadge count={r.docentes} /></TableCell>
              <TableCell className="text-center"><CountBadge count={r.estudiantes} /></TableCell>
              <TableCell className="text-center"><CountBadge count={r.acudientes} /></TableCell>
              <TableCell className="text-center">
                {r.directivo ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setContactDialog(r.directivo!)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!contactDialog} onOpenChange={() => setContactDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacto del Directivo</DialogTitle>
          </DialogHeader>
          {contactDialog && (
            <div className="space-y-3 text-sm">
              <p><strong>{contactDialog.nombres_apellidos}</strong></p>
              <p className="text-muted-foreground">{contactDialog.cargo_actual} — {contactDialog.prefiere_correo === "institucional" ? "Prefiere correo institucional" : "Prefiere correo personal"}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{contactDialog.correo_personal}</span>
                </div>
                {contactDialog.correo_institucional && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{contactDialog.correo_institucional} (inst.)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{contactDialog.celular_personal}</span>
                </div>
                {contactDialog.telefono_ie && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{contactDialog.telefono_ie} (IE)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
