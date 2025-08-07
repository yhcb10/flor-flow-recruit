import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Criar evento no Google Calendar
    const googleCalendarResponse = await createGoogleCalendarEvent({
      candidate,
      interview,
    });

    // Enviar emails de confirmação
    await sendInterviewEmails({
      candidate,
      interview,
      meetingUrl: googleCalendarResponse.meetingUrl,
    });

    console.log('Entrevista agendada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        meetingUrl: googleCalendarResponse.meetingUrl,
        eventId: googleCalendarResponse.eventId 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Erro ao agendar entrevista:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

async function createGoogleCalendarEvent({ candidate, interview }: { 
  candidate: ScheduleInterviewRequest['candidate'], 
  interview: ScheduleInterviewRequest['interview'] 
}) {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!googleApiKey || !googleClientId || !googleClientSecret || !googleRefreshToken) {
    throw new Error('Google API credentials não configuradas');
  }

  // Obter access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Erro ao obter access token do Google');
  }

  const { access_token } = await tokenResponse.json();

  // Calcular horário de fim
  const startTime = new Date(interview.scheduledAt);
  const endTime = new Date(startTime.getTime() + interview.duration * 60000);

  // Criar evento no Google Calendar
  const calendarEvent = {
    summary: `Pré-entrevista - ${candidate.name}`,
    description: `Pré-entrevista com candidato ${candidate.name}\n\nEmail: ${candidate.email}\n\n${interview.notes || ''}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    attendees: [
      { email: candidate.email },
      ...interview.inviteeEmails.map(email => ({ email })),
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet-${candidate.id}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 dia antes
        { method: 'email', minutes: 60 }, // 1 hora antes
      ],
    },
  };

  const calendarResponse = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEvent),
    }
  );

  if (!calendarResponse.ok) {
    throw new Error('Erro ao criar evento no Google Calendar');
  }

  const eventData = await calendarResponse.json();
  const meetingUrl = eventData.conferenceData?.entryPoints?.[0]?.uri || '';

  return {
    eventId: eventData.id,
    meetingUrl,
  };
}

async function sendInterviewEmails({ candidate, interview, meetingUrl }: {
  candidate: ScheduleInterviewRequest['candidate'],
  interview: ScheduleInterviewRequest['interview'],
  meetingUrl: string
}) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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
  const candidateEmailBody = `
    <h2>Pré-entrevista Agendada - Coroa de Flores Nobre</h2>
    
    <p>Olá ${candidate.name},</p>
    
    <p>Sua pré-entrevista foi agendada com sucesso!</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Detalhes da Entrevista:</h3>
      <p><strong>Data:</strong> ${formattedDate}</p>
      <p><strong>Horário:</strong> ${formattedTime}</p>
      <p><strong>Duração:</strong> ${interview.duration} minutos</p>
      <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
    </div>
    
    <p>Por favor, conecte-se alguns minutos antes do horário agendado.</p>
    
    <p>Atenciosamente,<br>Equipe de Recrutamento<br>Coroa de Flores Nobre</p>
  `;

  // Email para os convidados
  const inviteeEmailBody = `
    <h2>Pré-entrevista Agendada - ${candidate.name}</h2>
    
    <p>Uma nova pré-entrevista foi agendada:</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Detalhes:</h3>
      <p><strong>Candidato:</strong> ${candidate.name} (${candidate.email})</p>
      <p><strong>Data:</strong> ${formattedDate}</p>
      <p><strong>Horário:</strong> ${formattedTime}</p>
      <p><strong>Duração:</strong> ${interview.duration} minutos</p>
      <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
      ${interview.notes ? `<p><strong>Observações:</strong> ${interview.notes}</p>` : ''}
    </div>
    
    <p>Sistema de Recrutamento - Coroa de Flores Nobre</p>
  `;

  // Enviar email para o candidato
  await supabase.functions.invoke('send-email', {
    body: {
      to: candidate.email,
      subject: 'Pré-entrevista Agendada - Coroa de Flores Nobre',
      html: candidateEmailBody,
    },
  });

  // Enviar emails para os convidados
  for (const email of interview.inviteeEmails) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: `Pré-entrevista Agendada - ${candidate.name}`,
        html: inviteeEmailBody,
      },
    });
  }
}