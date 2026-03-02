import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, TrendingUp, MessageSquare, BarChart3, Trash2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface SiteReview {
  id: string;
  nombre: string;
  email: string;
  rating: number;
  comentario: string | null;
  tipo_formulario: string | null;
  created_at: string;
}

const FORM_LABELS: Record<string, string> = {
  ficha_rlt: "Ficha RLT",
  autoevaluacion: "360° Autoevaluación",
  docente: "360° Docente",
  estudiante: "360° Estudiante",
  acudiente: "360° Acudiente",
  administrativo: "360° Administrativo",
  directivo: "360° Directivo",
  rubrica_evaluacion: "Rúbrica",
};

const RATING_LABELS = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];

const PIE_COLORS = [
  "hsl(var(--destructive))",
  "hsl(30, 80%, 55%)",
  "hsl(45, 90%, 50%)",
  "hsl(140, 60%, 45%)",
  "hsl(var(--primary))",
];

export default function AdminReviewsTab() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterForm, setFilterForm] = useState<string>("all");
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [togglingReview, setTogglingReview] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setReviews(data as unknown as SiteReview[]);
    setLoading(false);
  };

  const fetchSetting = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "review_modal_enabled")
      .maybeSingle();
    if (data) setReviewEnabled(data.value === "true");
  };

  const toggleReview = async (checked: boolean) => {
    setTogglingReview(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: checked ? "true" : "false", updated_at: new Date().toISOString() } as any)
      .eq("key", "review_modal_enabled");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setReviewEnabled(checked);
      toast({ title: checked ? "Sondeo activado" : "Sondeo desactivado" });
    }
    setTogglingReview(false);
  };

  useEffect(() => { fetchReviews(); fetchSetting(); }, []);

  const filtered = useMemo(() => {
    if (filterForm === "all") return reviews;
    if (filterForm === "general") return reviews.filter(r => !r.tipo_formulario);
    return reviews.filter(r => r.tipo_formulario === filterForm);
  }, [reviews, filterForm]);

  // Stats
  const stats = useMemo(() => {
    if (filtered.length === 0) return { avg: 0, total: 0, withComment: 0, distribution: [] as { name: string; value: number }[] };
    const avg = filtered.reduce((s, r) => s + r.rating, 0) / filtered.length;
    const withComment = filtered.filter(r => r.comentario).length;
    const dist = [1, 2, 3, 4, 5].map(n => ({
      name: `${n}★`,
      label: RATING_LABELS[n],
      value: filtered.filter(r => r.rating === n).length,
    }));
    return { avg, total: filtered.length, withComment, distribution: dist };
  }, [filtered]);

  // By form type chart
  const byFormData = useMemo(() => {
    const map: Record<string, { total: number; sum: number }> = {};
    reviews.forEach(r => {
      const key = r.tipo_formulario || "general";
      if (!map[key]) map[key] = { total: 0, sum: 0 };
      map[key].total++;
      map[key].sum += r.rating;
    });
    return Object.entries(map).map(([key, v]) => ({
      name: FORM_LABELS[key] || key,
      promedio: Math.round((v.sum / v.total) * 10) / 10,
      cantidad: v.total,
    })).sort((a, b) => b.cantidad - a.cantidad);
  }, [reviews]);

  const uniqueFormTypes = useMemo(() => {
    const set = new Set(reviews.map(r => r.tipo_formulario || "general"));
    return Array.from(set).sort();
  }, [reviews]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("site_reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setReviews(prev => prev.filter(r => r.id !== id));
      toast({ title: "Evaluación eliminada" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <Card>
        <CardContent className="pt-5 pb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Sondeo de apreciación post-envío</p>
            <p className="text-xs text-muted-foreground">
              {reviewEnabled
                ? "Activado — el modal de evaluación se muestra después de cada envío de formulario."
                : "Desactivado — el modal de evaluación no se muestra."}
            </p>
          </div>
          <Switch
            checked={reviewEnabled}
            onCheckedChange={toggleReview}
            disabled={togglingReview}
          />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{stats.avg.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Promedio general</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total evaluaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{stats.withComment}</span>
            </div>
            <p className="text-xs text-muted-foreground">Con comentario</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{uniqueFormTypes.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Formularios evaluados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución de calificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.distribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {stats.distribution.filter(d => d.value > 0).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[stats.distribution.findIndex(d => d.value > 0 && stats.distribution.filter(dd => dd.value > 0).indexOf(d) === i) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By form type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio por formulario</CardTitle>
          </CardHeader>
          <CardContent>
            {byFormData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byFormData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}/5`} />
                  <Bar dataKey="promedio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter + List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-medium">Evaluaciones recibidas</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Filtrar por formulario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="general">Evaluación general</SelectItem>
                  {uniqueFormTypes.filter(f => f !== "general").map(f => (
                    <SelectItem key={f} value={f}>{FORM_LABELS[f] || f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchReviews} className="gap-1.5 h-8">
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay evaluaciones</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} className="border rounded-lg p-3 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {RATING_LABELS[r.rating]}
                      </Badge>
                      {r.tipo_formulario && (
                        <Badge variant="outline" className="text-[10px]">
                          {FORM_LABELS[r.tipo_formulario] || r.tipo_formulario}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                    {r.comentario && (
                      <p className="text-sm text-foreground/80 mt-1 italic">"{r.comentario}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
