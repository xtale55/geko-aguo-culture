import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Utensils, Clock, ArrowLeft, Plus, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  status: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    latest_biometry?: {
      average_weight: number;
      measurement_date: string;
    };
  };
}

interface FeedingTask {
  pond_id: string;
  pond_name: string;
  batch_name: string;
  current_population: number;
  average_weight: number;
  biomass: number;
  feeding_rate: number;
  daily_feed: number;
  meals_per_day: number;
  feed_per_meal: number;
  doc: number;
}

interface FeedingSchedule {
  time: string;
  completed: boolean;
}

export default function Feeding() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [feedingTasks, setFeedingTasks] = useState<FeedingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedingSchedules, setFeedingSchedules] = useState<Record<string, FeedingSchedule[]>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const defaultSchedule = ['06:00', '10:00', '14:00', '18:00', '22:00'];

  useEffect(() => {
    if (user) {
      loadFeedingData();
    }
  }, [user, selectedDate]);

  const loadFeedingData = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        // Load active ponds with batch and biometry data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
              batches!inner(name),
              biometrics(
                average_weight,
                measurement_date
              )
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .order('name');

        if (pondsError) throw pondsError;

        // Process pond data
        const processedPonds = pondsData?.map(pond => ({
          ...pond,
          current_batch: pond.pond_batches[0] ? {
            id: pond.pond_batches[0].id,
            batch_name: pond.pond_batches[0].batches.name,
            stocking_date: pond.pond_batches[0].stocking_date,
            current_population: pond.pond_batches[0].current_population,
            latest_biometry: pond.pond_batches[0].biometrics
              .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0] || null
          } : undefined
        })) || [];

        setPonds(processedPonds);

        // Generate feeding tasks
        const tasks = processedPonds
          .filter(pond => pond.current_batch?.latest_biometry)
          .map(pond => {
            const batch = pond.current_batch!;
            const biometry = batch.latest_biometry!;
            const doc = calculateDOC(batch.stocking_date);
            const biomass = (batch.current_population * biometry.average_weight) / 1000; // kg
            const feedingRate = getFeedingRate(biometry.average_weight);
            const dailyFeed = biomass * (feedingRate / 100);
            const mealsPerDay = getMealsPerDay(biometry.average_weight);
            const feedPerMeal = dailyFeed / mealsPerDay;

            return {
              pond_id: pond.id,
              pond_name: pond.name,
              batch_name: batch.batch_name,
              current_population: batch.current_population,
              average_weight: biometry.average_weight,
              biomass,
              feeding_rate: feedingRate,
              daily_feed: dailyFeed,
              meals_per_day: mealsPerDay,
              feed_per_meal: feedPerMeal,
              doc
            };
          });

        setFeedingTasks(tasks);

        // Initialize feeding schedules
        const schedules: Record<string, FeedingSchedule[]> = {};
        tasks.forEach(task => {
          schedules[task.pond_id] = defaultSchedule.slice(0, task.meals_per_day).map(time => ({
            time,
            completed: false
          }));
        });
        setFeedingSchedules(schedules);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDOC = (stockingDate: string) => {
    const today = new Date();
    const stocking = new Date(stockingDate);
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getFeedingRate = (weight: number) => {
    // Feeding rate based on weight (percentage of biomass)
    if (weight < 1) return 8;
    if (weight < 3) return 6;
    if (weight < 5) return 5;
    if (weight < 10) return 4;
    if (weight < 15) return 3.5;
    return 3;
  };

  const getMealsPerDay = (weight: number) => {
    // Number of meals per day based on weight
    if (weight < 1) return 5;
    if (weight < 3) return 4;
    if (weight < 10) return 3;
    return 2;
  };

  const toggleMealCompletion = (pondId: string, mealIndex: number) => {
    setFeedingSchedules(prev => ({
      ...prev,
      [pondId]: prev[pondId]?.map((meal, index) => 
        index === mealIndex 
          ? { ...meal, completed: !meal.completed }
          : meal
      ) || []
    }));
  };

  const getCompletionRate = (pondId: string) => {
    const schedule = feedingSchedules[pondId] || [];
    const completed = schedule.filter(meal => meal.completed).length;
    return schedule.length > 0 ? (completed / schedule.length) * 100 : 0;
  };

  const getTotalDailyFeed = () => {
    return feedingTasks.reduce((sum, task) => sum + task.daily_feed, 0);
  };

  const getOverallCompletion = () => {
    const totalMeals = Object.values(feedingSchedules).reduce((sum, schedule) => sum + schedule.length, 0);
    const completedMeals = Object.values(feedingSchedules).reduce(
      (sum, schedule) => sum + schedule.filter(meal => meal.completed).length, 0
    );
    return totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (feedingTasks.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Utensils className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro com biometria</h2>
          <p className="text-muted-foreground mb-6">
            É necessário registrar biometrias para calcular o arraçoamento.
          </p>
          <Button onClick={() => navigate('/biometry')}>
            Registrar Biometria
          </Button>
        </div>
      </Layout>
    );
  }

  const overallCompletion = getOverallCompletion();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Arraçoamento</h1>
            <p className="text-muted-foreground">
              Plano de alimentação calculado automaticamente
            </p>
          </div>
          <div className="text-right">
            <Label htmlFor="date-select" className="text-sm">Data:</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto mt-1"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Ração</p>
                  <p className="text-2xl font-bold text-primary">
                    {getTotalDailyFeed().toFixed(1)} kg
                  </p>
                </div>
                <Utensils className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progresso Diário</p>
                  <p className="text-2xl font-bold text-success">
                    {overallCompletion.toFixed(0)}%
                  </p>
                </div>
                <Clock className="w-8 h-8 text-success/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viveiros Ativos</p>
                  <p className="text-2xl font-bold text-accent-hover">{feedingTasks.length}</p>
                </div>
                <Check className="w-8 h-8 text-accent/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feeding Tasks */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Plano de Alimentação</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {feedingTasks.map((task) => {
              const completionRate = getCompletionRate(task.pond_id);
              const schedule = feedingSchedules[task.pond_id] || [];

              return (
                <Card key={task.pond_id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{task.pond_name}</CardTitle>
                      <Badge 
                        variant={completionRate === 100 ? "default" : completionRate > 0 ? "secondary" : "outline"}
                        className={completionRate === 100 ? "bg-success" : ""}
                      >
                        {completionRate.toFixed(0)}% concluído
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Task Summary */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Lote:</span>
                          <span className="font-medium ml-1">{task.batch_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DOC:</span>
                          <span className="font-medium ml-1">{task.doc} dias</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Biomassa:</span>
                          <span className="font-medium ml-1">{task.biomass.toFixed(1)} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peso médio:</span>
                          <span className="font-medium ml-1">{task.average_weight}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Daily Feed Summary */}
                    <div className="border-l-4 border-primary pl-4">
                      <div className="text-sm text-muted-foreground">Total diário</div>
                      <div className="text-xl font-bold text-primary">{task.daily_feed.toFixed(1)} kg</div>
                      <div className="text-xs text-muted-foreground">
                        {task.feeding_rate}% da biomassa • {task.meals_per_day}x por dia
                      </div>
                    </div>

                    {/* Feeding Schedule */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Horários de Alimentação</div>
                      <div className="space-y-2">
                        {schedule.map((meal, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border border-border rounded">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={meal.completed}
                                onCheckedChange={() => toggleMealCompletion(task.pond_id, index)}
                              />
                              <div>
                                <div className="font-medium">{meal.time}</div>
                                <div className="text-xs text-muted-foreground">
                                  {task.feed_per_meal.toFixed(1)} kg
                                </div>
                              </div>
                            </div>
                            {meal.completed && (
                              <Check className="w-4 h-4 text-success" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {completionRate < 100 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Pendente: {(schedule.length - schedule.filter(m => m.completed).length)} refeições</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}