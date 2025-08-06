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
    // Expect a single candidate object from N8N
    const candidateData: N8NCandidateData = await req.json();
    
    console.log('Received N8N analysis data:', candidateData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map N8N data directly to our database structure
    const dbData = {
      nome_completo: candidateData.nome_completo,
      idade: candidateData.idade,
      telefone: candidateData.telefone,
      email: candidateData.email,
      cidade: candidateData.cidade,
      nota_final: candidateData.nota_final,
      justificativa: candidateData.justificativa,
      pontos_fortes: candidateData.pontos_fortes,
      pontos_fracos: candidateData.pontos_fracos,
      observacoes: candidateData.observacoes,
      recomendacao: candidateData.recomendacao,
      proximos_passos: candidateData.proximos_passos,
      data_processamento: candidateData.data_processamento,
      stage: 'analise_ia' // Set stage to AI analysis
    };

    // Insert new candidate
    const { data: newCandidate, error: insertError } = await supabase
      .from('candidates')
      .insert(dbData)
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting candidate ${candidateData.nome_completo}:`, insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
          candidate: candidateData.nome_completo
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully processed candidate: ${candidateData.nome_completo}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed candidate: ${candidateData.nome_completo}`,
        candidate: {
          id: newCandidate.id,
          name: candidateData.nome_completo
        }
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