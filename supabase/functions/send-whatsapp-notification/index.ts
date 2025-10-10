import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { candidateId, candidateName, candidatePhone, positionId } = await req.json();

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
    const n8nPayload = {
      candidateId,
      candidateName,
      candidatePhone,
      positionId,
      positionTitle: position.title,
      endpointId: position.endpoint_id,
      timestamp: new Date().toISOString(),
      action: 'send_whatsapp_notification'
    };

    // Obter URL do N8N do endpoint da vaga
    // Formato: https://n8n.flownobre.com.br/webhook/<endpoint_id>
    const n8nWebhookUrl = position.endpoint_id 
      ? `https://n8n.flownobre.com.br/webhook/${position.endpoint_id}`
      : null;

    if (!n8nWebhookUrl) {
      throw new Error('Endpoint N8N não configurado para esta vaga');
    }

    console.log('🔗 Enviando para N8N:', n8nWebhookUrl);

    // Enviar para N8N
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('Erro na resposta do N8N:', errorText);
      throw new Error(`Falha ao enviar para N8N: ${n8nResponse.status} - ${errorText}`);
    }

    const n8nResult = await n8nResponse.json();
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
