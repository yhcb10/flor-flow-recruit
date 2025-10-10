import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUNCTION_VERSION = 'v2-2025-10-10-1807';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, candidateName, candidatePhone, positionId } = await req.json();

    console.log('🚀 Function version:', FUNCTION_VERSION);
    console.log('📱 Enviando notificação WhatsApp:', { candidateId, candidateName, candidatePhone, positionId });

    // Validar dados recebidos
    if (!candidateId || !candidateName || !candidatePhone || !positionId) {
      throw new Error('Dados incompletos: candidateId, candidateName, candidatePhone e positionId são obrigatórios');
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar informações da vaga
    const { data: position, error: positionError } = await supabaseClient
      .from('job_positions')
      .select('title, endpoint_id')
      .eq('id', positionId)
      .single();

    if (positionError) {
      console.error('Erro ao buscar vaga:', positionError);
      throw new Error('Não foi possível buscar informações da vaga');
    }

    console.log('📋 Vaga encontrada:', position);

    // Construir payload para N8N
    const digits = String(candidatePhone || '').replace(/\D/g, '');
    const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const n8nPayload = {
      titulo_vaga: position.title,
      numero_candidato: normalizedPhone,
      nome_candidato: candidateName,
      candidate_id: candidateId,
      position_id: positionId,
      timestamp: new Date().toISOString()
    };

    // URL do webhook de produção do N8N
    const n8nWebhookUrl = 'https://n8nwebhook.agentenobre.store/webhook/disparo';

    console.log('🔗 Enviando para N8N:', n8nWebhookUrl);
    console.log('📦 Payload:', n8nPayload);

    // Enviar para N8N (GET com query params para webhook de teste)
    const url = new URL(n8nWebhookUrl);
    Object.entries(n8nPayload).forEach(([k, v]) => {
      url.searchParams.set(k, String(v ?? ''));
    });

    const n8nResponse = await fetch(url.toString(), { method: 'GET' });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('Erro na resposta do N8N:', errorText);
      throw new Error(`Falha ao enviar para N8N: ${n8nResponse.status} - ${errorText}`);
    }

    let n8nResult: any;
    const contentType = n8nResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      n8nResult = await n8nResponse.json();
    } else {
      n8nResult = await n8nResponse.text();
    }
    console.log('✅ Resposta do N8N:', n8nResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensagem WhatsApp disparada com sucesso',
        n8nResponse: n8nResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
