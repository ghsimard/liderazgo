import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, UserCheck } from "lucide-react";

const MODULES = [1, 2, 3, 4];

interface DirectivoEval {
  directivo_cedula: string;
  module_number: number;
  reto_estrategico: string;
  razon_sin_reto: string;
  avances_personal: string;
  retos_personal: string;
  avances_pedagogica: string;
  retos_pedagogica: string;
  avances_administrativa: string;
  retos_administrativa: string;
}

export default function AdminEvalIndividualTab() {
  const [loading, setLoading] = useState(true);
  const [regiones, setRegiones] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedModule, setSelectedModule] = useState<number>(1);
  const [evals, setEvals] = useState<DirectivoEval[]>([]);
  const [directivoNames, setDirectivoNames] = useState<Record<string, { nombre: string; ie: string }>>({});
  const [loadingEvals, setLoadingEvals] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("region")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas) {
        setRegiones([...new Set(fichas.map((f: any) => f.region).filter(Boolean))].sort() as string[]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedRegion) { setEvals([]); return; }
    loadEvals();
  }, [selectedRegion, selectedModule]);

  const loadEvals = async () => {
    setLoadingEvals(true);
    try {
      // Get directivos in region
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("numero_cedula, nombres_apellidos, nombre_ie")
        .eq("region", selectedRegion)
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);

      if (!fichas || fichas.length === 0) {
        setEvals([]);
        setDirectivoNames({});
        setLoadingEvals(false);
        return;
      }

      const nameMap: Record<string, { nombre: string; ie: string }> = {};
      const cedulas: string[] = [];
      for (const f of fichas) {
        if (f.numero_cedula) {
          cedulas.push(f.numero_cedula);
          nameMap[f.numero_cedula] = { nombre: f.nombres_apellidos, ie: f.nombre_ie };
        }
      }
      setDirectivoNames(nameMap);

      const { data: rows } = await supabase
        .from("informe_directivo")
        .select("*")
        .eq("module_number", selectedModule)
        .in("directivo_cedula", cedulas)
        .order("directivo_cedula");

      setEvals((rows || []).map(r => ({
        directivo_cedula: r.directivo_cedula,
        module_number: r.module_number,
        reto_estrategico: r.reto_estrategico || "",
        razon_sin_reto: r.razon_sin_reto || "",
        avances_personal: r.avances_personal || "",
        retos_personal: r.retos_personal || "",
        avances_pedagogica: r.avances_pedagogica || "",
        retos_pedagogica: r.retos_pedagogica || "",
        avances_administrativa: r.avances_administrativa || "",
        retos_administrativa: r.retos_administrativa || "",
      })));
    } finally {
      setLoadingEvals(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MODULES.map(m => <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Región" /></SelectTrigger>
              <SelectContent>{regiones.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Badge variant="outline" className="gap-1.5 ml-auto"><Eye className="w-3.5 h-3.5" /> Solo lectura</Badge>
          </div>
        </CardContent>
      </Card>

      {!selectedRegion ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Seleccione una región para consultar las evaluaciones individuales.</CardContent></Card>
      ) : loadingEvals ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
      ) : evals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No se encontraron evaluaciones individuales para esta combinación.</CardContent></Card>
      ) : (
        evals.map((ev) => {
          const info = directivoNames[ev.directivo_cedula];
          return (
            <Card key={ev.directivo_cedula}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{info?.nombre || ev.directivo_cedula}</span>
                  <Badge variant="outline" className="text-[10px]">CC: {ev.directivo_cedula}</Badge>
                  {info?.ie && <span className="text-xs text-muted-foreground">— {info.ie}</span>}
                </div>

                <ReadOnlyField label="1. Reto estratégico de transformación institucional" value={ev.reto_estrategico} />
                {ev.razon_sin_reto && <ReadOnlyField label="Razón de no definición de reto" value={ev.razon_sin_reto} />}

                <div>
                  <Label className="text-xs font-semibold">2. Evaluación del directivo</Label>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[220px] text-center">Gestión y competencias</TableHead>
                      <TableHead className="text-xs text-center">Avances</TableHead>
                      <TableHead className="text-xs text-center">Retos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="align-top text-xs font-medium">
                        <span className="font-semibold text-primary">Personal</span>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Autoconciencia · Manejo de las emociones · Comunicación asertiva · Trabajo colaborativo</p>
                      </TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.avances_personal} /></TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.retos_personal} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="align-top text-xs font-medium">
                        <span className="font-semibold text-primary">Pedagógica</span>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Dirección del PEI · Orientación pedagógica · Convivencia · Fomento de la cultura de la evaluación</p>
                      </TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.avances_pedagogica} /></TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.retos_pedagogica} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="align-top text-xs font-medium">
                        <span className="font-semibold text-primary">Administrativa y Comunitaria</span>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Fomento de la visión compartida · Planeación institucional · Construcción de redes · Generación de alianzas · Rendición de cuentas</p>
                      </TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.avances_administrativa} /></TableCell>
                      <TableCell className="align-top"><ReadOnlyCell value={ev.retos_administrativa} /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function ReadOnlyCell({ value }: { value: string }) {
  return (
    <div className="p-2 bg-muted/30 rounded text-xs whitespace-pre-wrap min-h-[50px]">
      {value || <span className="text-muted-foreground italic">—</span>}
    </div>
  );
}
