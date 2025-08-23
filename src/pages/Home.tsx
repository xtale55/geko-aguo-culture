import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fish, BarChart3, Users, Shield, Droplets, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Fish,
      title: "Gestão Inteligente",
      description: "Monitore todos os seus tanques com IA que otimiza densidade, biomassa e crescimento automaticamente."
    },
    {
      icon: Droplets,
      title: "Qualidade da Água",
      description: "Sensores inteligentes monitoram pH, oxigênio e temperatura 24/7 com alertas em tempo real."
    },
    {
      icon: BarChart3,
      title: "Analytics Avançado",
      description: "Relatórios preditivos com machine learning para maximizar produtividade e lucro."
    },
    {
      icon: TrendingUp,
      title: "Crescimento Preditivo",
      description: "IA prevê curvas de crescimento e otimiza alimentação para máximo rendimento."
    },
    {
      icon: Users,
      title: "Automação Total",
      description: "Automatize biometrias, alimentação e manejos com precisão de laboratório."
    },
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "Dados protegidos com criptografia militar e backup distribuído na blockchain."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
      {/* Header */}
      <header className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg">
              <Fish className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              AquaHub
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6"
            >
              Começar Grátis
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-12 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-emerald-100 px-4 py-2 rounded-full mb-8 border border-blue-200/50">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Powered by AI & Blockchain</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              O futuro da
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 bg-clip-text text-transparent">
              aquicultura
            </span>
            <br />
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              é agora
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transforme sua fazenda aquícola com inteligência artificial. 
            Monitore, otimize e maximize seus resultados com a tecnologia mais avançada do mercado.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-full group"
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-medium rounded-full"
            >
              Ver Demo
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-700">Tanque A1</span>
                    </div>
                    <Fish className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Biomassa</span>
                      <span className="text-xs font-medium text-slate-800">2.4t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Crescimento</span>
                      <span className="text-xs font-medium text-green-600">+12%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-700">Qualidade H2O</span>
                    </div>
                    <Droplets className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">pH</span>
                      <span className="text-xs font-medium text-slate-800">7.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">O2</span>
                      <span className="text-xs font-medium text-green-600">Ideal</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-700">IA Insights</span>
                    </div>
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Eficiência</span>
                      <span className="text-xs font-medium text-slate-800">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">ROI</span>
                      <span className="text-xs font-medium text-green-600">+28%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-emerald-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Tecnologia que
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                transforma resultados
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Cada funcionalidade foi pensada para maximizar sua produtividade e tornar a gestão aquícola mais inteligente e eficiente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 hover:scale-105">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 py-24">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para liderar a
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> revolução aquícola</span>?
            </h3>
            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto">
              Junte-se a mais de 1.000 aquicultores que já transformaram seus negócios com tecnologia de ponta.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-full group"
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-slate-400 text-slate-300 hover:bg-white/10 px-8 py-4 text-lg font-medium rounded-full"
              >
                Agendar Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg">
                <Fish className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                AquaHub
              </span>
            </div>
            <p className="text-slate-600">
              © 2024 AquaHub. O futuro da aquicultura é agora.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;