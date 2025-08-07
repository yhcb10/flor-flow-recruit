import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from }: SendEmailRequest = await req.json();

    console.log('Enviando email para:', to);

    const emailResponse = await resend.emails.send({
      from: from || 'Coroa de Flores Nobre <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

    console.log('Email enviado com sucesso:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json; charset=utf-8', 
          ...corsHeaders 
        },
      }
    );

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao enviar email' }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json; charset=utf-8', 
          ...corsHeaders 
        },
      }
    );
  }
});