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
import { 
  House, 
  Fish, 
  Flask, 
  Package, 
  ChartBar,
  SignOut,
  ArrowLeft 
} from '@phosphor-icons/react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const farmNavigationItems = [
  { title: 'Povoamento', url: '/stocking', icon: Fish },
  { title: 'Manejos', url: '/manejos', icon: Flask },
  { title: 'Ração', url: '/feeding', icon: Package },
  { title: 'Estoque', url: '/inventory', icon: Package },
  { title: 'Relatórios', url: '/reports', icon: ChartBar },
];

export function TechnicianSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { farmId } = useParams();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const isActive = (path: string) => {
    if (farmId) {
      return location.pathname === `/technician/farm/${farmId}${path}`;
    }
    return location.pathname === path;
  };

  const isFarmContext = !!farmId;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">AquaHub Técnico</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => isActive && !isFarmContext ? 'bg-accent' : ''}
                  >
                    <House className="mr-2 h-4 w-4" />
                    Dashboard
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isFarmContext && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>
                <div className="flex items-center justify-between w-full">
                  <span>Fazenda</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToDashboard}
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {farmNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={`/technician/farm/${farmId}${item.url}`}
                          className={isActive(item.url) ? 'bg-accent' : ''}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <SignOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}