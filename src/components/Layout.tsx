import { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Fish, LogOut, Settings, Home, Waves, Scale, Skull, Utensils, Droplets, Package, BarChart3, DollarSign } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="container mx-auto px-3 py-4 pb-20">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-md border-t border-border z-50 shadow-xl">
          <div className="flex items-center justify-around py-1 px-2">
            {[
              { path: '/dashboard', icon: Home, label: 'Home' },
              { path: '/farm', icon: Waves, label: 'Fazenda' },
              { path: '/manejos', icon: Fish, label: 'Manejos' },
              { path: '/feeding', icon: Utensils, label: 'Ração' },
              { path: '/inventory', icon: Package, label: 'Estoque' },
              { path: '/reports', icon: BarChart3, label: 'Relatórios' },
              { path: '/financial', icon: DollarSign, label: 'Financeiro' }
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
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm h-16 flex items-center px-4">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {user?.email}
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Desktop Content */}
          <main className="flex-1 container mx-auto px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
});