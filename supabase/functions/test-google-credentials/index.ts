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
    // Função para limpar variáveis de ambiente
    const cleanEnvVar = (varName: string) => {
      const value = Deno.env.get(varName);
      return value ? value.trim().replace(/\n+/g, '') : null;
    };

    // Tentar múltiplos nomes de env vars para compatibilidade e limpar valores
    const googleClientId = cleanEnvVar('GOOGLE_CLIENT_ID') || cleanEnvVar('GOOGLE_CLIENT_ID_SECRET');
    const googleClientSecret = cleanEnvVar('GOOGLE_CLIENT_SECRET') || cleanEnvVar('GOOGLE_CLIENT_SECRET_SECRET');  
    const googleRefreshToken = cleanEnvVar('GOOGLE_REFRESH_TOKEN') || cleanEnvVar('GOOGLE_REFRESH_TOKEN_SECRET');

    console.log('=== TESTE DE CREDENCIAIS ===');
    console.log('GOOGLE_CLIENT_ID presente:', !!googleClientId);
    console.log('GOOGLE_CLIENT_SECRET presente:', !!googleClientSecret);
    console.log('GOOGLE_REFRESH_TOKEN presente:', !!googleRefreshToken);
    
    // Debug: listar todas as env vars que começam com GOOGLE
    console.log('=== DEBUG ENV VARS ===');
    const envVars = Object.keys(Deno.env.toObject()).filter(key => key.includes('GOOGLE'));
    console.log('Env vars com GOOGLE:', envVars);
    
    if (googleClientId) {
      console.log('GOOGLE_CLIENT_ID início:', googleClientId.substring(0, 20));
    }
    if (googleRefreshToken) {
      console.log('GOOGLE_REFRESH_TOKEN início:', googleRefreshToken.substring(0, 20));
    }

    // Testar obtenção de access token se todas as credenciais estiverem presentes
    let accessTokenTest = null;
    let refreshTokenStatus = 'not_tested';
    let errorDetails = null;
    
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
          refreshTokenStatus = 'valid';
          console.log('Access token obtido com sucesso');
        } else {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          console.error('Erro ao obter access token:', errorText);
          
          accessTokenTest = false;
          errorDetails = errorData;
          
          // Verificar tipo específico de erro
          if (errorData.error === 'invalid_grant') {
            refreshTokenStatus = 'expired_or_invalid';
            console.error('REFRESH TOKEN INVÁLIDO OU EXPIRADO - precisa ser renovado');
          } else if (errorData.error === 'invalid_client') {
            refreshTokenStatus = 'invalid_credentials';
            console.error('CLIENT_ID ou CLIENT_SECRET inválidos');
          } else {
            refreshTokenStatus = 'unknown_error';
          }
        }
      } catch (error) {
        console.error('Erro no teste de access token:', error);
        accessTokenTest = false;
        refreshTokenStatus = 'network_error';
        errorDetails = { error: error.message };
      }
    }

    const response = {
      credentials: {
        clientIdPresent: !!googleClientId,
        clientSecretPresent: !!googleClientSecret,
        refreshTokenPresent: !!googleRefreshToken,
        clientIdStart: googleClientId ? googleClientId.substring(0, 20) : null,
        refreshTokenStart: googleRefreshToken ? googleRefreshToken.substring(0, 20) : null,
        accessTokenTest,
        refreshTokenStatus,
        errorDetails
      },
      diagnosis: {
        status: refreshTokenStatus,
        message: refreshTokenStatus === 'expired_or_invalid' 
          ? 'O refresh token expirou ou é inválido. Você precisa gerar um novo refresh token usando a função get-google-refresh-token.'
          : refreshTokenStatus === 'invalid_credentials'
          ? 'As credenciais CLIENT_ID ou CLIENT_SECRET estão incorretas. Verifique no Google Cloud Console.'
          : refreshTokenStatus === 'valid'
          ? 'Todas as credenciais estão funcionando corretamente!'
          : refreshTokenStatus === 'network_error'
          ? 'Erro de rede ao tentar conectar com o Google. Tente novamente.'
          : 'Status desconhecido ou credenciais faltando.'
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