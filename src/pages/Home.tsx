import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fish, BarChart3, Users, Shield, Droplets, TrendingUp } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Fish,
      title: "Gestão Completa de Tanques",
      description: "Monitore todos os seus tanques e lotes com controle detalhado de biomassa, densidade e crescimento."
    },
    {
      icon: Droplets,
      title: "Qualidade da Água",
      description: "Acompanhe parâmetros críticos como pH, oxigênio, temperatura e muito mais em tempo real."
    },
    {
      icon: BarChart3,
      title: "Relatórios Inteligentes",
      description: "Gere relatórios automáticos de performance, custos operacionais e análises de crescimento."
    },
    {
      icon: TrendingUp,
      title: "Análise de Crescimento",
      description: "Visualize curvas de crescimento, TCE e monitore o desenvolvimento dos seus lotes."
    },
    {
      icon: Users,
      title: "Controle de Manejos",
      description: "Registre biometrias, mortalidade, aplicação de insumos e todos os manejos do dia a dia."
    },
    {
      icon: Shield,
      title: "Dados Seguros",
      description: "Seus dados ficam protegidos na nuvem com backup automático e acesso controlado."
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/eec2c2fa-76d5-4815-91cb-62b4aebebb0e.png" 
              alt="AquaHub Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-2xl font-bold text-white">AquaHub</h1>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-2xl"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl"></div>
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              O Futuro da
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, hsl(175 70% 85%), hsl(150 80% 60%))' }}> Aquicultura</span>
              <br />
              Está Aqui
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Gerencie sua fazenda aquícola com tecnologia de ponta. Monitore tanques, 
              controle qualidade da água, acompanhe crescimento e maximize seus resultados.
            </p>
            <div className="flex justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-primary-foreground px-8 py-4 text-lg shadow-lg border-0 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, hsl(175 70% 85%), hsl(150 80% 60%))' }}
              >
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-white/95 backdrop-blur-sm rounded-2xl">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que Você Precisa em Um Lugar
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para gestão aquícola moderna, 
            com todas as ferramentas necessárias para otimizar sua produção.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/80 backdrop-blur-sm rounded-2xl">
              <CardContent className="p-8 text-center">
                <div 
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg, hsl(210 85% 25%), hsl(150 70% 30%))' }}
                >
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-4">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, hsl(210 85% 25%), hsl(150 70% 25%))' }}>
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para Revolucionar sua Aquicultura?
          </h3>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de aquicultores que já transformaram 
            sua gestão com o AquaHub.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold shadow-xl rounded-2xl"
          >
            Criar Conta Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/10 backdrop-blur-sm py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/lovable-uploads/eec2c2fa-76d5-4815-91cb-62b4aebebb0e.png" 
              alt="AquaHub Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-white">AquaHub</span>
          </div>
          <p className="text-white/80">
            © 2024 AquaHub. Transformando a aquicultura através da tecnologia.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;