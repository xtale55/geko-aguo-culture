import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<{
    email: string;
    farm_id: string;
    permissions: { manejos: boolean; despesca: boolean; estoque: boolean };
    farms: { name: string };
    expires_at: string;
  } | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      toast({ title: 'Erro', description: 'Token de convite inválido', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, farms(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        toast({ title: 'Erro', description: 'Convite inválido ou expirado', variant: 'destructive' });
        navigate('/auth');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        toast({ title: 'Erro', description: 'Convite expirado', variant: 'destructive' });
        navigate('/auth');
        return;
      }

      setInvitation(data as any);

      // Verificar se email já existe (simplificado)
      const testSignIn = await supabase.auth.signInWithPassword({
        email: data.email,
        password: 'test-invalid-password-12345'
      });
      
      // Se o erro não for de senha incorreta, significa que o usuário não existe
      const userExists = testSignIn.error?.message.includes('Invalid login credentials') === false;
      setEmailExists(userExists);

      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar convite:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      navigate('/auth');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      let userId: string;

      if (emailExists) {
        // Login com conta existente
        const { error: signInError } = await signIn(invitation.email, formData.password);
        if (signInError) {
          toast({ title: 'Erro', description: 'Senha incorreta', variant: 'destructive' });
          setProcessing(false);
          return;
        }
        
        // Pegar userId após login
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('Erro ao obter usuário');
        userId = currentUser.id;
      } else {
        // Criar nova conta
        if (formData.password !== formData.confirmPassword) {
          toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
          setProcessing(false);
          return;
        }

        const { error: signUpError } = await signUp(
          invitation.email,
          formData.password,
          formData.fullName
        );

        if (signUpError) {
          toast({ title: 'Erro', description: signUpError.message, variant: 'destructive' });
          setProcessing(false);
          return;
        }

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (!newUser) throw new Error('Erro ao criar usuário');
        userId = newUser.id;
      }

      // Remover registros antigos (outras fazendas)
      await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'operador');

      await supabase
        .from('operator_permissions')
        .delete()
        .eq('user_id', userId);

      // Criar novo registro na fazenda atual
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: userId,
          farm_id: invitation.farm_id,
          role: 'operador',
          status: 'active'
        });

      if (memberError) throw memberError;

      // Criar permissões
      const { error: permError } = await supabase
        .from('operator_permissions')
        .insert({
          user_id: userId,
          farm_id: invitation.farm_id,
          can_access_manejos: invitation.permissions?.manejos || false,
          can_access_despesca: invitation.permissions?.despesca || false,
          can_access_estoque: invitation.permissions?.estoque || false
        });

      if (permError) throw permError;

      // Marcar convite como aceito
      await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('token', token);

      toast({ title: 'Sucesso!', description: 'Convite aceito com sucesso!' });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao processar convite:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Convite para Operador</CardTitle>
          <CardDescription>
            Você foi convidado para ser operador da fazenda <strong>{invitation?.farms?.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={invitation?.email} disabled />
            </div>

            {!emailExists && (
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <Label>{emailExists ? 'Senha da sua conta' : 'Criar senha'}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {!emailExists && (
              <div>
                <Label>Confirmar senha</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
              ⚠️ Ao aceitar este convite, você perderá acesso a qualquer fazenda anterior.
            </div>

            <Button type="submit" className="w-full" disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {emailExists ? 'Confirmar e Aceitar' : 'Criar Conta e Aceitar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
