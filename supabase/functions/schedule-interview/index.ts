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
    position?: string;
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

    console.log('=== EDGE FUNCTION SCHEDULE-INTERVIEW ===');
    console.log('Dados recebidos:');
    console.log('- Candidato:', candidate);
    console.log('- Entrevista:', interview);
    console.log('- Data da entrevista:', interview.scheduledAt);

    console.log('Agendando entrevista para:', candidate.name);

    // Obter access token do Google
    const accessToken = await getGoogleAccessToken();

    // Criar evento no Google Calendar
    const calendarEvent = await createGoogleCalendarEvent({
      candidate,
      interview,
      accessToken,
    });

    // Enviar emails via Gmail
    await sendEmailsViaGmail({
      candidate,
      interview,
      meetingUrl: calendarEvent.meetingUrl,
      accessToken,
    });

    console.log('Entrevista agendada e emails enviados com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        meetingUrl: calendarEvent.meetingUrl,
        eventId: calendarEvent.eventId 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('=== ERRO NA EDGE FUNCTION ===');
    console.error('Erro completo:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('=====================================');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

async function getGoogleAccessToken() {
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  console.log('=== DEBUG GOOGLE CREDENTIALS ===');
  console.log('GOOGLE_CLIENT_ID presente:', !!googleClientId);
  console.log('GOOGLE_CLIENT_SECRET presente:', !!googleClientSecret);
  console.log('GOOGLE_REFRESH_TOKEN presente:', !!googleRefreshToken);
  console.log('GOOGLE_CLIENT_ID valor:', googleClientId ? `${googleClientId.substring(0, 10)}...` : 'undefined');

  if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
    console.error('Credenciais faltando:');
    console.error('- Client ID:', !!googleClientId);
    console.error('- Client Secret:', !!googleClientSecret);
    console.error('- Refresh Token:', !!googleRefreshToken);
    throw new Error('Credenciais do Google não configuradas');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro detalhado na resposta do Google OAuth:');
    console.error('Status:', response.status);
    console.error('Status Text:', response.statusText);
    console.error('Response Body:', errorText);
    throw new Error(`Erro ao obter access token do Google: ${response.status} - ${errorText}`);
  }

  const { access_token } = await response.json();
  return access_token;
}

async function createGoogleCalendarEvent({ candidate, interview, accessToken }: { 
  candidate: ScheduleInterviewRequest['candidate'], 
  interview: ScheduleInterviewRequest['interview'],
  accessToken: string
}) {
  const startTime = new Date(interview.scheduledAt);
  const endTime = new Date(startTime.getTime() + interview.duration * 60000);

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
      { email: candidate.email.trim().replace(/\s+/g, '').toLowerCase() },
      ...interview.inviteeEmails
        .filter(email => email && email.trim())
        .map(email => ({ email: email.trim().replace(/\s+/g, '').toLowerCase() })),
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet-${candidate.id}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEvent),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar evento no Google Calendar: ${errorText}`);
  }

  const eventData = await response.json();
  const meetingUrl = eventData.conferenceData?.entryPoints?.[0]?.uri || '';

  return {
    eventId: eventData.id,
    meetingUrl,
  };
}

async function sendEmailsViaGmail({ candidate, interview, meetingUrl, accessToken }: {
  candidate: ScheduleInterviewRequest['candidate'],
  interview: ScheduleInterviewRequest['interview'],
  meetingUrl: string,
  accessToken: string
}) {
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

  // Mapear positionId para nome da vaga
  const getPositionName = (positionId?: string) => {
    const positions: { [key: string]: string } = {
      '1': 'Vendedor',
      'gestor-ads': 'Gestor de Ads'
    };
    return positions[positionId || ''] || 'Não especificada';
  };

  const positionName = getPositionName(candidate.position);

  // Emails para enviar - sempre incluir empresa e convidados especificados
  const allEmails = [
    candidate.email.trim().replace(/\s+/g, '').toLowerCase(),
    'coroadefloresnobre@gmail.com',
    ...interview.inviteeEmails
      .filter(email => email && email.trim())
      .map(email => email.trim().replace(/\s+/g, '').toLowerCase())
  ];

  // Remover duplicatas
  const uniqueEmails = [...new Set(allEmails)];

  console.log('Enviando emails para:', uniqueEmails);

  // Enviar emails para todos os destinatários
  for (const email of uniqueEmails) {
    console.log(`Preparando email para: ${email}`);
    
    if (!email || email.trim() === '') {
      console.error('Email vazio encontrado, pulando...');
      continue;
    }

    let emailContent;
    
    if (email === candidate.email) {
      // Email personalizado para o candidato
      emailContent = createEmailMessage({
        to: email,
        from: 'coroadefloresnobre@gmail.com',
        subject: `Pré-entrevista agendada - ${candidate.name}`,
        html: `<h2>Sua pré-entrevista foi agendada!</h2>
<p>Olá ${candidate.name},</p>
<p>Sua pré-entrevista foi agendada para:</p>
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Detalhes da Entrevista:</h3>
  <p><strong>Vaga:</strong> ${positionName}</p>
  <p><strong>Data:</strong> ${formattedDate}</p>
  <p><strong>Horário:</strong> ${formattedTime}</p>
  <p><strong>Duração:</strong> ${interview.duration} minutos</p>
  <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}" target="_blank">Clique aqui para entrar no Google Meet</a></p>
  ${interview.notes ? `<p><strong>Observações:</strong> ${interview.notes}</p>` : ''}
