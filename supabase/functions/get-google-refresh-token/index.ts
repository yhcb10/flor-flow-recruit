import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== GET GOOGLE REFRESH TOKEN FUNCTION ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const step = url.searchParams.get('step') || '1';
    const error = url.searchParams.get('error');

    console.log('Step:', step);
    console.log('Code present:', !!code);
    console.log('Error from Google:', error);

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log('Client ID present:', !!googleClientId);
    console.log('Client Secret present:', !!googleClientSecret);

    if (!googleClientId || !googleClientSecret) {
      throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar configurados');
    }

    // Se houve erro do Google
    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Erro na Autorização</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Erro na Autorização Google</h2>
            <p style="color: red;">Erro: ${error}</p>
            <p>Descrição: ${url.searchParams.get('error_description') || 'Erro desconhecido'}</p>
            <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Tentar Novamente</a></p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
      });
    }

    if (step === '1') {
      // Passo 1: Gerar URL de autorização
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', 'https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=2');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('Authorization URL generated:', authUrl.toString());

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Configuração Google OAuth</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Configuração das Credenciais do Google</h2>
            <p>Para obter o refresh token válido, clique no botão abaixo e autorize o acesso:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${authUrl.toString()}" 
                 style="background: #4285f4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
                🔐 Autorizar Google Calendar e Gmail
              </a>
            </div>
            <p><strong>Importante:</strong> Após autorizar, você será redirecionado automaticamente e verá o refresh token.</p>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 30px;">
              <h3>Verificações:</h3>
              <ul>
                <li>✅ Client ID configurado: ${googleClientId.substring(0, 20)}...</li>
                <li>✅ Client Secret configurado: ${googleClientSecret ? 'Sim' : 'Não'}</li>
                <li>✅ Redirect URI: https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=2</li>
              </ul>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
      });
    }

    if (step === '2') {
      if (!code) {
        console.log('No authorization code received');
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Erro - Código não recebido</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2>Erro</h2>
              <p style="color: red;">Código de autorização não recebido do Google.</p>
              <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Tentar Novamente</a></p>
            </body>
          </html>
        `, {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
        });
      }

      console.log('Exchanging code for tokens...');
      
      // Passo 2: Trocar código por refresh token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=2',
        }),
      });

      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', errorText);
        
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Erro ao Obter Tokens</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2>Erro ao Obter Tokens</h2>
              <p style="color: red;">Erro: ${tokenResponse.status} - ${tokenResponse.statusText}</p>
              <p>Detalhes: ${errorText}</p>
              <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Tentar Novamente</a></p>
            </body>
          </html>
        `, {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
        });
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens received:', Object.keys(tokens));

      if (!tokens.refresh_token) {
        console.error('No refresh token in response');
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Erro - Refresh Token não recebido</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2>Erro</h2>
              <p style="color: red;">Refresh token não foi recebido. Isso pode acontecer se você já autorizou antes.</p>
              <p>Tente revogar o acesso em <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a> e tente novamente.</p>
              <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Tentar Novamente</a></p>
            </body>
          </html>
        `, {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
        });
      }

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Credenciais Google Obtidas</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>🎉 Credenciais Obtidas com Sucesso!</h2>
            <p>Copie estas credenciais e configure-as nos secrets do Supabase:</p>
            
            <h3>GOOGLE_CLIENT_ID:</h3>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; font-family: monospace;">
              ${googleClientId}
            </div>
            
            <h3>GOOGLE_CLIENT_SECRET:</h3>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; font-family: monospace;">
              ${googleClientSecret}
            </div>
            
            <h3>🔑 GOOGLE_REFRESH_TOKEN:</h3>
            <div style="background: #e8f5e8; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; font-family: monospace; border: 2px solid #4caf50;">
              ${tokens.refresh_token}
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p><strong>⚠️ Importante:</strong></p>
              <ol>
                <li>Copie o GOOGLE_REFRESH_TOKEN acima</li>
                <li>Acesse o <a href="https://supabase.com/dashboard/project/burxedzkpugyavsqkzaj/settings/functions" target="_blank">Supabase Secrets</a></li>
                <li>Atualize o secret GOOGLE_REFRESH_TOKEN com o novo valor</li>
                <li>Teste o agendamento novamente</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://supabase.com/dashboard/project/burxedzkpugyavsqkzaj/settings/functions" 
                 target="_blank"
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                🔧 Ir para Supabase Secrets
              </a>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
      });
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Parâmetros Inválidos</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2>Parâmetros Inválidos</h2>
          <p>Step: ${step}, Code: ${code ? 'presente' : 'ausente'}</p>
          <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Começar do Início</a></p>
        </body>
      </html>
    `, { 
      status: 400, 
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } 
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Erro no Sistema</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2>❌ Erro no Sistema</h2>
          <p style="color: red;">${error.message}</p>
          <p>Verifique se GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados corretamente nos secrets do Supabase.</p>
          <p><a href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token?step=1">Tentar Novamente</a></p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
    });
  }
});