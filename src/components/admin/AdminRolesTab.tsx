import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, Shield, Lock } from "lucide-react";
import { RBAC_SECTIONS, type RbacSection } from "@/data/rbacSections";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CustomRole {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface RolePermission {
  id: string;
  role_id: string;
  section: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

type CrudKey = "can_create" | "can_read" | "can_update" | "can_delete";
const CRUD_KEYS: CrudKey[] = ["can_create", "can_read", "can_update", "can_delete"];

async function fetchRoles(): Promise<CustomRole[]> {
  const { data } = await supabase.from("custom_roles").select("*").order("created_at");
  return Array.isArray(data) ? data : [];
}

async function fetchPermissions(roleId: string): Promise<RolePermission[]> {
  const { data } = await supabase.from("role_permissions").select("*").eq("role_id", roleId);
  return Array.isArray(data) ? data : [];
}

export default function AdminRolesTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    const r = await fetchRoles();
    setRoles(r);
    setLoading(false);
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const selectRole = useCallback(async (role: CustomRole) => {
    setSelectedRole(role);
    const perms = await fetchPermissions(role.id);
    setPermissions(perms);
  }, []);

  // Get permission value for a section key
  const getPermValue = (section: string, key: CrudKey): boolean => {
    const perm = permissions.find((p) => p.section === section);
    if (perm) return perm[key];
    // Fallback to parent
    const dot = section.indexOf(".");
    if (dot > 0) {
      const parent = permissions.find((p) => p.section === section.substring(0, dot));
      if (parent) return parent[key];
    }
    return false;
  };

  const hasExplicitPerm = (section: string): boolean => {
    return permissions.some((p) => p.section === section);
  };

  const togglePerm = async (section: string, key: CrudKey) => {
    if (!selectedRole) return;
    const currentVal = getPermValue(section, key);
    const newVal = !currentVal;

    const existing = permissions.find((p) => p.section === section);
    if (existing) {
      const updates = { [key]: newVal };
      await supabase.from("role_permissions").update(updates).eq("id", existing.id);
      setPermissions((prev) =>
        prev.map((p) => (p.id === existing.id ? { ...p, [key]: newVal } : p))
      );
    } else {
      // Create new row with defaults from parent or all false
      const dot = section.indexOf(".");
      let base = { can_create: false, can_read: false, can_update: false, can_delete: false };
      if (dot > 0) {
        const parent = permissions.find((p) => p.section === section.substring(0, dot));
        if (parent) {
          base = { can_create: parent.can_create, can_read: parent.can_read, can_update: parent.can_update, can_delete: parent.can_delete };
        }
      }
      const row = { role_id: selectedRole.id, section, ...base, [key]: newVal };
      const { data } = await supabase.from("role_permissions").insert(row).select().single();
      if (data) setPermissions((prev) => [...prev, data as RolePermission]);
    }
  };

  const toggleParentAll = async (sectionKey: string, key: CrudKey) => {
    if (!selectedRole) return;
    const currentVal = getPermValue(sectionKey, key);
    const newVal = !currentVal;

    // Update parent
    await togglePermDirect(sectionKey, key, newVal);

    // Remove child overrides for this key if they match new parent value
    const sec = RBAC_SECTIONS.find((s) => s.key === sectionKey);
    if (sec?.children) {
      for (const child of sec.children) {
        const childPerm = permissions.find((p) => p.section === child.key);
        if (childPerm) {
          await supabase.from("role_permissions").delete().eq("id", childPerm.id);
        }
      }
      // Reload permissions
      const perms = await fetchPermissions(selectedRole.id);
      setPermissions(perms);
    }
  };

  const togglePermDirect = async (section: string, key: CrudKey, newVal: boolean) => {
    if (!selectedRole) return;
    const existing = permissions.find((p) => p.section === section);
    if (existing) {
      const updates = { [key]: newVal };
      await supabase.from("role_permissions").update(updates).eq("id", existing.id);
      setPermissions((prev) =>
        prev.map((p) => (p.id === existing.id ? { ...p, [key]: newVal } : p))
      );
    } else {
      const row = { role_id: selectedRole.id, section, can_create: false, can_read: false, can_update: false, can_delete: false, [key]: newVal };
      const { data } = await supabase.from("role_permissions").insert(row).select().single();
      if (data) setPermissions((prev) => [...prev, data as RolePermission]);
    }
  };

  // Create role
  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const row = { name: formName.trim(), description: formDesc.trim() };
      await supabase.from("custom_roles").insert(row);
      toast({ title: "Rol creado", description: formName });
      setCreateOpen(false);
      setFormName("");
      setFormDesc("");
      loadRoles();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Edit role
  const handleEdit = async () => {
    if (!selectedRole || !formName.trim()) return;
    setSaving(true);
    try {
      const updates = { name: formName.trim(), description: formDesc.trim() };
      await supabase.from("custom_roles").update(updates).eq("id", selectedRole.id);
      toast({ title: "Rol actualizado" });
      setEditOpen(false);
      loadRoles();
      setSelectedRole((r) => r ? { ...r, ...updates } : null);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.from("custom_roles").delete().eq("id", deleteTarget.id);
      toast({ title: "Rol eliminado" });
      if (selectedRole?.id === deleteTarget.id) {
        setSelectedRole(null);
        setPermissions([]);
      }
      setDeleteTarget(null);
      loadRoles();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const isSuperAdminRole = selectedRole?.name === "Superadmin";
  const isPermReadOnly = isSuperAdminRole ? !isSuperAdmin : (selectedRole?.is_system && !isSuperAdmin);

  const renderSectionRow = (sec: RbacSection, isChild = false) => {
    const indent = isChild ? "pl-6" : "";

    return (
      <TableRow key={sec.key} className={indent}>
        <TableCell className={`font-medium ${isChild ? "pl-8 text-muted-foreground" : ""}`}>
          {sec.label}
          {isChild && hasExplicitPerm(sec.key) && (
            <Badge variant="outline" className="ml-2 text-[10px] py-0">personalizado</Badge>
          )}
        </TableCell>
        {CRUD_KEYS.map((key) => (
          <TableCell key={key} className="text-center">
            <Checkbox
              checked={getPermValue(sec.key, key)}
              onCheckedChange={() =>
                isChild ? togglePerm(sec.key, key) : toggleParentAll(sec.key, key)
              }
              disabled={!!isPermReadOnly}
            />
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Roles y Permisos</h3>
          <p className="text-sm text-muted-foreground">Crea roles personalizados con permisos CRUD granulares por sección.</p>
        </div>
        <Button size="sm" onClick={() => { setFormName(""); setFormDesc(""); setCreateOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Crear rol
        </Button>
      </div>

      {/* Role list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((role) => {
          // Hide Superadmin role card entirely for non-superadmins
          if (role.name === "Superadmin" && !isSuperAdmin) return null;
          return (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedRole?.id === role.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => selectRole(role)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {role.is_system ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Shield className="w-3.5 h-3.5" />}
                  {role.name}
                  {role.is_system && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{role.description || "Sin descripción"}</p>
                {!role.is_system && (
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormName(role.name);
                        setFormDesc(role.description);
                        setSelectedRole(role);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permission matrix */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Permisos de "{selectedRole.name}"
              {isSuperAdminRole && (
                <Badge variant="outline" className="text-[10px]">Protegido — no modificable</Badge>
              )}
              {!isSuperAdminRole && selectedRole.is_system && !isSuperAdmin && (
                <Badge variant="outline" className="text-[10px]">Solo lectura</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Sección</TableHead>
                    <TableHead className="text-center w-16">C</TableHead>
                    <TableHead className="text-center w-16">R</TableHead>
                    <TableHead className="text-center w-16">U</TableHead>
                    <TableHead className="text-center w-16">D</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RBAC_SECTIONS.map((sec) => (
                    <>
                      {renderSectionRow(sec)}
                      {sec.children && (
                        <Collapsible asChild defaultOpen={false}>
                          <>
                            <TableRow>
                              <TableCell colSpan={5} className="py-0">
                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground py-1 hover:text-foreground transition-colors">
                                  <ChevronDown className="w-3 h-3" />
                                  {sec.children.length} sub-secciones
                                </CollapsibleTrigger>
                              </TableCell>
                            </TableRow>
                            <CollapsibleContent asChild>
                              <>
                                {sec.children.map((child) =>
                                  renderSectionRow({ key: child.key, label: child.label }, true)
                                )}
                              </>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              C = Crear, R = Leer, U = Actualizar, D = Eliminar. Los permisos del padre se heredan a las sub-secciones a menos que se personalicen.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del rol</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Coordinador Regional" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descripción opcional" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del rol</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving || !formName.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también todos los permisos asociados y las asignaciones de usuarios a este rol.
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
