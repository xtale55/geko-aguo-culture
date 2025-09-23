import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Fish, SignOut, Gear, House, Waves, Scales, Skull, ForkKnife, Drop, Package, ChartBar, CurrencyDollar, DotsThree } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AppSidebar } from '@/components/AppSidebar';
interface LayoutProps {
  children: React.ReactNode;
}
export const Layout = memo(function Layout({
  children
}: LayoutProps) {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const isActive = (path: string) => location.pathname === path;
  if (isMobile) {
    return <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Fish className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">
                  AquaHub
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  ERP Aquicultura
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <SignOut className="w-4 h-4" />
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
            {/* Main navigation items */}
            {[{
            path: '/dashboard',
            icon: House,
            label: 'Dashboard'
          }, {
            path: '/manejos',
            icon: Fish,
            label: 'Manejos'
          }, {
            path: '/inventory',
            icon: Package,
            label: 'Estoque'
          }, {
            path: '/reports',
            icon: ChartBar,
            label: 'Relatórios'
          }].map(({
            path,
            icon: Icon,
            label
          }) => <Button key={path} variant={isActive(path) ? 'default' : 'ghost'} size="sm" onClick={() => navigate(path)} className={cn("flex-1 flex-col h-12 px-1 min-w-0 transition-all duration-200", isActive(path) ? "bg-primary text-primary-foreground shadow-md scale-105" : "hover:bg-muted/50")}>
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs leading-none truncate">{label}</span>
              </Button>)}
            
            {/* More button with Sheet */}
            <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 flex-col h-12 px-1 min-w-0 transition-all duration-200 hover:bg-muted/50">
                  <DotsThree className="w-4 h-4 mb-1" />
                  <span className="text-xs leading-none truncate">Mais</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-xl">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-center">Mais Opções</SheetTitle>
                </SheetHeader>
                
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {[{
                  path: '/farm',
                  icon: Waves,
                  label: 'Fazenda',
                  color: 'from-blue-500 to-cyan-500'
                }, {
                  path: '/despesca',
                  icon: Fish,
                  label: 'Despesca',
                  color: 'from-orange-500 to-orange-600'
                }, {
                  path: '/feeding',
                  icon: ForkKnife,
                  label: 'Ração',
                  color: 'from-orange-500 to-red-500'
                }, {
                  path: '/financial',
                  icon: CurrencyDollar,
                  label: 'Financeiro',
                  color: 'from-green-500 to-emerald-500'
                }].map(({
                  path,
                  icon: Icon,
                  label,
                  color
                }) => <Button key={path} variant="outline" size="lg" onClick={() => {
                  navigate(path);
                  setIsMoreMenuOpen(false);
                }} className={cn("h-20 flex-col space-y-2 border-2 transition-all duration-200 hover:scale-105", isActive(path) ? "bg-primary text-primary-foreground border-primary shadow-lg" : "hover:bg-muted/50 hover:border-primary/20")}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br", color)}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Button>)}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>;
  }

  // Desktop layout with sidebar
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm h-16 flex items-center px-4 my-px">
            <SidebarTrigger className="mr-4" />
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

          {/* Desktop Content */}
          <main className="flex-1 container mx-auto px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
});