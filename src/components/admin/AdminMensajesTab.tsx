import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Star,
  Mail,
  Lightbulb,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  MessageSquare,
  Phone,
  Calendar,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ContactMessage {
  id: string;
  nombre: string;
  email: string;
  codigo_pais: string;
  telefono: string | null;
  contactar_whatsapp: boolean;
  asunto: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
  tipo_contacto?: string;
  rating?: number | null;
}

function StarDisplay({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${
            s <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string | undefined }) {
  const t = tipo || "contacto";
  if (t === "sugerencia") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Lightbulb className="w-3 h-3" /> Sugerencia
      </Badge>
    );
  }
  if (t === "derecho") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs border-primary/30 text-primary">
        <Shield className="w-3 h-3" /> Derecho y contacto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Mail className="w-3 h-3" /> Contacto
    </Badge>
  );
}

export default function AdminMensajesTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "contacto" | "sugerencia" | "derecho">("todos");
  const [readFilter, setReadFilter] = useState<"todos" | "leido" | "no_leido">("todos");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMsg, setViewMsg] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setMessages((data as any[]) || []);
    } catch {
      toast.error("Error al cargar los mensajes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const toggleRead = async (msg: ContactMessage) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ leido: !msg.leido })
        .eq("id", msg.id);
      if (error) throw error;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, leido: !msg.leido } : m))
      );
    } catch {
      toast.error("Error al actualizar el estado");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== deleteId));
      toast.success("Mensaje eliminado");
    } catch {
      toast.error("Error al eliminar el mensaje");
    } finally {
      setDeleteId(null);
    }
  };

  const openMessage = async (msg: ContactMessage) => {
    setViewMsg(msg);
    if (!msg.leido) {
      try {
        await supabase
          .from("contact_messages")
          .update({ leido: true })
          .eq("id", msg.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, leido: true } : m))
        );
      } catch {}
    }
  };

  const filtered = messages.filter((m) => {
    const tipo = (m as any).tipo_contacto || "contacto";
    if (filter !== "todos" && tipo !== filter) return false;
    if (readFilter === "leido" && !m.leido) return false;
    if (readFilter === "no_leido" && m.leido) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        m.nombre.toLowerCase().includes(s) ||
        m.email.toLowerCase().includes(s) ||
        m.asunto.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const unreadCount = messages.filter((m) => !m.leido).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o asunto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
             <SelectItem value="todos">Todos los tipos</SelectItem>
             <SelectItem value="contacto">Contacto</SelectItem>
             <SelectItem value="sugerencia">Sugerencia</SelectItem>
             <SelectItem value="derecho">Derecho y contacto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={readFilter} onValueChange={(v) => setReadFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="no_leido">No leídos</SelectItem>
            <SelectItem value="leido">Leídos</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchMessages} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>

        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} sin leer
          </Badge>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} mensaje{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Messages list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay mensajes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => {
            const tipo = (msg as any).tipo_contacto || "contacto";
            const rating = (msg as any).rating as number | null;
            return (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !msg.leido ? "border-primary/40 bg-primary/5" : ""
                }`}
                onClick={() => openMessage(msg)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="pt-1.5">
                      {!msg.leido && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                      {msg.leido && (
                        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${!msg.leido ? "font-semibold" : "font-medium"}`}>
                          {msg.nombre}
                        </span>
                        <TipoBadge tipo={tipo} />
                        {rating && <StarDisplay rating={rating} />}
                      </div>

                      <p className={`text-sm ${!msg.leido ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {msg.asunto}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {msg.mensaje}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{msg.email}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(msg.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleRead(msg)}
                        title={msg.leido ? "Marcar como no leído" : "Marcar como leído"}
                      >
                        {msg.leido ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(msg.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewMsg} onOpenChange={() => setViewMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TipoBadge tipo={(viewMsg as any)?.tipo_contacto} />
              {viewMsg?.asunto}
            </DialogTitle>
          </DialogHeader>

          {viewMsg && (
            <div className="space-y-4">
              {(viewMsg as any).rating && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Calificación:</span>
                  <StarDisplay rating={(viewMsg as any).rating} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre:</span>
                  <p className="font-medium">{viewMsg.nombre}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{viewMsg.email}</p>
                </div>
                {viewMsg.telefono && (
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {viewMsg.codigo_pais} {viewMsg.telefono}
                      {viewMsg.contactar_whatsapp && (
                        <Badge variant="secondary" className="text-[10px] ml-1">WhatsApp</Badge>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium">
                    {format(new Date(viewMsg.created_at), "dd MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Mensaje:</span>
                <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                  {viewMsg.mensaje}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleRead(viewMsg)}
                  className="gap-1.5"
                >
                  {viewMsg.leido ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {viewMsg.leido ? "Marcar no leído" : "Marcar leído"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteId(viewMsg.id);
                    setViewMsg(null);
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El mensaje será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
