import { useEffect, useState } from "react";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, KeyRound, RefreshCw, Eye, EyeOff } from "lucide-react";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
  role?: string;
  roles?: string[];
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

interface AdminUsersTabProps {
  isSuperAdmin?: boolean;
}

export default function AdminUsersTab({ isSuperAdmin = false }: AdminUsersTabProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("admin");
  const [createLoading, setCreateLoading] = useState(false);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Password dialog
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPwPassword, setShowPwPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (USE_EXPRESS) {
        const { data, error } = await apiFetch<{ users: AdminUser[] }>("/api/users");
        if (error) throw new Error(error);
        setUsers(data?.users ?? []);
      } else {
        const data = await invokeManageUsers("list");
        setUsers(data.users ?? []);
      }
    } catch {
      toast({ title: "Error al cargar administradores", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) {
      toast({ title: "Email y contraseña requeridos", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      if (USE_EXPRESS) {
        const { error } = await apiFetch("/api/users", {
          method: "POST",
          body: { email: newEmail, password: newPassword, role: newRole },
        });
        if (error) throw new Error(error);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke("create-user", {
          body: {
            email: newEmail,
            password: newPassword,
            makeAdmin: true,
            makeSuperAdmin: newRole === "superadmin",
          },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
      }
      toast({ title: "Administrador creado", description: `${newEmail} (${newRole})` });
      setCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      fetchUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error desconocido", variant: "destructive" });
    }
    setCreateLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      if (USE_EXPRESS) {
        const { error } = await apiFetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
        if (error) throw new Error(error);
      } else {
        await invokeManageUsers("delete", { user_id: deleteUser.id });
      }
      toast({ title: "Administrador eliminado" });
      setDeleteUser(null);
      fetchUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error desconocido", variant: "destructive" });
    }
    setDeleteLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!pwUser || !newPw) return;
    setPwLoading(true);
    try {
      if (USE_EXPRESS) {
        const { error } = await apiFetch(`/api/users/${pwUser.id}/password`, {
          method: "PUT",
          body: { password: newPw },
        });
        if (error) throw new Error(error);
      } else {
        await invokeManageUsers("update_password", { user_id: pwUser.id, password: newPw });
      }
      toast({ title: "Contraseña actualizada" });
      setPwUser(null);
      setNewPw("");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error desconocido", variant: "destructive" });
    }
    setPwLoading(false);
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{users.length} administrador{users.length !== 1 ? "es" : ""}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Crear administrador
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <RefreshCw className="animate-spin w-5 h-5 mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No hay administradores.</TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const displayRole = u.role || (u.roles?.includes("superadmin") ? "superadmin" : "admin");
                return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${displayRole === "superadmin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {displayRole}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setPwUser(u); setNewPw(""); }} title="Cambiar contraseña">
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteUser(u)} title="Eliminar" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setNewEmail(""); setNewPassword(""); setNewRole("admin"); setShowNewPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear administrador</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo administrador.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Input type="email" placeholder="Correo electrónico" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <div className="relative">
              <Input type={showNewPassword ? "text" : "password"} placeholder="Contraseña (mín. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex={-1}>
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {isSuperAdmin && (
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createLoading}>{createLoading ? "Creando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este administrador?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la cuenta de {deleteUser?.email}. Esta acción es irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => { if (!o) { setPwUser(null); setNewPw(""); setShowPwPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para {pwUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input type={showPwPassword ? "text" : "password"} placeholder="Nueva contraseña" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="pr-10" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10" onClick={() => setShowPwPassword(!showPwPassword)} tabIndex={-1}>
              {showPwPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdatePassword} disabled={pwLoading || !newPw}>{pwLoading ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
