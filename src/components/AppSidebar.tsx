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
    <Sidebar collapsible="none" className="w-auto min-w-44">
      <SidebarHeader className="border-b border-border p-2">
        <div className="flex flex-col items-center space-y-1">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
            <Fish className="w-4 h-4 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AquaHub
            </h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.path)}
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate text-left leading-tight">{item.label}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full">
          <LogOut className="w-4 h-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}