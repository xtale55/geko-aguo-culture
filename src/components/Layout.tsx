import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bug, LogOut, Settings, Home, Waves, Scale, Skull, Utensils, Droplets, Package, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center p-1">
                <img 
                  src="/lovable-uploads/eec2c2fa-76d5-4815-91cb-62b4aebebb0e.png" 
                  alt="AquaHub Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  AquaHub
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  ERP Aquicultura
                </p>
              </div>
            </div>
          </div>

          <nav className="hidden xl:flex items-center space-x-2">
            <Button
              variant={isActive('/dashboard') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={isActive('/farm') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/farm')}
            >
              <Waves className="w-4 h-4 mr-2" />
              Fazenda
            </Button>
            <Button 
              variant={isActive('/manejos') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/manejos')}
            >
              <Bug className="w-4 h-4 mr-2" />
              Manejos
            </Button>
            <Button 
              variant={isActive('/feeding') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/feeding')}
            >
              <Utensils className="w-4 h-4 mr-2" />
              Ração
            </Button>
            <Button 
              variant={isActive('/inventory') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/inventory')}
            >
              <Package className="w-4 h-4 mr-2" />
              Estoque
            </Button>
            <Button 
              variant={isActive('/reports') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/reports')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border overflow-x-auto">
        <div className="flex min-w-max">
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <Home className="w-4 h-4" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant={isActive('/farm') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/farm')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <Waves className="w-4 h-4" />
            <span className="text-xs">Fazenda</span>
          </Button>
          <Button
            variant={isActive('/manejos') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/manejos')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <Bug className="w-4 h-4" />
            <span className="text-xs">Manejos</span>
          </Button>
          <Button
            variant={isActive('/feeding') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/feeding')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <Utensils className="w-4 h-4" />
            <span className="text-xs">Ração</span>
          </Button>
          <Button
            variant={isActive('/inventory') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/inventory')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <Package className="w-4 h-4" />
            <span className="text-xs">Estoque</span>
          </Button>
          <Button
            variant={isActive('/reports') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center space-y-1 h-16 min-w-16 px-3"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Relatórios</span>
          </Button>
        </div>
      </div>
    </div>
  );
}