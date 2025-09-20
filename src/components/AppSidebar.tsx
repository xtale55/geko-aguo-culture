import { useNavigate, useLocation } from 'react-router-dom';
import { Fish, SignOut, House, Waves, ForkKnife, Package, ChartBar, CurrencyDollar } from 'phosphor-react';
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
  { path: '/dashboard', icon: House, label: 'Dashboard' },
  { path: '/farm', icon: Waves, label: 'Fazenda' },
  { path: '/manejos', icon: Fish, label: 'Manejos' },
  { path: '/feeding', icon: ForkKnife, label: 'Ração' },
  { path: '/inventory', icon: Package, label: 'Estoque' },
  { path: '/reports', icon: ChartBar, label: 'Relatórios' },
  { path: '/financial', icon: CurrencyDollar, label: 'Financeiro' }
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
          <div className="w-6 h-6 rounded-full overflow-hidden">
            <img src="/logo.png" alt="AquaHub Logo" className="w-6 h-6 object-cover rounded-full" />
          </div>
          <div className="text-center">
            <h1 className="text-sm font-bold text-primary">
              AquaHub
            </h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
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
          <SignOut className="w-4 h-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}