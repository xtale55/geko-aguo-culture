import { useNavigate, useLocation } from 'react-router-dom';
import { Shrimp, SignOut, House, Waves, ForkKnife, Barn, ChartBar, CurrencyDollar, Truck, Farm } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOperatorPermissions } from '@/hooks/useOperatorPermissions';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// Componente customizado para o ícone de povoamento
const DoubleShrimpIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    {/* Círculo de fundo */}
    <div className="absolute inset-0 rounded-full border border-current opacity-50" />
    {/* Camarão centralizado */}
    <div className="flex items-center justify-center scale-75">
      <Shrimp weight="fill" className="w-4 h-4" />
    </div>
  </div>
);

const dashboardItem = {
  path: '/dashboard',
  icon: House,
  label: 'Dashboard'
};

const operationsItems = [
  {
    path: '/manejos',
    icon: Shrimp,
    label: 'Manejos'
  },
  {
    path: '/despesca',
    icon: Truck,
    label: 'Despesca'
  },
  {
    path: '/inventory',
    icon: Barn,
    label: 'Estoque'
  }
];

const managementItems = [
  {
    path: '/reports',
    icon: ChartBar,
    label: 'Relatórios'
  },
  {
    path: '/feeding',
    icon: ForkKnife,
    label: 'Ração'
  },
  {
    path: '/stocking',
    icon: DoubleShrimpIcon,
    label: 'Povoamento'
  }
];

const administrativeItems = [
  {
    path: '/financial',
    icon: CurrencyDollar,
    label: 'Financeiro'
  },
  {
    path: '/farm',
    icon: Farm,
    label: 'Fazenda'
  }
];
export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: permissions } = useOperatorPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  // Filtrar itens baseado no tipo de usuário e permissões
  const visibleOperationsItems = useMemo(() => {
    if (profile?.user_type !== 'operator' || !permissions) {
      return operationsItems;
    }

    return operationsItems.filter(item => {
      if (item.label === 'Manejos') return permissions.can_access_manejos;
      if (item.label === 'Despesca') return permissions.can_access_despesca;
      if (item.label === 'Estoque') return permissions.can_access_estoque;
      return false;
    });
  }, [profile, permissions]);

  const showManagementSection = profile?.user_type !== 'operator';
  const showAdministrativeSection = profile?.user_type !== 'operator';

  return <Sidebar collapsible="none" className="w-auto min-w-44">
      <SidebarHeader className="border-b border-border p-2">
        <div className="flex items-center justify-center my-[10px]">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">
            AquaHub
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(dashboardItem.path)}>
                  <button onClick={() => navigate(dashboardItem.path)} className={cn("w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 rounded-md text-sm transition-colors", isActive(dashboardItem.path) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    <dashboardItem.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-left leading-tight">{dashboardItem.label}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-1" />

        {/* Operações Diárias */}
        {visibleOperationsItems.length > 0 && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-3">
                Operações
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleOperationsItems.map(item => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <button onClick={() => navigate(item.path)} className={cn("w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 rounded-md text-sm transition-colors", isActive(item.path) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 truncate text-left leading-tight">{item.label}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <Separator className="my-1.5 opacity-100" />
          </>
        )}

        {/* Gestão e Monitoramento */}
        {showManagementSection && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-3">
                Gestão
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementItems.map(item => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <button onClick={() => navigate(item.path)} className={cn("w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 rounded-md text-sm transition-colors", isActive(item.path) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 truncate text-left leading-tight">{item.label}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <Separator className="my-1" />
          </>
        )}

        {/* Administrativo */}
        {showAdministrativeSection && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-3">
              Administrativo
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {administrativeItems.map(item => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)}>
                      <button onClick={() => navigate(item.path)} className={cn("w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 rounded-md text-sm transition-colors", isActive(item.path) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <item.icon className={item.path === '/farm' ? "w-5 h-5 shrink-0" : "w-4 h-4 shrink-0"} />
                        <span className="flex-1 truncate text-left leading-tight">{item.label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      
    </Sidebar>;
}