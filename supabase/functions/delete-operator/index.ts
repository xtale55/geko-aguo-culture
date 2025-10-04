import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, farmId } = await req.json();
    
    console.log('🗑️ Iniciando exclusão completa do operador:', email);

    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Buscar user_id pelo email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar perfil:', profileError);
      throw new Error('Erro ao buscar perfil do usuário');
    }

    // Buscar user_id diretamente da tabela auth
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.log('⚠️ Usuário não encontrado no auth:', email);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('✅ User ID encontrado:', userId);

    // 2. Validar que o usuário pertence à fazenda
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!membership) {
      console.log('⚠️ Usuário não pertence à fazenda:', farmId);
      return new Response(
        JSON.stringify({ error: 'Usuário não pertence a esta fazenda' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Deletar organization_members
    console.log('🧹 Limpando organization_members...');
    const { error: orgError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('user_id', userId)
      .eq('farm_id', farmId);

    if (orgError) {
      console.error('❌ Erro ao deletar organization_members:', orgError);
      throw orgError;
    }

    // 4. Deletar operator_permissions
    console.log('🧹 Limpando operator_permissions...');
    const { error: permError } = await supabaseAdmin
      .from('operator_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('farm_id', farmId);

    if (permError) {
      console.error('❌ Erro ao deletar operator_permissions:', permError);
      throw permError;
    }

    // 5. Cancelar invitations
    console.log('🧹 Cancelando convites pendentes...');
    const { error: inviteError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('email', email)
      .eq('farm_id', farmId);

    if (inviteError) {
      console.error('❌ Erro ao cancelar convites:', inviteError);
      throw inviteError;
    }

    // 6. Deletar farm_employees
    console.log('🧹 Removendo de farm_employees...');
    const { error: employeeError } = await supabaseAdmin
      .from('farm_employees')
      .delete()
      .eq('email', email)
      .eq('farm_id', farmId);

    if (employeeError) {
      console.error('❌ Erro ao deletar farm_employees:', employeeError);
      throw employeeError;
    }

    // 7. Deletar usuário do auth (dispara cascade para profiles)
    console.log('🗑️ Deletando usuário do auth...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Erro ao deletar usuário:', deleteError);
      throw deleteError;
    }

    console.log('✅ Operador deletado completamente:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Operador deletado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função delete-operator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
