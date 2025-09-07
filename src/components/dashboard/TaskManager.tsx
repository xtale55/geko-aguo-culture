import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trash2, Edit } from "lucide-react";
import { useUserTasks, createTask, updateTask, deleteTask, type UserTask } from "@/hooks/useUserTasks";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskManagerProps {
  farmId?: string;
}

export function TaskManager({ farmId }: TaskManagerProps) {
  const { user } = useAuth();
  const { data: tasks = [], refetch } = useUserTasks(farmId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: ''
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', due_date: '' });
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!farmId || !user?.id) return;

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formData.title,
          description: formData.description || undefined,
          due_date: formData.due_date || undefined
        });
        toast({ title: "Tarefa atualizada com sucesso!" });
      } else {
        await createTask({
          ...formData,
          description: formData.description || undefined,
          due_date: formData.due_date || undefined,
          completed: false,
          farm_id: farmId,
          user_id: user.id
        });
        toast({ title: "Tarefa criada com sucesso!" });
      }
      
      await refetch();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Erro ao salvar tarefa",
        variant: "destructive" 
      });
    }
  };

  const handleToggleComplete = async (task: UserTask) => {
    try {
      await updateTask(task.id, { completed: !task.completed });
      await refetch();
      toast({ 
        title: task.completed ? "Tarefa reaberta" : "Tarefa concluída!" 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Erro ao atualizar tarefa",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      await refetch();
      toast({ title: "Tarefa excluída com sucesso!" });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Erro ao excluir tarefa",
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (task: UserTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || ''
    });
    setIsDialogOpen(true);
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Tarefas Pendentes
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Data de vencimento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTask ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhuma tarefa pendente</p>
              <p className="text-sm">Clique em "Nova Tarefa" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {new Date(task.due_date) < new Date() && (
                          <Badge variant="destructive" className="text-xs ml-1">
                            Vencida
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(task)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(task.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {completedTasks.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Concluídas ({completedTasks.length})
              </h4>
              <div className="space-y-2">
                {completedTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 opacity-60">
                    <Checkbox checked disabled />
                    <span className="text-sm line-through text-muted-foreground">
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}