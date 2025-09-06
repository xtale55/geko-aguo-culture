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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full filter blur-2xl"></div>
        </div>

        <div className="relative z-10 space-y-12 pb-16">
          {/* Hero Section */}
          <div className="text-center pt-16 pb-8 px-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-8 text-gray-400 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div className="max-w-4xl mx-auto">
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-6 leading-tight">
                Manejos
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Gerencie todos os aspectos da sua aquicultura com ferramentas inteligentes e modernas
              </p>
            </div>
          </div>

          {/* Management Cards Grid */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {managementCards.map((card, index) => {
                const IconComponent = card.icon;
                
                return (
                  <Card
                    key={card.id}
                    className="group cursor-pointer backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden relative"
                    onClick={() => navigate(card.route)}
                  >
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <CardContent className="p-8 relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 group-hover:border-white/20 transition-all duration-300">
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {card.status === 'Novo' && (
                            <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full border border-purple-500/30 backdrop-blur-sm">
                              Novo
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 group-hover:bg-clip-text transition-all duration-300">
                          {card.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                          {card.description}
                        </p>
                      </div>

                      {/* Hover effect line */}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Section */}
          {!isMobile && (
            <div className="max-w-7xl mx-auto px-4">
              <Card className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/8 transition-all duration-500">
                <CardHeader className="pb-8">
                  <CardTitle className="flex items-center gap-3 text-white text-2xl font-bold">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                      <Activity className="w-6 h-6 text-blue-300" />
                    </div>
                    Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
                    {/* Biometrics */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-blue-300 flex items-center gap-2 text-lg">
                        <Scale className="w-5 h-5" />
                        Biometrias
                      </h4>
                      <div className="space-y-3">
                        {recentBiometrics.length > 0 ? (
                          recentBiometrics.slice(0, 3).map((bio: any) => (
                            <div key={bio.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{bio.pond_batches?.ponds?.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(bio.measurement_date).toLocaleDateString('pt-BR')}</span>
                                  <span>• {bio.average_weight}g</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>

                    {/* Water Quality */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-cyan-300 flex items-center gap-2 text-lg">
                        <Droplets className="w-5 h-5" />
                        Qualidade da Água
                      </h4>
                      <div className="space-y-3">
                        {recentWaterQuality.length > 0 ? (
                          recentWaterQuality.slice(0, 3).map((wq: any) => (
                            <div key={wq.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{wq.ponds?.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(wq.measurement_date).toLocaleDateString('pt-BR')}</span>
                                  {wq.ph_level && <span>• pH {wq.ph_level}</span>}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>

                    {/* Input Applications */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-emerald-300 flex items-center gap-2 text-lg">
                        <Beaker className="w-5 h-5" />
                        Aplicações de Insumos
                      </h4>
                      <div className="space-y-3">
                        {recentInputs.length > 0 ? (
                          recentInputs.slice(0, 3).map((input: any) => (
                            <div key={input.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{input.input_item_name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(input.application_date).toLocaleDateString('pt-BR')}</span>
                                  <span>• {input.quantity_applied}kg</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>

                    {/* Mortality */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-red-300 flex items-center gap-2 text-lg">
                        <Skull className="w-5 h-5" />
                        Mortalidade
                      </h4>
                      <div className="space-y-3">
                        {recentMortality.length > 0 ? (
                          recentMortality.slice(0, 3).map((mortality: any) => (
                            <div key={mortality.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-red-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{mortality.pond_batches?.ponds?.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(mortality.record_date).toLocaleDateString('pt-BR')}</span>
                                  <span>• {mortality.dead_count} mortos</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>

                    {/* Harvest */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-orange-300 flex items-center gap-2 text-lg">
                        <Fish className="w-5 h-5" />
                        Despesca
                      </h4>
                      <div className="space-y-3">
                        {recentHarvest.length > 0 ? (
                          recentHarvest.slice(0, 3).map((harvest: any) => (
                            <div key={harvest.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{harvest.pond_batches?.ponds?.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(harvest.harvest_date).toLocaleDateString('pt-BR')}</span>
                                  <span>• {harvest.biomass_harvested}kg</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>

                    {/* Operational Costs */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-purple-300 flex items-center gap-2 text-lg">
                        <DollarSign className="w-5 h-5" />
                        Custos Operacionais
                      </h4>
                      <div className="space-y-3">
                        {recentCosts.length > 0 ? (
                          recentCosts.slice(0, 3).map((cost: any) => (
                            <div key={cost.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{cost.category}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{new Date(cost.cost_date).toLocaleDateString('pt-BR')}</span>
                                  <span>• R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum registro recente</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}