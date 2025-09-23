import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Envelope, ArrowLeft } from '@phosphor-icons/react';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, resetLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email obrigatório",
        description: "Por favor, insira seu email."
      });
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: error.message
      });
    } else {
      setIsSubmitted(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha."
      });
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Envelope className="w-5 h-5 text-primary" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            {isSubmitted 
              ? "Enviamos um link para redefinir sua senha no email informado."
              : "Digite seu email para receber um link de redefinição de senha."
            }
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="text-center p-6 bg-success/10 rounded-lg border border-success/20">
              <Envelope className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-success font-medium">Email enviado com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifique sua caixa de entrada e spam. O link expira em 1 hora.
              </p>
            </div>
            <Button 
              onClick={handleClose} 
              className="w-full bg-gradient-to-r from-primary to-primary-hover"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={resetLoading}
                className="flex-1 bg-gradient-to-r from-primary to-primary-hover"
              >
                {resetLoading ? 'Enviando...' : 'Enviar Email'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}