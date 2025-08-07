import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ScheduleInterviewRequest {
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  interview: {
    scheduledAt: string;
    duration: number;
    notes?: string;
    inviteeEmails: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidate, interview }: ScheduleInterviewRequest = await req.json();

    console.log('Agendando entrevista para:', candidate.name);

    // Criar link simples do Google Meet
    const meetingUrl = `https://meet.google.com/new`;

    // Preparar emails
    const scheduledDate = new Date(interview.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Email para o candidato
    const candidateEmailData = {
      to: candidate.email,
      subject: `Pré-entrevista agendada - ${candidate.name}`,
      html: `
        <h2>Sua pré-entrevista foi agendada!</h2>
        <p>Olá ${candidate.name},</p>
        <p>Sua pré-entrevista foi agendada para:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalhes da Entrevista:</h3>
          <p><strong>Data:</strong> ${formattedDate}</p>
          <p><strong>Horário:</strong> ${formattedTime}</p>
          <p><strong>Duração:</strong> ${interview.duration} minutos</p>
          <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}" target="_blank">Clique aqui para entrar no Google Meet</a></p>
          ${interview.notes ? `<p><strong>Observações:</strong> ${interview.notes}</p>` : ''}
        </div>
        <p>Por favor, conecte-se alguns minutos antes do horário agendado.</p>
        <p>Atenciosamente,<br>Equipe de Recrutamento</p>
      `
    };

    // Enviar email para o candidato
    const candidateEmailResponse = await supabase.functions.invoke('send-email', {
      body: candidateEmailData
    });

    if (candidateEmailResponse.error) {
      throw new Error(`Erro ao enviar email para candidato: ${candidateEmailResponse.error.message}`);
    }

    // Enviar emails para os convidados
    for (const email of interview.inviteeEmails) {
      if (email.trim()) {
        const inviteeEmailData = {
          to: email.trim(),
          subject: `Pré-entrevista com ${candidate.name}`,
          html: `
            <h2>Pré-entrevista agendada</h2>
            <p>Você foi convidado para participar da pré-entrevista com:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Detalhes:</h3>
              <p><strong>Candidato:</strong> ${candidate.name} (${candidate.email})</p>
              <p><strong>Data:</strong> ${formattedDate}</p>
              <p><strong>Horário:</strong> ${formattedTime}</p>
              <p><strong>Duração:</strong> ${interview.duration} minutos</p>
              <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}" target="_blank">Clique aqui para entrar no Google Meet</a></p>
              ${interview.notes ? `<p><strong>Observações:</strong> ${interview.notes}</p>` : ''}
            </div>
            <p>Atenciosamente,<br>Equipe de Recrutamento</p>
          `
        };

        await supabase.functions.invoke('send-email', {
          body: inviteeEmailData
        });
      }
    }

    console.log('Entrevista agendada e emails enviados com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        meetingUrl,
        message: 'Entrevista agendada e emails enviados com sucesso!' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Erro ao agendar entrevista:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao agendar entrevista' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});