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
      // ✅ CORREÇÃO: Verificar loading states
      if (loading || profileLoading) {
        console.log('⏳ Aguardando carregamento completo...');
        return;
      }

      if (!user || !profile || profile.user_type !== 'operator') {
        console.log('❌ Não é operador ou ainda carregando');
        return;
      }

      console.log('🔍 Verificando vinculação do operador...');

      // Verificar AMBAS as tabelas
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: permissions } = await supabase
        .from('operator_permissions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (orgMember && permissions) {
        console.log('✅ Operador já configurado');
        return;
      }

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

      console.log('📧 Convite encontrado:', invitation.farm_id);

      // Criar vínculo com a fazenda (se não existir)
      if (!orgMember) {
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
        console.log('✅ Membro criado');
      }

      // Criar permissões (se não existir)
      if (!permissions) {
        const perms = invitation.permissions as any;
        const { error: permError } = await supabase
          .from('operator_permissions')
          .insert({
            user_id: user.id,
            farm_id: invitation.farm_id,
            can_access_manejos: perms?.manejos || false,
            can_access_despesca: perms?.despesca || false,
            can_access_estoque: perms?.estoque || false
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
        console.log('✅ Permissões criadas');
      }

      // Marcar convite como aceito (status correto)
      await supabase
        .from('invitations')
        .update({ status: 'accepted' as const })
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
  }, [user, profile, loading, profileLoading, toast]);

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
