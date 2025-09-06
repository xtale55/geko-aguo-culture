import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Droplets, Skull, Beaker, Fish, DollarSign, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Manejos() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const managementCards = [
    {
      id: 'biometria',
      title: 'Biometria',
      description: 'Registre medições de peso e crescimento',
      icon: Scale,
      color: 'from-blue-600 to-blue-700',
      route: '/manejos/biometria',
      status: 'Ativo'
    },
    {
      id: 'insumos',
      title: 'Aplicação de Insumos',
      description: 'Controle probióticos e fertilizantes',
      icon: Beaker,
      color: 'from-emerald-600 to-emerald-700',
      route: '/manejos/insumos',
      status: 'Ativo'
    },
    {
      id: 'agua',
      title: 'Qualidade da Água',
      description: 'Monitore parâmetros físico-químicos',
      icon: Droplets,
      color: 'from-cyan-600 to-cyan-700',
      route: '/manejos/agua',
      status: 'Ativo'
    },
    {
      id: 'mortalidade',
      title: 'Mortalidade',
      description: 'Registre ocorrências de mortalidade',
      icon: Skull,
      color: 'from-red-600 to-red-700',
      route: '/manejos/mortalidade',
      status: 'Ativo'
    },
    {
      id: 'despesca',
      title: 'Despesca',
      description: 'Gerencie despescas e produção',
      icon: Fish,
      color: 'from-orange-600 to-orange-700',
      route: '/manejos/despesca',
      status: 'Ativo'
    },
    {
      id: 'custos',
      title: 'Custos Operacionais',
      description: 'Controle custos e despesas',
      icon: DollarSign,
      color: 'from-purple-600 to-purple-700',
      route: '/manejos/custos',
      status: 'Novo'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white/50 to-emerald-50/80 backdrop-blur-sm">
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="mb-4 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
                Manejos
              </h1>
              <p className="text-slate-700/80">
                Selecione o tipo de manejo que deseja gerenciar
              </p>
            </div>
          </div>

          {/* Management Cards */}
          <div className={`space-y-4 ${!isMobile ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0' : ''}`}>
            {managementCards.map((card, index) => {
              const IconComponent = card.icon;
              
              return (
                <div
                  key={card.id}
                  className={`
                    group cursor-pointer 
                    bg-white/15 backdrop-blur-lg border border-white/20 
                    rounded-2xl transition-all duration-500 ease-out
                    hover:bg-white/25 hover:border-white/40
                    hover:shadow-2xl hover:shadow-${card.color.includes('blue') ? 'blue' : card.color.includes('emerald') ? 'emerald' : card.color.includes('cyan') ? 'cyan' : card.color.includes('red') ? 'red' : card.color.includes('orange') ? 'orange' : 'purple'}-500/20
                    hover:-translate-y-2 hover:scale-[1.02]
                    ${isMobile ? 'p-4' : 'p-6'}
                    ${card.status === 'Novo' ? 'ring-2 ring-purple-400/30' : ''}
                  `}
                  onClick={() => navigate(card.route)}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {isMobile ? (
                    // Mobile: Layout horizontal
                    <div className="flex items-center gap-4">
                      <div className={`
                        p-3 rounded-xl bg-gradient-to-r ${card.color} 
                        shadow-lg shadow-current/30
                        group-hover:scale-110 transition-all duration-300
                        flex-shrink-0
                      `}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                            {card.title}
                          </h3>
                          {card.status === 'Novo' && (
                            <span className="px-2 py-1 text-xs font-medium bg-white/20 backdrop-blur-md text-purple-700 rounded-full border border-purple-200/50 ml-2 flex-shrink-0">
                              Novo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600/80 group-hover:text-slate-700 transition-colors line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                    </div>
                  ) : (
                    // Desktop: Layout vertical
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={`
                          p-4 rounded-xl bg-gradient-to-r ${card.color} 
                          shadow-lg shadow-current/30
                          group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
                        `}>
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          {card.status === 'Novo' && (
                            <span className="px-3 py-1 text-xs font-medium bg-white/20 backdrop-blur-md text-purple-700 rounded-full border border-purple-200/50">
                              Novo
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800 group-hover:text-slate-900 transition-colors mb-2">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-600/80 group-hover:text-slate-700 transition-colors leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}