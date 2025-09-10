import { useNavigate, useLocation } from 'react-router-dom';
import { Fish, LogOut, Home, Waves, Utensils, Package, BarChart3, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/farm', icon: Waves, label: 'Fazenda' },
  { path: '/manejos', icon: Fish, label: 'Manejos' },
  { path: '/feeding', icon: Utensils, label: 'Ração' },
  { path: '/inventory', icon: Package, label: 'Estoque' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/financial', icon: DollarSign, label: 'Financeiro' }
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-card/30 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
            <Fish className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">
              AquaHub
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              ERP Aquicultura
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-6 px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.path)}
                    className="group"
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                          : "hover:bg-muted/50 hover:scale-[1.01] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive(item.path) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut} 
          className="w-full justify-start gap-3 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}