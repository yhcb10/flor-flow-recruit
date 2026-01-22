import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  resumeUrl: string;
  fileName: string;
  positionId: string;
  positionTitle: string;
  source?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    if (!rawBody) {
      throw new Error('Corpo da requisição está vazio');
    }
    
    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error(`JSON inválido: ${parseError.message}`);
    }
    
    const { resumeUrl, fileName, positionId, positionTitle, source }: RequestBody = requestBody;

    // Validar campos obrigatórios
    if (!resumeUrl || !fileName || !positionId || !positionTitle) {
      console.error('Campos obrigatórios faltando:', { resumeUrl: !!resumeUrl, fileName: !!fileName, positionId: !!positionId, positionTitle: !!positionTitle });
      throw new Error('Campos obrigatórios faltando: resumeUrl, fileName, positionId, positionTitle');
    }

    console.log('Dados recebidos para envio ao N8N:', {
      resumeUrl,
      fileName,
      positionId,
      positionTitle,
      source
    });

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar a vaga no banco de dados para obter o n8n_webhook_path
    const { data: jobPosition, error: jobError } = await supabase
      .from('job_positions')
      .select('id, title, n8n_webhook_path, endpoint_id')
      .eq('id', positionId)
      .single();

    if (jobError) {
      console.error('Erro ao buscar vaga:', jobError);
      throw new Error(`Erro ao buscar vaga: ${jobError.message}`);
    }

    if (!jobPosition) {
      console.error('Vaga não encontrada:', positionId);
      throw new Error(`Vaga não encontrada com ID: ${positionId}`);
    }

    console.log('Vaga encontrada:', jobPosition);

    // Verificar se a vaga tem webhook path configurado
    if (!jobPosition.n8n_webhook_path) {
      console.error('Webhook path não configurado para a vaga:', jobPosition.title);
      throw new Error(`A vaga "${jobPosition.title}" não possui um webhook path configurado. Configure o campo "Path do Webhook N8N" nas configurações da vaga.`);
    }

    // Obter URL base do webhook do secret
    const baseUrl = Deno.env.get('N8N_WEBHOOK_BASE_URL');
    if (!baseUrl) {
      throw new Error('N8N_WEBHOOK_BASE_URL não está configurado nos secrets');
    }

    // Montar URL completa do webhook
    const webhookUrl = `${baseUrl}${jobPosition.n8n_webhook_path}`;
    console.log('URL do webhook montada:', webhookUrl);

    // Preparar dados para enviar ao N8N
    const n8nPayload = {
      resumeUrl,
      fileName,
      positionId: jobPosition.endpoint_id || positionId, // Enviar endpoint_id para mapeamento reverso
      positionTitle: jobPosition.title,
      source: source || 'manual'
    };

    // Enviar para o N8N
    console.log('Enviando payload para N8N:', JSON.stringify(n8nPayload, null, 2));
    
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    console.log('Status da resposta do N8N:', n8nResponse.status);
    console.log('Headers da resposta do N8N:', Object.fromEntries(n8nResponse.headers.entries()));

    // Capturar o corpo da resposta antes de verificar o status
    const n8nResult = await n8nResponse.text();
    console.log('Corpo da resposta do N8N:', n8nResult);

    if (!n8nResponse.ok) {
      throw new Error(`Erro do N8N: ${n8nResponse.status} - ${n8nResponse.statusText}. Corpo da resposta: ${n8nResult}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Currículo enviado para N8N com sucesso',
        webhookUrl: webhookUrl,
        n8nResponse: n8nResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao enviar para N8N:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})
