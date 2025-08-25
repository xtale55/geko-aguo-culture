import { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Fish, LogOut, Settings, Home, Waves, Scale, Skull, Utensils, Droplets, Package, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Fish className="w-6 h-6 text-white" />
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

          <nav className="hidden lg:flex items-center space-x-2">
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
              <Fish className="w-4 h-4 mr-2" />
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

      {/* Main Content - Mobile optimized padding */}
      <main className={cn(
        "container mx-auto px-3 md:px-6 py-4 md:py-6",
        isMobile && "pb-20" // Extra padding for mobile bottom nav
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation - Enhanced */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-md border-t border-border z-50 shadow-xl">
          <div className="flex items-center justify-around py-1 px-2">
            {[
              { path: '/dashboard', icon: Home, label: 'Home' },
              { path: '/farm', icon: Waves, label: 'Fazenda' },
              { path: '/manejos', icon: Fish, label: 'Manejos' },
              { path: '/feeding', icon: Utensils, label: 'Ração' },
              { path: '/inventory', icon: Package, label: 'Estoque' },
              { path: '/reports', icon: BarChart3, label: 'Relatórios' }
            ].map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant={isActive(path) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(path)}
                className={cn(
                  "flex-1 flex-col h-12 px-1 min-w-0 transition-all duration-200",
                  isActive(path) 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs leading-none truncate">{label}</span>
              </Button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
});