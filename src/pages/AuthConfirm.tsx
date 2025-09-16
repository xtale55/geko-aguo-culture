import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (!token_hash || !type) {
          setStatus('error');
          setMessage('Link de confirmação inválido ou expirado.');
          return;
        }

        // Para recovery tokens, apenas redirecionar sem verificar (evita login automático)
        if (type === 'recovery') {
          setStatus('success');
          setMessage('Redirecionando para redefinir senha...');
          
          toast({
            title: "Link válido!",
            description: "Redirecionando para redefinição de senha.",
          });

          // Redirecionar para reset de senha após 1 segundo
          setTimeout(() => {
            navigate(`/reset-password?token_hash=${token_hash}&type=${type}`);
          }, 1000);
          return;
        }

        // Para outros tipos (email confirmation), verificar normalmente
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          setStatus('success');
          setMessage('Conta confirmada com sucesso! Redirecionando...');
          
          toast({
            title: "Conta confirmada!",
            description: "Sua conta foi confirmada com sucesso. Bem-vindo ao AquaHub!",
          });

          // Redirecionar para o dashboard após 2 segundos
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Erro na confirmação:', error);
        setStatus('error');
        setMessage(error.message || 'Erro ao confirmar a conta. Tente novamente.');
        
        toast({
          variant: "destructive",
          title: "Erro na confirmação",
          description: error.message || 'Não foi possível confirmar sua conta.',
        });
      }
    };

    handleConfirmation();
  }, [searchParams, navigate, toast]);

  const handleRetryConfirmation = () => {
    navigate('/auth');
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Confirmando sua conta...'}
            {status === 'success' && 'Conta Confirmada!'}
            {status === 'error' && 'Erro na Confirmação'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        
        {status !== 'loading' && (
          <CardContent className="space-y-4">
            {status === 'success' && (
              <Button 
                onClick={handleGoToDashboard} 
                className="w-full"
              >
                Ir para o Dashboard
              </Button>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryConfirmation} 
                  className="w-full"
                >
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={handleGoToDashboard} 
                  variant="outline" 
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthConfirm;