import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scales, Drop, Skull, TestTube, Shrimp, CurrencyDollar, CaretRight, Clock, Pulse, ForkKnife } from '@phosphor-icons/react';
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
      id: 'alimentacao',
      title: 'Alimentação',
      description: 'Registre alimentação diária',
      icon: ForkKnife,
      iconColor: 'text-green-600/70',
      route: '/manejos/alimentacao',
      status: 'Novo'
    },
    {
      id: 'insumos',
      title: 'Aplicação de Insumos',
      description: 'Controle probióticos e fertilizantes',
      icon: TestTube,
      iconColor: 'text-emerald-600/70',
      route: '/manejos/insumos',
      status: 'Ativo'
    },
    {
      id: 'biometria',
      title: 'Biometria',
      description: 'Registre medições de peso e crescimento',
      icon: Scales,
      iconColor: 'text-blue-600/70',
      route: '/manejos/biometria',
      status: 'Ativo'
    },
    {
      id: 'agua',
      title: 'Qualidade da Água',
      description: 'Monitore parâmetros físico-químicos',
      icon: Drop,
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
    }
  ];

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
              className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Manejos
            </h1>
            <p className="text-slate-600">
              Selecione o tipo de manejo que deseja gerenciar
            </p>
          </div>
        </div>

        {/* Management Cards Grid */}
        <div className={`${!isMobile ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
          {managementCards.map((card, index) => {
            const IconComponent = card.icon;
            const isFirstCard = index === 0; // Alimentação
            
            return (
              <Card
                key={card.id}
                className={`
                  group cursor-pointer 
                  backdrop-blur-sm bg-white border-border
                  hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02]
                  ${isMobile ? 'p-3' : 'p-2'}
                  ${card.status === 'Novo' ? 'ring-1 ring-purple-400/20' : ''}
                  ${!isMobile && isFirstCard ? 'col-span-2' : ''}
                  overflow-hidden relative
                `}
                onClick={() => navigate(card.route)}
              >
                {/* Card glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {isMobile ? (
                  // Mobile: Layout horizontal
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20 flex-shrink-0">
                      <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {card.title}
                        </h3>
                        {card.status === 'Novo' && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full ml-2 flex-shrink-0">
                            Novo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                    
                    <CaretRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                  </div>
                ) : (
                  // Desktop: Layout vertical
                  <CardContent className="p-2 relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 group-hover:border-primary/30 transition-all duration-300">
                        <IconComponent className={`w-4 h-4 ${card.iconColor}`} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {card.status === 'Novo' && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 rounded-md border border-purple-500/30">
                            Novo
                          </span>
                        )}
                        <CaretRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-all duration-300">
                        {card.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors duration-300">
                        {card.description}
                      </p>
                    </div>

                    {/* Hover effect line */}
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-accent to-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Recent Activity Section */}
        {!isMobile && (
          <Card className="backdrop-blur-sm bg-card border-border hover:shadow-lg transition-all duration-500">
            <CardHeader className="pb-8">
              <CardTitle className="flex items-center gap-3 text-foreground text-2xl font-bold">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                  <Pulse className="w-6 h-6 text-primary" />
                </div>
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
                {/* Biometrics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary flex items-center gap-2 text-lg">
                    <Scales className="w-5 h-5" />
                    Biometrias
                  </h4>
                  <div className="space-y-3">
                    {recentBiometrics.length > 0 ? (
                      recentBiometrics.slice(0, 3).map((bio: any) => (
                        <div key={bio.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{bio.pond_batches?.ponds?.name}</p>
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
                <div className="space-y-4">
                  <h4 className="font-semibold text-cyan-600 flex items-center gap-2 text-lg">
                    <Drop className="w-5 h-5" />
                    Qualidade da Água
                  </h4>
                  <div className="space-y-3">
                    {recentWaterQuality.length > 0 ? (
                      recentWaterQuality.slice(0, 3).map((wq: any) => (
                        <div key={wq.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{wq.ponds?.name}</p>
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
                <div className="space-y-4">
                  <h4 className="font-semibold text-emerald-600 flex items-center gap-2 text-lg">
                    <TestTube className="w-5 h-5" />
                    Aplicações de Insumos
                  </h4>
                  <div className="space-y-3">
                    {recentInputs.length > 0 ? (
                      recentInputs.slice(0, 3).map((input: any) => (
                        <div key={input.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{input.input_item_name}</p>
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
                <div className="space-y-4">
                  <h4 className="font-semibold text-red-600 flex items-center gap-2 text-lg">
                    <Skull className="w-5 h-5" />
                    Mortalidade
                  </h4>
                  <div className="space-y-3">
                    {recentMortality.length > 0 ? (
                      recentMortality.slice(0, 3).map((mortality: any) => (
                        <div key={mortality.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-red-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{mortality.pond_batches?.ponds?.name}</p>
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
                <div className="space-y-4">
                  <h4 className="font-semibold text-orange-600 flex items-center gap-2 text-lg">
                    <Shrimp className="w-5 h-5" />
                    Despesca
                  </h4>
                  <div className="space-y-3">
                    {recentHarvest.length > 0 ? (
                      recentHarvest.slice(0, 3).map((harvest: any) => (
                        <div key={harvest.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{harvest.pond_batches?.ponds?.name}</p>
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
                <div className="space-y-4">
                  <h4 className="font-semibold text-purple-600 flex items-center gap-2 text-lg">
                    <CurrencyDollar className="w-5 h-5" />
                    Custos Operacionais
                  </h4>
                  <div className="space-y-3">
                    {recentCosts.length > 0 ? (
                      recentCosts.slice(0, 3).map((cost: any) => (
                        <div key={cost.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{cost.category}</p>
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
    </Layout>
  );
}