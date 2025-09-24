import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW Registered: ', swUrl);
      toast.success('AquaHub agora funciona offline!');
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh || offlineReady) {
      setShowPrompt(true);
    }
  }, [needRefresh, offlineReady]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">
                {needRefresh ? 'Atualização Disponível' : 'App Instalado'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs mb-3">
            {needRefresh 
              ? 'Uma nova versão está disponível. Recarregue para atualizar.'
              : 'AquaHub agora funciona offline! Acesse mesmo sem internet.'
            }
          </CardDescription>
          {needRefresh && (
            <Button 
              onClick={handleUpdate} 
              size="sm" 
              className="w-full"
            >
              Atualizar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}