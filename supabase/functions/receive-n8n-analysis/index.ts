import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8NCandidateData {
  nome_completo: string;
  idade?: number;
  telefone?: string;
  email?: string;
  cidade?: string;
  nota_final?: number;
  justificativa?: string;
  pontos_fortes?: string[];
  pontos_fracos?: string[];
  observacoes?: string;
  recomendacao?: string;
  proximos_passos?: string;
  data_processamento?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the received data
    const candidateData: N8NCandidateData = await req.json();
    
    console.log('Received N8N analysis data:', candidateData);

    // Transform N8N data to candidate format
    const candidate = {
      name: candidateData.nome_completo,
      email: candidateData.email || '',
      phone: candidateData.telefone || '',
      position_id: null,
      source: 'manual',
      stage: 'analise_ia',
      ai_analysis: {
        score: candidateData.nota_final || 0,
        reasoning: candidateData.justificativa || '',
        pontoFortes: candidateData.pontos_fortes || [],
        pontosAtencao: candidateData.pontos_fracos || [],
        recommendation: candidateData.recomendacao === 'APROVAR' ? 'advance' : 'review',
        recomendacaoFinal: candidateData.recomendacao === 'APROVAR' ? 'aprovado' : 'nao_recomendado',
        analyzedAt: new Date().toISOString(),
        observacoes: candidateData.observacoes || '',
        proximosPassos: candidateData.proximos_passos || ''
      }
    };

    // Insert candidate into database
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidate)
      .select()
      .single();

    if (error) {
      console.error('Error inserting candidate:', error);
      throw error;
    }

    console.log(`Successfully created candidate: ${candidateData.nome_completo}`, data);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created candidate: ${candidateData.nome_completo}`,
        data: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in receive-n8n-analysis function:', error);
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