import { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shrimp, SignOut } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TechnicianSidebar } from '@/components/TechnicianSidebar';

interface TechnicianLayoutProps {
  children: React.ReactNode;
}

export const TechnicianLayout = memo(function TechnicianLayout({
  children
}: TechnicianLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Shrimp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">
                  AquaHub Técnico
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  Gestão de Fazendas
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <SignOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="container mx-auto px-3 py-4">
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout with technician sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TechnicianSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm h-16 flex items-center px-4 my-px">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {user?.email} (Técnico)
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
    </SidebarProvider>
  );
});