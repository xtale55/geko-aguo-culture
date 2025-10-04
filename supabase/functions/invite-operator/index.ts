import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, farmId, permissions } = await req.json();

    console.log('📧 Iniciando convite para:', email);

    // Criar cliente admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users?.find(u => u.email === email);

    if (existingUser) {
      console.error('❌ Email já cadastrado:', email);
      return new Response(
        JSON.stringify({ 
          error: 'Este email já está registrado no sistema. Se você excluiu este operador recentemente, aguarde alguns minutos e tente novamente.' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar nome da fazenda
    const { data: farmData } = await supabaseAdmin
      .from('farms')
      .select('name')
      .eq('id', farmId)
      .single();

    // Buscar usuário atual (quem está convidando)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser(token);
    
    if (!currentUser) {
      throw new Error('Usuário não encontrado');
    }

    // Enviar convite - Cria usuário e envia email automaticamente
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          user_type: 'operator',
          farm_id: farmId,
          farm_name: farmData?.name || 'Fazenda',
          permissions: permissions
        },
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
      }
    );

    if (inviteError) {
      console.error('❌ Erro ao enviar convite:', inviteError);
      throw inviteError;
    }

    console.log('✅ Convite enviado com sucesso para:', email);

    // Registrar convite na tabela para rastreamento interno
    const { error: dbError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: email,
        farm_id: farmId,
        role: 'operador',
        permissions: permissions,
        invited_by: currentUser.id,
        token: inviteData.user.id, // Usar user_id como referência
        status: 'pending'
      });

    if (dbError) {
      console.error('⚠️ Aviso: Erro ao registrar convite na tabela:', dbError);
      // Não falhar a operação por causa disso
    }

    // As permissões serão criadas automaticamente no primeiro login do operador

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Convite enviado para ${email}`,
        userId: inviteData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na função invite-operator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
