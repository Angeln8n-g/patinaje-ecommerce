"use client";

import { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "@/lib/skating-store/user-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { UserRole } from "@/types/skating-store";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      toast.error("Error al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("Rol actualizado correctamente");
      loadUsers();
    } catch (error) {
      toast.error("Error al actualizar rol");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Rol Actual</TableHead>
              <TableHead>Cambiar Rol</TableHead>
              <TableHead>Fecha Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'DELIVERY' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select 
                    defaultValue={user.role} 
                    onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Usuario</SelectItem>
                      <SelectItem value="DELIVERY">Repartidor</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
