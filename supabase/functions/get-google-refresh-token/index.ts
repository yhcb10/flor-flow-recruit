import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const step = url.searchParams.get('step') || '1';

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar configurados');
    }

    if (step === '1') {
      // Passo 1: Gerar URL de autorização
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', `${url.origin}${url.pathname}?step=2`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Configuração das Credenciais do Google</h2>
            <p>Para obter o refresh token válido, clique no link abaixo e autorize o acesso:</p>
            <p><a href="${authUrl.toString()}" target="_blank" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Autorizar Google Calendar e Gmail</a></p>
            <p>Após autorizar, você será redirecionado de volta e verá o refresh token.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    if (step === '2' && code) {
      // Passo 2: Trocar código por refresh token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${url.origin}${url.pathname}?step=2`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao obter tokens: ${errorText}`);
      }

      const tokens = await response.json();

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Credenciais Obtidas com Sucesso!</h2>
            <p>Copie estas credenciais e configure-as nos secrets do Supabase:</p>
            
            <h3>GOOGLE_CLIENT_ID:</h3>
            <code style="background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-radius: 4px;">${googleClientId}</code>
            
            <h3>GOOGLE_CLIENT_SECRET:</h3>
            <code style="background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-radius: 4px;">${googleClientSecret}</code>
            
            <h3>GOOGLE_REFRESH_TOKEN:</h3>
            <code style="background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-radius: 4px;">${tokens.refresh_token}</code>
            
            <p><strong>Importante:</strong> Configure essas 3 credenciais exatamente como mostrado acima nos secrets do Supabase.</p>
            
            <p><a href="https://supabase.com/dashboard/project/burxedzkpugyavsqkzaj/settings/functions" target="_blank">Ir para Supabase Secrets</a></p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    return new Response('Parâmetros inválidos', { 
      status: 400, 
      headers: { 'Content-Type': 'text/plain', ...corsHeaders } 
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(`
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2>Erro</h2>
          <p style="color: red;">${error.message}</p>
          <p>Verifique se GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados corretamente.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html', ...corsHeaders }
    });
  }
});