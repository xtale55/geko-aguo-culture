import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shrimp, SignOut, ForkKnife, Scales, Drop, Skull, ClipboardText, DotsThree } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface TechnicianLayoutProps {
  children: React.ReactNode;
}

export const TechnicianLayout = memo(function TechnicianLayout({
  children
}: TechnicianLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  // Layout mobile para técnicos
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header para técnicos */}
        <header className="border-b border-border bg-gradient-to-r from-accent/20 to-secondary/20 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-full flex items-center justify-center">
                <Shrimp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-accent">
                  AquaHub
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  Painel Técnico
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <SignOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="container mx-auto px-3 py-4 pb-20">
          {children}
        </main>

        {/* Navegação inferior para técnicos */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-md border-t border-border z-50 shadow-xl">
          <div className="flex items-center justify-around py-1 px-2">
            {/* Itens principais para técnicos */}
            {[
              {
                path: '/tecnico',
                icon: ClipboardText,
                label: 'Tarefas'
              },
              {
                path: '/tecnico/alimentacao',
                icon: ForkKnife,
                label: 'Alimentação'
              },
              {
                path: '/tecnico/biometria',
                icon: Scales,
                label: 'Biometria'
              },
              {
                path: '/tecnico/agua',
                icon: Drop,
                label: 'Água'
              }
            ].map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant={isActive(path) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(path)}
                className={cn(
                  "flex-1 flex-col h-12 px-1 min-w-0 transition-all duration-200",
                  isActive(path) ? 
                    "bg-accent text-accent-foreground shadow-md scale-105" : 
                    "hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs leading-none truncate">{label}</span>
              </Button>
            ))}
            
            {/* Menu mais opções */}
            <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 flex-col h-12 px-1 min-w-0 transition-all duration-200 hover:bg-muted/50"
                >
                  <DotsThree className="w-4 h-4 mb-1" />
                  <span className="text-xs leading-none truncate">Mais</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-xl">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-center">Mais Opções</SheetTitle>
                </SheetHeader>
                
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {[
                    {
                      path: '/tecnico/mortalidade',
                      icon: Skull,
                      label: 'Mortalidade',
                      color: 'from-red-500 to-red-600'
                    },
                    {
                      path: '/tecnico/relatorios',
                      icon: ClipboardText,
                      label: 'Relatórios',
                      color: 'from-accent to-accent-hover'
                    }
                  ].map(({ path, icon: Icon, label, color }) => (
                    <Button
                      key={path}
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        navigate(path);
                        setIsMoreMenuOpen(false);
                      }}
                      className={cn(
                        "h-20 flex-col space-y-2 border-2 transition-all duration-200 hover:scale-105",
                        isActive(path) ? 
                          "bg-accent text-accent-foreground border-accent shadow-lg" : 
                          "hover:bg-muted/50 hover:border-accent/20"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br", color)}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    );
  }

  // Layout desktop para técnicos (simplificado)
  return (
    <div className="min-h-screen bg-background">
      {/* Header desktop */}
      <header className="border-b border-border bg-gradient-to-r from-accent/10 to-secondary/10 h-16 flex items-center px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-full flex items-center justify-center">
            <Shrimp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-accent">AquaHub</h1>
            <p className="text-sm text-muted-foreground -mt-1">Painel Técnico</p>
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <SignOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Navegação lateral simplificada */}
      <div className="flex">
        <aside className="w-64 border-r border-border bg-card/30 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {[
              { path: '/tecnico', icon: ClipboardText, label: 'Minhas Tarefas' },
              { path: '/tecnico/alimentacao', icon: ForkKnife, label: 'Alimentação' },
              { path: '/tecnico/biometria', icon: Scales, label: 'Biometria' },
              { path: '/tecnico/agua', icon: Drop, label: 'Qualidade da Água' },
              { path: '/tecnico/mortalidade', icon: Skull, label: 'Mortalidade' },
              { path: '/tecnico/relatorios', icon: ClipboardText, label: 'Relatórios' }
            ].map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant={isActive(path) ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start",
                  isActive(path) && "bg-accent text-accent-foreground"
                )}
                onClick={() => navigate(path)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 container mx-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
});