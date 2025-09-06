import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Droplets, Skull, Beaker, Fish, DollarSign, ChevronRight } from 'lucide-react';

export default function Manejos() {
  const navigate = useNavigate();

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
                Manejos
              </h1>
              <p className="text-slate-600">
                Selecione o tipo de manejo que deseja gerenciar
              </p>
            </div>
          </div>

          {/* Management Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managementCards.map((card) => {
              const IconComponent = card.icon;
              
              return (
                <Card 
                  key={card.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 border-slate-200/60 bg-white/70 backdrop-blur-sm"
                  onClick={() => navigate(card.route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color} shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {card.status === 'Novo' && (
                          <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full">
                            Novo
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">
                      {card.description}
                    </p>
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