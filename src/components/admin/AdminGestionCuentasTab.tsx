import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, RefreshCw, Trash2, KeyRound, Pencil, Eye, EyeOff, Shield, UserCog, Users, Plus } from "lucide-react";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

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

interface UnifiedPerson {
  cedula: string;
  nombre: string;
  email: string;
  // Admin role
  isAdmin: boolean;
  adminUserId?: string;
  adminEmail?: string;
  adminRole?: string; // admin | superadmin
  adminLastSignIn?: string | null;
  // Evaluador role
  isEvaluador: boolean;
  evaluadorId?: string;
  evaluadorEmail?: string;
  // Operator role
  isOperator: boolean;
  operatorPermissions?: { id: string; section: string; region: string | null; entidad: string | null; institucion: string | null; module_number: number | null }[];
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
  role?: string;
  roles?: string[];
  cedula?: string;
}

async function invokeManageUsers(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body: { action, ...params },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

interface Props {
  isSuperAdmin: boolean;
}

export default function AdminGestionCuentasTab({ isSuperAdmin }: Props) {
  const { toast } = useToast();
  const [people, setPeople] = useState<UnifiedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regiones, setRegiones] = useState<string[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<UnifiedPerson | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formCedula, setFormCedula] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  // Admin section
  const [enableAdmin, setEnableAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  // Evaluador section
  const [enableEvaluador, setEnableEvaluador] = useState(false);
  const [evalEmail, setEvalEmail] = useState("");
  // Operator section
  const [enableOperator, setEnableOperator] = useState(false);
  const [operatorPerms, setOperatorPerms] = useState<{ section: string; region: string; entidad: string; institucion: string; module: string }[]>([]);

  // Delete / password dialogs
  const [deleteTarget, setDeleteTarget] = useState<UnifiedPerson | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pwTarget, setPwTarget] = useState<UnifiedPerson | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwPassword, setShowPwPassword] = useState(false);

  // Auto-fill from fichas_rlt
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminUsersResult, evalsResult, permsResult, regionesResult] = await Promise.all([
        USE_EXPRESS
          ? apiFetch<{ users: AdminUser[] }>("/api/users")
          : invokeManageUsers("list").then((d: any) => ({ data: d, error: null })),
        supabase.from("rubrica_evaluadores").select("*"),
        supabase.from("operator_permissions").select("*").order("cedula").order("section"),
        supabase.from("regiones").select("nombre").order("nombre"),
      ]);

      const adminUsers: AdminUser[] = USE_EXPRESS
        ? (adminUsersResult as any).data?.users ?? []
        : (adminUsersResult as any).data?.users ?? [];
      const evaluadores = evalsResult.data ?? [];
      const permissions = permsResult.data ?? [];
      setRegiones((regionesResult.data || []).map((r: any) => r.nombre));

      // Build unified map by normalized cedula
      const map = new Map<string, UnifiedPerson>();
      const normalizeCedula = (value: unknown) => String(value ?? "").trim();

      // Admin users
      for (const u of adminUsers) {
        const normalizedCedula = normalizeCedula(u.cedula);
        const mapKey = normalizedCedula || `__admin_${u.id}`;
        const existing: UnifiedPerson = map.get(mapKey) || {
          cedula: normalizedCedula,
          nombre: "",
          email: "",
          isAdmin: false,
          isEvaluador: false,
          isOperator: false,
        };

        existing.isAdmin = true;
        existing.adminUserId = u.id;
        existing.adminEmail = u.email;
        existing.adminRole = u.role || (u.roles?.includes("superadmin") ? "superadmin" : "admin");
        existing.adminLastSignIn = u.last_sign_in_at;
        existing.email = existing.email || u.email;
        if (!existing.nombre) existing.nombre = u.email.split("@")[0];
        map.set(mapKey, existing);
      }

      // Evaluadores
      for (const ev of evaluadores as any[]) {
        const ced = normalizeCedula(ev.cedula);
        if (!ced) continue;
        const existing: UnifiedPerson = map.get(ced) || {
          cedula: ced,
          nombre: "",
          email: "",
          isAdmin: false,
          isEvaluador: false,
          isOperator: false,
        };

        existing.isEvaluador = true;
        existing.evaluadorId = ev.id;
        existing.evaluadorEmail = ev.email || "";
        existing.nombre = existing.nombre || ev.nombre;
        existing.email = existing.email || ev.email || "";
        map.set(ced, existing);
      }

      // Operators
      for (const p of permissions as any[]) {
        const ced = normalizeCedula(p.cedula);
        if (!ced) continue;
        const existing: UnifiedPerson = map.get(ced) || {
          cedula: ced,
          nombre: "",
          email: "",
          isAdmin: false,
          isEvaluador: false,
          isOperator: false,
        };

        existing.isOperator = true;
        existing.nombre = existing.nombre || p.nombre;
        if (!existing.operatorPermissions) existing.operatorPermissions = [];
        existing.operatorPermissions.push({
          id: p.id,
          section: p.section,
          region: p.region,
          entidad: p.entidad,
          institucion: p.institucion,
          module_number: p.module_number,
        });
        map.set(ced, existing);
      }

      setPeople(Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre) || a.cedula.localeCompare(b.cedula)));
    } catch {
      toast({ title: "Error al cargar datos", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill when cedula changes in create mode
  const handleCedulaBlur = async () => {
    if (editingPerson || !formCedula.trim()) return;
    setAutoFillLoading(true);
    try {
      const { data } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: formCedula.trim() });
      if (data && typeof data === "object") {
        const ficha = data as any;
        if (ficha.nombres_apellidos && !formNombre) setFormNombre(ficha.nombres_apellidos);
        if (ficha.correo_personal && !formEmail) setFormEmail(ficha.correo_personal);
      }
      // Also check existing evaluador
      const { data: evalData } = await supabase.from("rubrica_evaluadores").select("nombre, email").eq("cedula", formCedula.trim()).limit(1);
      if (evalData?.[0]) {
        if (!formNombre) setFormNombre((evalData[0] as any).nombre);
        if (!formEmail && (evalData[0] as any).email) setFormEmail((evalData[0] as any).email);
      }
    } catch { /* silent */ }
    setAutoFillLoading(false);
  };

  const resetForm = () => {
    setFormCedula("");
    setFormNombre("");
    setFormEmail("");
    setEnableAdmin(false);
    setAdminEmail("");
    setAdminPassword("");
    setAdminRole("admin");
    setShowPassword(false);
    setEnableEvaluador(false);
    setEvalEmail("");
    setEnableOperator(false);
    setOperatorPerms([]);
    setEditingPerson(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: UnifiedPerson) => {
    setEditingPerson(p);
    setFormCedula(p.cedula);
    setFormNombre(p.nombre);
    setFormEmail(p.email);
    setEnableAdmin(p.isAdmin);
    setAdminEmail(p.adminEmail || "");
    setAdminRole(p.adminRole || "admin");
    setAdminPassword("");
    setEnableEvaluador(p.isEvaluador);
    setEvalEmail(p.evaluadorEmail || "");
    setEnableOperator(p.isOperator);
    setOperatorPerms(
      (p.operatorPermissions || []).map(op => ({
        section: op.section,
        region: op.region || "",
        entidad: op.entidad || "",
        institucion: op.institucion || "",
        module: op.module_number?.toString() || "",
      }))
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCedula.trim()) {
      toast({ title: "La cédula es requerida", variant: "destructive" });
      return;
    }
    if (!formNombre.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingPerson;
      const ced = formCedula.trim();

      // --- ADMIN ---
      if (enableAdmin) {
        const email = adminEmail.trim() || formEmail.trim();
        if (!email) {
          toast({ title: "Email requerido para administrador", variant: "destructive" });
          setSaving(false);
          return;
        }
        if (isEdit && editingPerson?.isAdmin && editingPerson.adminUserId) {
          // Update existing admin
          if (USE_EXPRESS) {
            await apiFetch(`/api/users/${editingPerson.adminUserId}`, {
              method: "PUT",
              body: { email, role: adminRole, cedula: ced },
            });
          } else {
            await invokeManageUsers("update_user", {
              user_id: editingPerson.adminUserId,
              email,
              role: adminRole,
              cedula: ced,
            });
          }
        } else if (!isEdit || !editingPerson?.isAdmin) {
          // Create new admin
          if (!adminPassword && !isEdit) {
            toast({ title: "Contraseña requerida para nuevo administrador", variant: "destructive" });
            setSaving(false);
            return;
          }
          if (adminPassword) {
            if (USE_EXPRESS) {
              await apiFetch("/api/users", {
                method: "POST",
                body: { email, password: adminPassword, role: adminRole },
              });
            } else {
              const { data: { session } } = await supabase.auth.getSession();
              await supabase.functions.invoke("create-user", {
                body: { email, password: adminPassword, makeAdmin: true, makeSuperAdmin: adminRole === "superadmin" },
                headers: { Authorization: `Bearer ${session?.access_token}` },
              });
            }
            // Link cedula
            // Find the newly created user by listing again
            const freshData = USE_EXPRESS
              ? await apiFetch<{ users: AdminUser[] }>("/api/users")
              : await invokeManageUsers("list");
            const freshUsers: AdminUser[] = USE_EXPRESS ? (freshData as any).data?.users ?? [] : (freshData as any).users ?? [];
            const newUser = freshUsers.find(u => u.email === email);
            if (newUser) {
              await supabase.from("admin_cedulas").upsert({ user_id: newUser.id, cedula: ced }, { onConflict: "user_id" });
            }
          }
        }
      } else if (isEdit && editingPerson?.isAdmin && editingPerson.adminUserId) {
        // Admin was disabled — delete admin account
        if (USE_EXPRESS) {
          await apiFetch(`/api/users/${editingPerson.adminUserId}`, { method: "DELETE" });
        } else {
          await invokeManageUsers("delete", { user_id: editingPerson.adminUserId });
        }
      }

      // --- EVALUADOR ---
      if (enableEvaluador) {
        if (isEdit && editingPerson?.isEvaluador && editingPerson.evaluadorId) {
          await supabase.from("rubrica_evaluadores").update({
            nombre: formNombre.trim(),
            email: evalEmail.trim() || formEmail.trim() || null,
            cedula: ced,
          }).eq("id", editingPerson.evaluadorId);
        } else if (!isEdit || !editingPerson?.isEvaluador) {
          await supabase.from("rubrica_evaluadores").insert({
            nombre: formNombre.trim(),
            cedula: ced,
            email: evalEmail.trim() || formEmail.trim() || null,
          });
        }
      } else if (isEdit && editingPerson?.isEvaluador && editingPerson.evaluadorId) {
        await supabase.from("rubrica_evaluadores").delete().eq("id", editingPerson.evaluadorId);
      }

      // --- OPERADOR ---
      if (enableOperator) {
        // Delete old permissions for this cedula, then re-insert
        if (isEdit && editingPerson?.isOperator) {
          await supabase.from("operator_permissions").delete().eq("cedula", ced);
        }
        if (operatorPerms.length > 0) {
          const rows = operatorPerms.filter(op => op.section).map(op => ({
            cedula: ced,
            nombre: formNombre.trim(),
            section: op.section,
            region: op.region || null,
            entidad: op.entidad || null,
            institucion: op.institucion || null,
            module_number: op.module ? parseInt(op.module) : null,
          }));
          if (rows.length > 0) {
            await supabase.from("operator_permissions").insert(rows);
          }
        }
      } else if (isEdit && editingPerson?.isOperator) {
        await supabase.from("operator_permissions").delete().eq("cedula", editingPerson.cedula);
      }

      toast({ title: isEdit ? "Persona actualizada" : "Persona creada" });
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error desconocido", variant: "destructive" });
    }
    setSaving(false);
  };

  // Delete all roles for a person
  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.isAdmin && deleteTarget.adminUserId) {
        if (USE_EXPRESS) {
          await apiFetch(`/api/users/${deleteTarget.adminUserId}`, { method: "DELETE" });
        } else {
          await invokeManageUsers("delete", { user_id: deleteTarget.adminUserId });
        }
      }
      if (deleteTarget.isEvaluador && deleteTarget.evaluadorId) {
        await supabase.from("rubrica_evaluadores").delete().eq("id", deleteTarget.evaluadorId);
      }
      if (deleteTarget.isOperator) {
        await supabase.from("operator_permissions").delete().eq("cedula", deleteTarget.cedula);
      }
      toast({ title: "Persona eliminada de todos los roles" });
      setDeleteTarget(null);
      loadData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
    setDeleteLoading(false);
  };

  // Change admin password
  const handleUpdatePassword = async () => {
    if (!pwTarget?.adminUserId || !newPw) return;
    setPwLoading(true);
    try {
      if (USE_EXPRESS) {
        const { error } = await apiFetch(`/api/users/${pwTarget.adminUserId}/password`, {
          method: "PUT",
          body: { password: newPw },
        });
        if (error) throw new Error(error);
      } else {
        await invokeManageUsers("update_password", { user_id: pwTarget.adminUserId, password: newPw });
      }
      toast({ title: "Contraseña actualizada" });
      setPwTarget(null);
      setNewPw("");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
    setPwLoading(false);
  };

  const addOperatorPerm = () => {
    setOperatorPerms(prev => [...prev, { section: "", region: "", entidad: "", institucion: "", module: "" }]);
  };

  const removeOperatorPerm = (idx: number) => {
    setOperatorPerms(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOperatorPerm = (idx: number, field: string, value: string) => {
    setOperatorPerms(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const filtered = search
    ? people.filter(p =>
        p.cedula.includes(search) ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.adminEmail?.toLowerCase().includes(search.toLowerCase())
      )
    : people;

  const roleCount = (r: "admin" | "evaluador" | "operator") =>
    people.filter(p => r === "admin" ? p.isAdmin : r === "evaluador" ? p.isEvaluador : p.isOperator).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="text-muted-foreground">{people.length} persona(s)</span>
        <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" /> {roleCount("admin")} Admin</Badge>
        <Badge variant="outline" className="gap-1"><Users className="w-3 h-3" /> {roleCount("evaluador")} Evaluador</Badge>
        <Badge variant="outline" className="gap-1"><UserCog className="w-3 h-3" /> {roleCount("operator")} Operador</Badge>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cédula, nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Agregar persona
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cédula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <RefreshCw className="animate-spin w-5 h-5 mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search ? "Sin resultados." : "No hay personas registradas."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.cedula}>
                  <TableCell className="font-mono text-sm">{p.cedula}</TableCell>
                  <TableCell className="font-medium">{p.nombre || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.adminEmail || p.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {p.isAdmin && (
                        <Badge className={`text-xs ${p.adminRole === "superadmin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {p.adminRole === "superadmin" ? "Superadmin" : "Admin"}
                        </Badge>
                      )}
                      {p.isEvaluador && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">Evaluador</Badge>
                      )}
                      {p.isOperator && (
                        <Badge variant="secondary" className="text-xs">
                          Operador ({p.operatorPermissions?.length || 0})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {p.isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => { setPwTarget(p); setNewPw(""); }} title="Cambiar contraseña">
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}
                      {(isSuperAdmin || p.adminRole !== "superadmin") && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} title="Eliminar" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPerson ? "Editar persona" : "Agregar persona"}</DialogTitle>
            <DialogDescription>
              {editingPerson ? "Modifique los roles y datos de esta persona." : "Ingrese la cédula y active los roles necesarios."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Common fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Cédula *</Label>
                <Input
                  value={formCedula}
                  onChange={e => setFormCedula(e.target.value.replace(/\D/g, ""))}
                  onBlur={handleCedulaBlur}
                  placeholder="Número de cédula"
                  inputMode="numeric"
                  disabled={!!editingPerson}
                />
                {autoFillLoading && <p className="text-xs text-muted-foreground">Buscando datos…</p>}
              </div>
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={formNombre} onChange={e => setFormNombre(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
            </div>

            {/* Role sections */}
            <Accordion type="multiple" defaultValue={editingPerson ? [
              ...(editingPerson.isAdmin ? ["admin"] : []),
              ...(editingPerson.isEvaluador ? ["evaluador"] : []),
              ...(editingPerson.isOperator ? ["operador"] : []),
            ] : []}>
              {/* ADMIN */}
              <AccordionItem value="admin">
                <AccordionTrigger className="py-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={enableAdmin} onCheckedChange={setEnableAdmin} onClick={e => e.stopPropagation()} />
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Administrador</span>
                    {enableAdmin && <Badge variant="secondary" className="text-xs">Activo</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {enableAdmin && (
                    <div className="space-y-3 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Email de conexión</Label>
                        <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder={formEmail || "correo@ejemplo.com"} />
                        <p className="text-xs text-muted-foreground">Si vacío, se usará el email general.</p>
                      </div>
                      {(!editingPerson?.isAdmin) && (
                        <div className="space-y-1">
                          <Label className="text-xs">Contraseña *</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={adminPassword}
                              onChange={e => setAdminPassword(e.target.value)}
                              placeholder="Mín. 6 caracteres"
                              className="pr-10"
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      )}
                      {isSuperAdmin && (
                        <div className="space-y-1">
                          <Label className="text-xs">Rol</Label>
                          <Select value={adminRole} onValueChange={setAdminRole}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="superadmin">Superadmin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* EVALUADOR */}
              <AccordionItem value="evaluador">
                <AccordionTrigger className="py-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={enableEvaluador} onCheckedChange={setEnableEvaluador} onClick={e => e.stopPropagation()} />
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Evaluador</span>
                    {enableEvaluador && <Badge variant="secondary" className="text-xs">Activo</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {enableEvaluador && (
                    <div className="space-y-3 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Email del evaluador (opcional)</Label>
                        <Input type="email" value={evalEmail} onChange={e => setEvalEmail(e.target.value)} placeholder={formEmail || "correo@ejemplo.com"} />
                        <p className="text-xs text-muted-foreground">Si vacío, se usará el email general. La gestión de asignaciones se hace desde el hub Rúbricas → Configuración.</p>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* OPERADOR */}
              <AccordionItem value="operador">
                <AccordionTrigger className="py-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={enableOperator} onCheckedChange={c => { setEnableOperator(c); if (c && operatorPerms.length === 0) addOperatorPerm(); }} onClick={e => e.stopPropagation()} />
                    <UserCog className="w-4 h-4" />
                    <span className="text-sm font-medium">Operador</span>
                    {enableOperator && <Badge variant="secondary" className="text-xs">Activo</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {enableOperator && (
                    <div className="space-y-3 pl-4">
                      <p className="text-xs text-muted-foreground">Agregue los permisos de sección para este operador.</p>
                      {operatorPerms.map((op, idx) => (
                        <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Permiso #{idx + 1}</Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeOperatorPerm(idx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sección *</Label>
                            <Select value={op.section} onValueChange={v => updateOperatorPerm(idx, "section", v)}>
                              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_SECTIONS.map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Región</Label>
                              <Select value={op.region} onValueChange={v => updateOperatorPerm(idx, "region", v === "__all__" ? "" : v)}>
                                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todas</SelectItem>
                                  {regiones.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Entidad</Label>
                              <Input value={op.entidad} onChange={e => updateOperatorPerm(idx, "entidad", e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Institución</Label>
                              <Input value={op.institucion} onChange={e => updateOperatorPerm(idx, "institucion", e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Módulo</Label>
                              <Input type="number" min={1} value={op.module} onChange={e => updateOperatorPerm(idx, "module", e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addOperatorPerm} className="gap-1">
                        <Plus className="w-3 h-3" /> Agregar permiso
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : editingPerson ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los roles de <strong>{deleteTarget?.nombre || deleteTarget?.cedula}</strong>
              {deleteTarget?.isAdmin && " (cuenta admin)"}
              {deleteTarget?.isEvaluador && " (evaluador + asignaciones)"}
              {deleteTarget?.isOperator && " (permisos de operador)"}
              . Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Eliminando…" : "Eliminar todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <Dialog open={!!pwTarget} onOpenChange={o => { if (!o) { setPwTarget(null); setNewPw(""); setShowPwPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para {pwTarget?.adminEmail || pwTarget?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input type={showPwPassword ? "text" : "password"} placeholder="Nueva contraseña" value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-10" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10" onClick={() => setShowPwPassword(!showPwPassword)} tabIndex={-1}>
              {showPwPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>Cancelar</Button>
            <Button onClick={handleUpdatePassword} disabled={pwLoading || !newPw}>{pwLoading ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
