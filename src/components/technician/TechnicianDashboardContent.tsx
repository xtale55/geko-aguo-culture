import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForkKnife, Scales, Drop, Skull, Clock, CheckCircle, Warning } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export function TechnicianDashboardContent() {
  const navigate = useNavigate();

  // Dados mockados para demonstração
  const todayTasks = [
    {
      id: 1,
      type: 'feeding',
      title: 'Alimentação - Viveiro 01',
      time: '08:00',
      status: 'pending',
      priority: 'high'
    },
    {
      id: 2,
      type: 'water_quality',
      title: 'Análise de Água - Viveiro 02',
      time: '10:00',
      status: 'pending',
      priority: 'medium'
    },
    {
      id: 3,
      type: 'biometry',
      title: 'Biometria - Viveiro 03',
      time: '14:00',
      status: 'completed',
      priority: 'medium'
    },
    {
      id: 4,
      type: 'feeding',
      title: 'Alimentação - Viveiro 01',
      time: '16:00',
      status: 'pending',
      priority: 'high'
    }
  ];

  const stats = {
    pendingTasks: 3,
    completedTasks: 1,
    totalPonds: 5,
    alerts: 2
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'feeding': return ForkKnife;
      case 'biometry': return Scales;
      case 'water_quality': return Drop;
      case 'mortality': return Skull;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success';
      case 'pending': return 'bg-warning/20 text-warning-foreground';
      case 'overdue': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de boas-vindas */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-accent mb-2">
          Bem-vindo ao seu painel técnico
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas tarefas diárias de forma eficiente
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning mb-1">
              {stats.pendingTasks}
            </div>
            <div className="text-sm text-muted-foreground">
              Tarefas Pendentes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">
              {stats.completedTasks}
            </div>
            <div className="text-sm text-muted-foreground">
              Concluídas Hoje
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">
              {stats.totalPonds}
            </div>
            <div className="text-sm text-muted-foreground">
              Viveiros Ativos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive mb-1">
              {stats.alerts}
            </div>
            <div className="text-sm text-muted-foreground">
              Alertas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas importantes */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Warning className="w-5 h-5" />
            Alertas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div>
              <p className="font-medium">Viveiro 02 - pH elevado</p>
              <p className="text-sm text-muted-foreground">Verificar qualidade da água imediatamente</p>
            </div>
            <Button size="sm" variant="destructive">
              Verificar
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div>
              <p className="font-medium">Alimentação atrasada - Viveiro 01</p>
              <p className="text-sm text-muted-foreground">Horário: 08:00 (atrasado)</p>
            </div>
            <Button size="sm" variant="destructive">
              Realizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tarefas do dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tarefas de Hoje
          </CardTitle>
          <CardDescription>
            Suas atividades programadas para hoje
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayTasks.map((task) => {
            const TaskIcon = getTaskIcon(task.type);
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-full">
                    <TaskIcon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Horário: {task.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority === 'high' ? 'Alta' : 
                     task.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                  
                  {task.status === 'completed' ? (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Concluída</span>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline">
                      Realizar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Acesso rápido às funcionalidades */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>
            Funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                path: '/manejos/alimentacao',
                icon: ForkKnife,
                label: 'Registrar Alimentação',
                color: 'from-orange-500 to-red-500'
              },
              {
                path: '/manejos/biometria',
                icon: Scales,
                label: 'Nova Biometria',
                color: 'from-blue-500 to-purple-500'
              },
              {
                path: '/manejos/agua',
                icon: Drop,
                label: 'Análise de Água',
                color: 'from-cyan-500 to-blue-500'
              },
              {
                path: '/manejos/mortalidade',
                icon: Skull,
                label: 'Registrar Mortalidade',
                color: 'from-red-500 to-pink-500'
              }
            ].map(({ path, icon: Icon, label, color }) => (
              <Button
                key={path}
                variant="outline"
                className="h-20 flex-col space-y-2 border-2 hover:scale-105 transition-all duration-200"
                onClick={() => navigate(path)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-center">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}