</div>
<p>Por favor, conecte-se alguns minutos antes do horário agendado.</p>
<p>Atenciosamente,<br>Equipe de Recrutamento<br>Coroa de Flores Nobre</p>`
      });
    } else {
      // Email para RH e convidados
      emailContent = createEmailMessage({
        to: email,
        from: 'coroadefloresnobre@gmail.com',
        subject: `Pré-entrevista com ${candidate.name}`,
        html: `<h2>Pré-entrevista agendada</h2>
<p>Nova pré-entrevista foi agendada:</p>
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Detalhes:</h3>
  <p><strong>Candidato:</strong> ${candidate.name}</p>
  <p><strong>Email:</strong> ${candidate.email}</p>
  <p><strong>Vaga:</strong> ${positionName}</p>
  <p><strong>Data:</strong> ${formattedDate}</p>
  <p><strong>Horário:</strong> ${formattedTime}</p>
  <p><strong>Duração:</strong> ${interview.duration} minutos</p>
  <p><strong>Link da Reunião:</strong> <a href="${meetingUrl}" target="_blank">Clique aqui para entrar no Google Meet</a></p>
  ${interview.notes ? `<p><strong>Observações:</strong> ${interview.notes}</p>` : ''}
</div>
<p>Atenciosamente,<br>Sistema de Recrutamento<br>Coroa de Flores Nobre</p>`
      });
    }

    console.log(`Email content preparado para ${email}`);
    await sendGmailMessage(emailContent, accessToken);
    console.log(`Email enviado com sucesso para: ${email}`);
  }
}

function createEmailMessage({ to, from, subject, html }: {
  to: string,
  from: string,
  subject: string,
  html: string
}) {
  // Encode subject for UTF-8 support (RFC 2047)
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    html
  ].join('\n');
  
  return message;
}

async function sendGmailMessage(emailContent: string, accessToken: string) {
  console.log('Enviando email via Gmail API...');
  
  // Correção para UTF-8: usar TextEncoder para garantir encoding correto
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(emailContent);
  
  // Converter para base64 de forma segura para UTF-8
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  
  const encodedMessage = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao enviar email via Gmail:', errorText);
    throw new Error(`Erro ao enviar email via Gmail: ${errorText}`);
  }

  const result = await response.json();
  console.log('Email enviado com sucesso:', result.id);
  return result;
}