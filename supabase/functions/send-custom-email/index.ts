import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verificar se é uma chamada webhook do Supabase Auth
    const hookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      try {
        wh.verify(payload, headers);
      } catch (err) {
        console.error('Webhook verification failed:', err);
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const data = JSON.parse(payload);
    const { user, email_data } = data;

    if (!user?.email) {
      throw new Error('Email do usuário não encontrado');
    }

    let emailSubject = '';
    let emailHtml = '';

    // Templates em português baseados no tipo de email
    switch (email_data.email_action_type) {
      case 'signup':
        emailSubject = 'Confirme sua conta - AquaHub';
        emailHtml = getSignupEmailTemplate(user.email, email_data);
        break;
      case 'recovery':
        emailSubject = 'Redefinir senha - AquaHub';
        emailHtml = getRecoveryEmailTemplate(user.email, email_data);
        break;
      case 'magiclink':
        emailSubject = 'Link de acesso - AquaHub';
        emailHtml = getMagicLinkEmailTemplate(user.email, email_data);
        break;
      default:
        emailSubject = 'Notificação - AquaHub';
        emailHtml = getDefaultEmailTemplate(user.email, email_data);
    }

    const emailResponse = await resend.emails.send({
      from: "AquaHub <noreply@aquahub.com>",
      to: [user.email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function getSignupEmailTemplate(email: string, emailData: any): string {
  const confirmLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${emailData.token_hash}&type=${emailData.email_action_type}&redirect_to=${encodeURIComponent(emailData.redirect_to || `${Deno.env.get('SITE_URL')}/auth/confirm`)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirme sua conta</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo ao AquaHub!</h1>
        </div>
        <div class="content">
          <h2>Confirme sua conta</h2>
          <p>Olá!</p>
          <p>Obrigado por se cadastrar no AquaHub. Para concluir seu cadastro e acessar sua conta, clique no botão abaixo:</p>
          <p style="text-align: center;">
            <a href="${confirmLink}" class="button">Confirmar Conta</a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">${confirmLink}</p>
          <p><strong>Importante:</strong> Este link expira em 24 horas por motivos de segurança.</p>
        </div>
        <div class="footer">
          <p>Se você não criou uma conta no AquaHub, pode ignorar este email.</p>
          <p>© 2024 AquaHub - Sistema de Gestão Aquícola</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRecoveryEmailTemplate(email: string, emailData: any): string {
  const resetLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${emailData.token_hash}&type=${emailData.email_action_type}&redirect_to=${encodeURIComponent(emailData.redirect_to || `${Deno.env.get('SITE_URL')}/reset-password`)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Redefinir Senha</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Redefinir Senha</h1>
        </div>
        <div class="content">
          <h2>Solicitação de nova senha</h2>
          <p>Olá!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no AquaHub. Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir Senha</a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">${resetLink}</p>
          <p><strong>Importante:</strong> Este link expira em 1 hora por motivos de segurança.</p>
        </div>
        <div class="footer">
          <p>Se você não solicitou a redefinição de senha, pode ignorar este email com segurança.</p>
          <p>© 2024 AquaHub - Sistema de Gestão Aquícola</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getMagicLinkEmailTemplate(email: string, emailData: any): string {
  const magicLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${emailData.token_hash}&type=${emailData.email_action_type}&redirect_to=${encodeURIComponent(emailData.redirect_to || `${Deno.env.get('SITE_URL')}`)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Link de Acesso</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Acesso ao AquaHub</h1>
        </div>
        <div class="content">
          <h2>Seu link de acesso</h2>
          <p>Olá!</p>
          <p>Clique no botão abaixo para acessar sua conta no AquaHub:</p>
          <p style="text-align: center;">
            <a href="${magicLink}" class="button">Acessar AquaHub</a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">${magicLink}</p>
          <p><strong>Importante:</strong> Este link expira em 1 hora por motivos de segurança.</p>
        </div>
        <div class="footer">
          <p>Se você não solicitou este acesso, pode ignorar este email.</p>
          <p>© 2024 AquaHub - Sistema de Gestão Aquícola</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getDefaultEmailTemplate(email: string, emailData: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Notificação AquaHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AquaHub</h1>
        </div>
        <div class="content">
          <p>Você recebeu uma notificação do AquaHub.</p>
          <p>Para mais informações, acesse sua conta no sistema.</p>
        </div>
        <div class="footer">
          <p>© 2024 AquaHub - Sistema de Gestão Aquícola</p>
        </div>
      </div>
    </body>
    </html>
  `;
}