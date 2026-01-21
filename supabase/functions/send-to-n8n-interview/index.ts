import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InterviewRequest {
  type: 'pre_interview' | 'in_person';
  candidate: {
    id: string;
    name: string;
    email: string;
    positionId?: string;
  };
  interview: {
    scheduledAt: string;
    duration: number;
    notes?: string;
    inviteeEmails: string[];
    location?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: InterviewRequest = await req.json();

    console.log('=== EDGE FUNCTION SEND-TO-N8N-INTERVIEW ===');
    console.log('Tipo de entrevista:', payload.type);
    console.log('Candidato:', payload.candidate);
    console.log('Entrevista:', payload.interview);

    // Obter URL do webhook do n8n
    const n8nWebhookUrl = Deno.env.get('N8N_INTERVIEW_WEBHOOK_URL');
    if (!n8nWebhookUrl) {
      throw new Error('N8N_INTERVIEW_WEBHOOK_URL não configurada');
    }

    // Buscar o nome da vaga no banco de dados
    let positionTitle = 'Não especificada';
    
    if (payload.candidate.positionId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: position, error: positionError } = await supabase
        .from('job_positions')
        .select('title')
        .eq('id', payload.candidate.positionId)
        .single();
      
      if (!positionError && position) {
        positionTitle = position.title;
        console.log('Vaga encontrada:', positionTitle);
      } else {
        console.log('Vaga não encontrada para ID:', payload.candidate.positionId);
      }
    }

    // Preparar payload para o n8n
    const n8nPayload = {
      type: payload.type,
      candidate: {
        id: payload.candidate.id,
        name: payload.candidate.name,
        email: payload.candidate.email.trim().toLowerCase(),
        positionId: payload.candidate.positionId,
        positionTitle: positionTitle,
      },
      interview: {
        scheduledAt: payload.interview.scheduledAt,
        duration: payload.interview.duration,
        notes: payload.interview.notes || '',
        inviteeEmails: payload.interview.inviteeEmails
          .filter((email: string) => email && email.trim())
          .map((email: string) => email.trim().toLowerCase()),
        location: payload.interview.location || null,
      },
      config: {
        companyEmail: 'coroadefloresnobre@gmail.com',
        timezone: 'America/Sao_Paulo',
      },
      timestamp: new Date().toISOString(),
    };

    console.log('Payload para n8n:', JSON.stringify(n8nPayload, null, 2));
    console.log('Enviando para webhook:', n8nWebhookUrl);

    // Enviar para o webhook do n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    console.log('Status da resposta n8n:', n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('Erro do n8n:', errorText);
      throw new Error(`Erro ao enviar para n8n: ${n8nResponse.status} - ${errorText}`);
    }

    // Tentar parsear a resposta do n8n
    let n8nData;
    try {
      n8nData = await n8nResponse.json();
      console.log('Resposta do n8n:', n8nData);
    } catch {
      // Se não for JSON, pode ser uma resposta simples de sucesso
      n8nData = { success: true };
      console.log('Resposta do n8n não é JSON, assumindo sucesso');
    }

    // Retornar resposta de sucesso com dados do n8n
    return new Response(
      JSON.stringify({
        success: true,
        eventId: n8nData.eventId || null,
        meetingUrl: n8nData.meetingUrl || null,
        message: 'Dados enviados para n8n com sucesso',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('=== ERRO NA EDGE FUNCTION ===');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
