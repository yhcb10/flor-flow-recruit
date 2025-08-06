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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, fileName, positionId, positionTitle }: RequestBody = await req.json();

    console.log('Enviando currículo para N8N:', {
      resumeUrl,
      fileName,
      positionId,
      positionTitle
    });

    // Obter webhook URL do N8N das variáveis de ambiente
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    console.log('N8N_WEBHOOK_URL configurado:', n8nWebhookUrl ? 'Sim' : 'Não');
    console.log('URL do webhook:', n8nWebhookUrl);
    
    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL não configurado nas variáveis de ambiente');
    }

    if (n8nWebhookUrl === 'teste') {
      throw new Error('N8N_WEBHOOK_URL ainda está configurado como "teste" - favor atualizar com a URL correta');
    }

    // Preparar dados para enviar ao N8N
    const n8nPayload = {
      tipo: 'novo_curriculo',
      dados: {
        arquivo_url: resumeUrl,
        nome_arquivo: fileName,
        vaga_id: positionId,
        vaga_titulo: positionTitle,
        data_envio: new Date().toISOString(),
        origem: 'sistema_recrutamento'
      }
    };

    // Enviar para o N8N
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      throw new Error(`Erro do N8N: ${n8nResponse.status} - ${n8nResponse.statusText}`);
    }

    const n8nResult = await n8nResponse.text();
    console.log('Resposta do N8N:', n8nResult);

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