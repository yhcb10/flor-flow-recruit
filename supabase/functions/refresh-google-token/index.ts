import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('=== REFRESH GOOGLE TOKEN FUNCTION ===');
    
    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar o refresh token mais recente do banco (ou inicializar a partir das secrets)
    let tokenRow: any = null;
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.error('Erro ao buscar token do banco:', tokenError);
      // Tentar usar o refresh token das secrets como fallback
      const envRefresh = Deno.env.get('GOOGLE_REFRESH_TOKEN');
      if (!envRefresh) {
        throw new Error('Refresh token não encontrado no banco de dados e nenhuma secret GOOGLE_REFRESH_TOKEN está definida');
      }
      console.log('Nenhum token no banco. Usando GOOGLE_REFRESH_TOKEN das secrets para criar registro inicial...');
      // Criar registro inicial na tabela com o refresh token das secrets
      const nowInit = new Date();
      const { error: insertErr } = await supabase.from('google_tokens').insert({
        refresh_token: envRefresh,
        access_token: null,
        expires_at: null,
        created_at: nowInit.toISOString(),
        updated_at: nowInit.toISOString(),
      });
      if (insertErr) {
        console.error('Falha ao inserir refresh token inicial no banco:', insertErr);
        throw new Error('Não foi possível inicializar o refresh token no banco');
      }
      // Buscar novamente o registro recém-criado
      const { data: created, error: fetchErr } = await supabase
        .from('google_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (fetchErr || !created) {
        console.error('Falha ao confirmar token criado:', fetchErr);
        throw new Error('Não foi possível confirmar o token criado');
      }
      tokenRow = created;
    } else {
      tokenRow = tokenData;
    }

    console.log('Token encontrado no banco, ID:', tokenRow.id);

    // Verificar se já temos um access token válido
    const now = new Date();
    if (tokenRow.access_token && tokenRow.expires_at && new Date(tokenRow.expires_at) > now) {
      console.log('Access token ainda válido, retornando o existente');
      return new Response(
        JSON.stringify({ 
          success: true, 
          access_token: tokenRow.access_token,
          source: 'cached'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Access token expirado ou inexistente, fazendo refresh...');

    // Fazer refresh do access token
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Credenciais do Google não configuradas');
    }

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Erro no refresh do Google:', errorText);
      
      if (refreshResponse.status === 400 && errorText.includes('invalid_grant')) {
        console.error('Refresh token inválido - necessário nova autorização');
        // Tentar fallback usando a secret GOOGLE_REFRESH_TOKEN
        const envRefresh = Deno.env.get('GOOGLE_REFRESH_TOKEN');
        if (envRefresh && envRefresh !== tokenRow.refresh_token) {
          console.log('Tentando fallback com GOOGLE_REFRESH_TOKEN das secrets...');
          const fallbackResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: googleClientId!,
              client_secret: googleClientSecret!,
              refresh_token: envRefresh,
              grant_type: 'refresh_token',
            }),
          });

          if (fallbackResp.ok) {
            const { access_token: fbToken, expires_in: fbExpires } = await fallbackResp.json();
            const now2 = new Date();
            const expiresAt2 = new Date(now2.getTime() + (fbExpires - 60) * 1000);

            // Atualizar o registro atual com o novo refresh token e access token
            const { error: upErr } = await supabase
              .from('google_tokens')
              .update({
                refresh_token: envRefresh,
                access_token: fbToken,
                expires_at: expiresAt2.toISOString(),
                updated_at: now2.toISOString(),
              })
              .eq('id', tokenRow.id);
            if (upErr) {
              console.error('Falha ao atualizar token com fallback:', upErr);
            }

            console.log('Fallback com secret funcionou, retornando novo access token');
            return new Response(
              JSON.stringify({
                success: true,
                access_token: fbToken,
                expires_at: expiresAt2.toISOString(),
                source: 'fallback_secret',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          } else {
            const fbText = await fallbackResp.text();
            console.error('Fallback com secret falhou:', fbText);
          }
        }

        return new Response(
          JSON.stringify({ 
            error: 'refresh_token_invalid',
            message: 'O refresh token expirou. É necessário uma nova autorização.',
            requires_reauth: true
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
      
      throw new Error(`Erro ao fazer refresh do token: ${errorText}`);
    }

    const { access_token, expires_in } = await refreshResponse.json();
    
    // Calcular quando o token vai expirar (expires_in está em segundos)
    const expiresAt = new Date(now.getTime() + (expires_in - 60) * 1000); // -60s de margem

    // Atualizar o token no banco
    const { error: updateError } = await supabase
      .from('google_tokens')
      .update({
        access_token,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('Erro ao atualizar token no banco:', updateError);
      // Não falha aqui, pois o token ainda é válido
    }

    console.log('Access token renovado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        access_token,
        expires_at: expiresAt.toISOString(),
        source: 'refreshed'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('=== ERRO NA REFRESH FUNCTION ===');
    console.error('Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});