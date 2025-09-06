import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Droplets, Skull, Beaker, Fish, DollarSign, ChevronRight, Clock, Activity, Utensils } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFarmsQuery } from '@/hooks/useSupabaseQuery';
import { useRecentManagementData } from '@/hooks/useRecentManagementData';

export default function Manejos() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Get farm data for recent records
  const { data: farms } = useFarmsQuery();
  const farmId = farms?.[0]?.id;
  const { recentBiometrics, recentWaterQuality, recentInputs, recentMortality, recentHarvest, recentCosts } = useRecentManagementData(farmId);

  const managementCards = [
    {
      id: 'biometria',
      title: 'Biometria',
      description: 'Registre medições de peso e crescimento',
      icon: Scale,
      iconColor: 'text-blue-600/70',
      route: '/manejos/biometria',
      status: 'Ativo'
    },
    {
      id: 'insumos',
      title: 'Aplicação de Insumos',
      description: 'Controle probióticos e fertilizantes',
      icon: Beaker,
      iconColor: 'text-emerald-600/70',
      route: '/manejos/insumos',
      status: 'Ativo'
    },
    {
      id: 'agua',
      title: 'Qualidade da Água',
      description: 'Monitore parâmetros físico-químicos',
      icon: Droplets,
      iconColor: 'text-cyan-600/70',
      route: '/manejos/agua',
      status: 'Ativo'
    },
    {
      id: 'mortalidade',
      title: 'Mortalidade',
      description: 'Registre ocorrências de mortalidade',
      icon: Skull,
      iconColor: 'text-red-600/70',
      route: '/manejos/mortalidade',
      status: 'Ativo'
    },
    {
      id: 'despesca',
      title: 'Despesca',
      description: 'Gerencie despescas e produção',
      icon: Fish,
      iconColor: 'text-orange-600/70',
      route: '/manejos/despesca',
      status: 'Ativo'
    },
    {
      id: 'alimentacao',
      title: 'Alimentação',
      description: 'Registre alimentação diária',
      icon: Utensils,
      iconColor: 'text-green-600/70',
      route: '/manejos/alimentacao',
      status: 'Novo'
    },
    {
      id: 'custos',
      title: 'Custos Operacionais',
      description: 'Controle custos e despesas',
      icon: DollarSign,
      iconColor: 'text-purple-600/70',
      route: '/manejos/custos',
      status: 'Novo'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">{/* ... keep existing code */}
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
                Manejos
              </h1>
              <p className="text-slate-600">
                Selecione o tipo de manejo que deseja gerenciar
              </p>
            </div>
          </div>

          {/* Management Cards */}
          <div className={`space-y-4 ${!isMobile ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0' : ''}`}>
            {managementCards.map((card, index) => {
              const IconComponent = card.icon;
              
              return (
                <Card
                  key={card.id}
                  className={`
                    group cursor-pointer 
                    backdrop-blur-sm bg-white/80 border-slate-200
                    hover:shadow-lg transition-all duration-300
                    ${isMobile ? 'p-4' : 'p-6'}
                    ${card.status === 'Novo' ? 'ring-2 ring-purple-400/30' : ''}
                  `}
                  onClick={() => navigate(card.route)}
                >
                  {isMobile ? (
                    // Mobile: Layout horizontal
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg flex-shrink-0">
                        <IconComponent className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-semibold text-slate-800 truncate">
                            {card.title}
                          </h3>
                          {card.status === 'Novo' && (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full ml-2 flex-shrink-0">
                              Novo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                    </div>
                  ) : (
                    // Desktop: Layout vertical
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <IconComponent className={`w-7 h-7 ${card.iconColor}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {card.status === 'Novo' && (
                            <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              Novo
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Recent Records Section - Desktop Only */}
          {!isMobile && (
            <Card className="backdrop-blur-sm bg-white/80 border-slate-200 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Últimos Registros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {/* Biometrics */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-600" />
                      Biometrias
                    </h4>
                    <div className="space-y-2">
                      {recentBiometrics.length > 0 ? (
                        recentBiometrics.slice(0, 3).map((bio: any) => (
                          <div key={bio.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{bio.pond_batches?.ponds?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(bio.measurement_date).toLocaleDateString('pt-BR')}</span>
                                <span>• {bio.average_weight}g</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>

                  {/* Water Quality */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-cyan-600" />
                      Qualidade da Água
                    </h4>
                    <div className="space-y-2">
                      {recentWaterQuality.length > 0 ? (
                        recentWaterQuality.slice(0, 3).map((wq: any) => (
                          <div key={wq.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-cyan-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{wq.ponds?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(wq.measurement_date).toLocaleDateString('pt-BR')}</span>
                                {wq.ph_level && <span>• pH {wq.ph_level}</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>

                  {/* Input Applications */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Beaker className="w-4 h-4 text-emerald-600" />
                      Aplicações de Insumos
                    </h4>
                    <div className="space-y-2">
                      {recentInputs.length > 0 ? (
                        recentInputs.slice(0, 3).map((input: any) => (
                          <div key={input.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{input.input_item_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(input.application_date).toLocaleDateString('pt-BR')}</span>
                                <span>• {input.quantity_applied}kg</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>

                  {/* Mortality */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Skull className="w-4 h-4 text-red-600" />
                      Mortalidade
                    </h4>
                    <div className="space-y-2">
                      {recentMortality.length > 0 ? (
                        recentMortality.slice(0, 3).map((mortality: any) => (
                          <div key={mortality.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-red-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{mortality.pond_batches?.ponds?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(mortality.record_date).toLocaleDateString('pt-BR')}</span>
                                <span>• {mortality.dead_count} mortos</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>

                  {/* Harvest */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Fish className="w-4 h-4 text-orange-600" />
                      Despesca
                    </h4>
                    <div className="space-y-2">
                      {recentHarvest.length > 0 ? (
                        recentHarvest.slice(0, 3).map((harvest: any) => (
                          <div key={harvest.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{harvest.pond_batches?.ponds?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(harvest.harvest_date).toLocaleDateString('pt-BR')}</span>
                                <span>• {harvest.biomass_harvested}kg</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>

                  {/* Operational Costs */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      Custos Operacionais
                    </h4>
                    <div className="space-y-2">
                      {recentCosts.length > 0 ? (
                        recentCosts.slice(0, 3).map((cost: any) => (
                          <div key={cost.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{cost.category}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(cost.cost_date).toLocaleDateString('pt-BR')}</span>
                                <span>• R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum registro recente</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}