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

    const response = {
      credentials: {
        clientIdPresent: !!googleClientId,
        clientSecretPresent: !!googleClientSecret,
        refreshTokenPresent: !!googleRefreshToken,
        clientIdStart: googleClientId ? googleClientId.substring(0, 20) : null
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