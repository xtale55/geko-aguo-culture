import { Resend } from 'npm:resend@4.0.0';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, farmName, token, permissions } = await req.json();
    
    const acceptUrl = `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '')}/accept-invite/${token}`;
    
    const permissionsList = Object.entries(permissions)
      .filter(([_, value]) => value)
      .map(([key]) => {
        const labels: Record<string, string> = {
          manejos: 'Manejos',
          despesca: 'Despesca',
          estoque: 'Estoque'
        };
        return labels[key as string];
      })
      .join(', ');

    await resend.emails.send({
      from: 'AquaHub <onboarding@resend.dev>',
      to: [email],
      subject: `Convite para ser Operador - ${farmName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Você foi convidado para ser Operador!</h2>
          <p>A fazenda <strong>${farmName}</strong> convidou você para ser operador do sistema AquaHub.</p>
          <p><strong>Permissões concedidas:</strong> ${permissionsList}</p>
          <div style="margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Aceitar Convite
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            <em>⚠️ Importante: Ao aceitar este convite, você perderá acesso a qualquer fazenda anterior.</em>
          </p>
        </div>
      `
    });

    console.log('Convite enviado para:', email);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro ao enviar convite:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
