import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Fish, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkTokens = async () => {
      console.log('ResetPassword: Starting token check');
      
      // Verificar se há tokens na URL
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      console.log('ResetPassword: Tokens found:', { tokenHash: !!tokenHash, type });
      
      if (!tokenHash || type !== 'recovery') {
        console.log('ResetPassword: Invalid tokens, redirecting to auth');
        toast({
          variant: "destructive",
          title: "Acesso inválido",
          description: "Esta página só pode ser acessada através do link de redefinição de senha."
        });
        navigate('/auth');
        return;
      }
      
      console.log('ResetPassword: Valid tokens found, verifying...');
      
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery'
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          console.log('ResetPassword: Token verified successfully, user authenticated');
          toast({
            title: "Token verificado",
            description: "Agora você pode definir sua nova senha.",
          });
        }
      } catch (error: any) {
        console.error('ResetPassword: Token verification error:', error);
        toast({
          variant: "destructive",
          title: "Token inválido",
          description: "Este link de redefinição expirou ou é inválido."
        });
        navigate('/auth');
      }
    };

    checkTokens();
  }, [searchParams, navigate, toast]);

  // Função para mapear erros específicos do Supabase para mensagens amigáveis
  const getErrorMessage = (error: any) => {
    console.log('ResetPassword: Error details:', { message: error.message, code: error.code, status: error.status });
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Mapear erros específicos para mensagens em português
    if (errorMessage.includes('same as the old password')) {
      return {
        title: "Senha já utilizada",
        description: "Você não pode usar a mesma senha anterior. Escolha uma senha diferente para sua segurança."
      };
    }
    
    if (errorMessage.includes('password is too weak') || errorMessage.includes('weak password')) {
      return {
        title: "Senha muito fraca",
        description: "Sua senha precisa ser mais forte. Use uma combinação de letras maiúsculas, minúsculas, números e símbolos."
      };
    }
    
    if (errorMessage.includes('password is too common') || errorMessage.includes('common password')) {
      return {
        title: "Senha muito comum",
        description: "Esta senha é muito comum e insegura. Escolha uma senha mais única e difícil de adivinhar."
      };
    }
    
    if (errorMessage.includes('password must be at least')) {
      return {
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres. Use uma senha mais longa para maior segurança."
      };
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return {
        title: "Muitas tentativas",
        description: "Você fez muitas tentativas recentemente. Aguarde alguns minutos antes de tentar novamente."
      };
    }
    
    if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
      return {
        title: "Sessão expirada",
        description: "Sua sessão de redefinição expirou. Solicite um novo link de redefinição de senha."
      };
    }
    
    // Mensagem padrão para outros erros
    return {
      title: "Erro ao redefinir senha",
      description: error.message || "Ocorreu um erro inesperado. Tente novamente ou solicite um novo link de redefinição."
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são idênticas."
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres para sua segurança."
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('ResetPassword: Attempting to update password');
      const { error } = await updatePassword(password);

      if (error) {
        console.log('ResetPassword: Password update failed:', error);
        const errorDetails = getErrorMessage(error);
        toast({
          variant: "destructive",
          title: errorDetails.title,
          description: errorDetails.description
        });
      } else {
        console.log('ResetPassword: Password updated successfully');
        setIsSuccess(true);
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi atualizada com sucesso."
        });
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (error: any) {
      console.error('ResetPassword: Unexpected error:', error);
      const errorDetails = getErrorMessage(error);
      toast({
        variant: "destructive",
        title: errorDetails.title,
        description: errorDetails.description
      });
    }

    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 shadow-[var(--shadow-ocean)]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Senha Redefinida!</h2>
                <p className="text-muted-foreground mt-2">
                  Sua senha foi atualizada com sucesso. Você será redirecionado automaticamente.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full bg-gradient-to-r from-primary to-primary-hover"
              >
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent/20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djEyaDEyVjM0SDM2em0wLTEyaDEyVjEwSDM2djEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 shadow-[var(--shadow-ocean)]">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center">
            <Fish className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Nova Senha
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Defina uma nova senha para sua conta
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary"
              disabled={isLoading || password !== confirmPassword || password.length < 6}
            >
              {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}