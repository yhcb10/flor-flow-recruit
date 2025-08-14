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
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

    console.log('=== TESTE DE CREDENCIAIS ===');
    console.log('GOOGLE_CLIENT_ID presente:', !!googleClientId);
    console.log('GOOGLE_CLIENT_SECRET presente:', !!googleClientSecret);
    console.log('GOOGLE_REFRESH_TOKEN presente:', !!googleRefreshToken);
    
    if (googleClientId) {
      console.log('GOOGLE_CLIENT_ID início:', googleClientId.substring(0, 20));
    }
    if (googleRefreshToken) {
      console.log('GOOGLE_REFRESH_TOKEN início:', googleRefreshToken.substring(0, 20));
    }

    // Testar obtenção de access token se todas as credenciais estiverem presentes
    let accessTokenTest = null;
    if (googleClientId && googleClientSecret && googleRefreshToken) {
      try {
        console.log('Testando obtenção de access token...');
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: googleRefreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (response.ok) {
          const { access_token } = await response.json();
          accessTokenTest = !!access_token;
          console.log('Access token obtido com sucesso');
        } else {
          const errorText = await response.text();
          console.error('Erro ao obter access token:', errorText);
          accessTokenTest = false;
        }
      } catch (error) {
        console.error('Erro no teste de access token:', error);
        accessTokenTest = false;
      }
    }

    const response = {
      credentials: {
        clientIdPresent: !!googleClientId,
        clientSecretPresent: !!googleClientSecret,
        refreshTokenPresent: !!googleRefreshToken,
        clientIdStart: googleClientId ? googleClientId.substring(0, 20) : null,
        refreshTokenStart: googleRefreshToken ? googleRefreshToken.substring(0, 20) : null,
        accessTokenTest
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no teste:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});