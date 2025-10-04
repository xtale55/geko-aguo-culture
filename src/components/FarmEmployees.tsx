import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Edit, Plus, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const employeeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.enum(["Operador", "Técnico"], { required_error: "Tipo de funcionário é obrigatório" }),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  permissions: z.object({
    manejos: z.boolean(),
    despesca: z.boolean(),
    estoque: z.boolean()
  }).optional()
}).refine((data) => {
  // Se for Operador, email é obrigatório
  if (data.role === "Operador" && !data.email) {
    return false;
  }
  // Se for Operador, pelo menos uma permissão deve estar marcada
  if (data.role === "Operador" && data.permissions) {
    return data.permissions.manejos || data.permissions.despesca || data.permissions.estoque;
  }
  return true;
}, {
  message: "Operadores precisam de email e pelo menos uma permissão",
  path: ["email"]
});

type EmployeeForm = z.infer<typeof employeeSchema>;

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  phone?: string;
  email?: string;
  hire_date: string;
  salary?: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface FarmEmployeesProps {
  farmId: string;
}

export function FarmEmployees({ farmId }: FarmEmployeesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      role: "Operador",
      phone: "",
      email: "",
      permissions: {
        manejos: false,
        despesca: false,
        estoque: false
      }
    },
  });

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["farm-employees", farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farm_employees")
        .select("*")
        .eq("farm_id", farmId)
        .order("name");

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!farmId && !!user,
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeForm) => {
      const { data: employeeRecord, error } = await supabase
        .from("farm_employees")
        .insert({
          name: employeeData.name,
          role: employeeData.role,
          department: "produção",
          farm_id: farmId,
          hire_date: new Date().toISOString().split('T')[0],
          status: "ativo",
          email: employeeData.email || null,
          phone: employeeData.phone || null,
          salary: null,
          notes: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Se for Operador, criar convite
      if (employeeData.role === "Operador" && employeeData.email && employeeData.permissions) {
        // Gerar token único
        const token = crypto.randomUUID();
        
        // Buscar nome da fazenda
        const { data: farm } = await supabase
          .from('farms')
          .select('name')
          .eq('id', farmId)
          .single();

        // Criar convite
        const { error: inviteError } = await supabase
          .from('invitations')
          .insert({
            email: employeeData.email,
            farm_id: farmId,
            role: 'operador',
            token,
            permissions: employeeData.permissions,
            invited_by: user?.id,
            status: 'pending'
          });

        if (inviteError) throw inviteError;

        // Enviar email via Edge Function
        await supabase.functions.invoke('send-operator-invite', {
          body: {
            email: employeeData.email,
            farmName: farm?.name || 'Fazenda',
            token,
            permissions: employeeData.permissions
          }
        });
      }

      return employeeRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-employees", farmId] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Funcionário adicionado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar funcionário: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, ...employeeData }: EmployeeForm & { id: string }) => {
      const { data, error } = await supabase
        .from("farm_employees")
        .update({
          name: employeeData.name,
          role: employeeData.role,
          department: "produção", // Default value for database compatibility
          hire_date: new Date().toISOString().split('T')[0], // Keep existing or default
          status: "ativo", // Default status
          email: employeeData.email || null,
          phone: employeeData.phone || null,
          salary: null, // No salary field anymore
          notes: null, // No notes field anymore
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-employees", farmId] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Funcionário atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar funcionário: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("farm_employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-employees", farmId] });
      toast({
        title: "Sucesso",
        description: "Funcionário removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover funcionário: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EmployeeForm) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ ...data, id: editingEmployee.id });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      name: employee.name,
      role: employee.role as "Operador" | "Técnico",
      phone: employee.phone || "",
      email: employee.email || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este funcionário?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const activeEmployees = employees.filter(emp => emp.status === "ativo");
  const operatorCount = employees.filter(emp => emp.role === "Operador").length;
  const technicianCount = employees.filter(emp => emp.role === "Técnico").length;

  if (isLoading) {
    return <div>Carregando funcionários...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operatorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Funcionários</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEmployee(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Funcionário" : "Adicionar Funcionário"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Funcionário</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Operador">Operador</SelectItem>
                          <SelectItem value="Técnico">Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email {form.watch('role') === 'Operador' && <span className="text-red-500">*</span>}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('role') === 'Operador' && (
                  <div className="space-y-3 p-4 border rounded-md">
                    <h4 className="font-medium text-sm">Permissões de Acesso</h4>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="permissions.manejos"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                            <label className="text-sm">Acesso a Manejos</label>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permissions.despesca"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                            <label className="text-sm">Acesso a Despesca</label>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permissions.estoque"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                            <label className="text-sm">Acesso a Estoque</label>
                          </div>
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione pelo menos uma permissão
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {editingEmployee ? "Atualizar" : "Adicionar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees List */}
      <div className="grid gap-4">
        {employees.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <CardDescription>{employee.role}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Tipo</p>
                    <p className="text-muted-foreground">{employee.role}</p>
                  </div>
                  {employee.phone && (
                    <div>
                      <p className="font-medium">Telefone</p>
                      <p className="text-muted-foreground">{employee.phone}</p>
                    </div>
                  )}
                  {employee.email && (
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{employee.email}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}