import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  customWebhookUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Primeiro, vamos verificar se o request body está presente
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
    
    const { resumeUrl, fileName, positionId, positionTitle, source, customWebhookUrl }: RequestBody = requestBody;

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
      source,
      customWebhookUrl
    });

    // Determinar a URL do webhook baseada na posição
    let webhookUrl = customWebhookUrl;
    
    if (!webhookUrl) {
      // URLs específicas baseadas na posição
      if (positionTitle.toLowerCase().includes('analista') && positionTitle.toLowerCase().includes('inteligencia')) {
        webhookUrl = 'https://n8nwebhook.agentenobre.store/webhook/curriculo-upload-analista_de_inteligencia_artificial_e_automacoes_390000';
      } else if (positionTitle.toLowerCase().includes('assistente') && positionTitle.toLowerCase().includes('financeiro')) {
        // URL genérica para assistente financeiro
        webhookUrl = 'https://n8nwebhook.agentenobre.store/webhook/curriculo-upload-geral';
      } else {
        // URL padrão substituindo 'id' pelo positionId
        webhookUrl = `https://n8nwebhook.agentenobre.store/webhook/curriculo-upload-${positionId}`;
      }
    }
    
    console.log('URL do webhook determinada:', webhookUrl);

    // Preparar dados para enviar ao N8N
    const n8nPayload = {
      resumeUrl,
      fileName,
      positionId,
      positionTitle,
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