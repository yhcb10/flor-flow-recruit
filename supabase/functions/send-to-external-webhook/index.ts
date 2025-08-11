import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  resumeUrl: string;
  fileName: string;
  positionId: string;
  positionTitle: string;
  webhookUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, fileName, positionId, positionTitle, webhookUrl }: WebhookPayload = await req.json();
    
    console.log('Sending to external webhook:', {
      resumeUrl,
      fileName,
      positionId,
      positionTitle,
      webhookUrl
    });

    // Preparar dados para envio ao webhook externo
    const webhookData = {
      resumeUrl,
      fileName,
      positionId,
      positionTitle,
      timestamp: new Date().toISOString(),
      source: 'flow-nobre-recruitment'
    };

    // Enviar para o webhook externo
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResult);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully sent resume to external webhook: ${positionTitle}`,
        data: {
          resumeUrl,
          fileName,
          positionId,
          positionTitle,
          webhookUrl,
          webhookResponse: webhookResult
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-to-external-webhook function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});