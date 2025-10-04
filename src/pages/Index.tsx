import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import TechnicianDashboard from './TechnicianDashboard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Configuração automática para operadores no primeiro login
  useEffect(() => {
    const setupOperatorFirstLogin = async () => {
      if (!user || !profile || profile.user_type !== 'operator') return;

      // Verificar se já tem organização vinculada
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Se já tem, não precisa fazer nada
      if (orgMember) return;

      console.log('🔧 Operador sem fazenda - configurando primeiro acesso...');

      // Buscar convite pendente pelo email
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteError || !invitation) {
        console.error('❌ Convite não encontrado:', inviteError);
        toast({
          title: 'Erro',
          description: 'Convite não encontrado. Entre em contato com o administrador.',
          variant: 'destructive'
        });
        return;
      }

      // Criar vínculo com a fazenda
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: user.id,
          farm_id: invitation.farm_id,
          role: 'operador',
          status: 'active',
          invited_by: invitation.invited_by
        });

      if (memberError) {
        console.error('❌ Erro ao criar membro:', memberError);
        toast({
          title: 'Erro',
          description: 'Erro ao vincular à fazenda.',
          variant: 'destructive'
        });
        return;
      }

      // Criar permissões
      const permissions = invitation.permissions as any;
      const { error: permError } = await supabase
        .from('operator_permissions')
        .insert({
          user_id: user.id,
          farm_id: invitation.farm_id,
          can_access_manejos: permissions?.manejos || false,
          can_access_despesca: permissions?.despesca || false,
          can_access_estoque: permissions?.estoque || false
        });

      if (permError) {
        console.error('❌ Erro ao criar permissões:', permError);
        toast({
          title: 'Erro',
          description: 'Erro ao configurar permissões.',
          variant: 'destructive'
        });
        return;
      }

      // Marcar convite como aceito
      await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('email', user.email)
        .eq('farm_id', invitation.farm_id);

      console.log('✅ Operador configurado com sucesso!');
      
      toast({
        title: 'Bem-vindo!',
        description: 'Sua conta foi configurada com sucesso.',
      });

      // Recarregar a página para atualizar o estado
      window.location.reload();
    };

    setupOperatorFirstLogin();
  }, [user, profile, toast]);

  if (loading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return null;
  }

  // Direcionar baseado no tipo de usuário
  if (profile.user_type === 'technician') {
    return <TechnicianDashboard />;
  }

  if (profile.user_type === 'operator') {
    const OperatorDashboard = require('./OperatorDashboard').default;
    return <OperatorDashboard />;
  }

  return <Dashboard />;
};

export default Index;
