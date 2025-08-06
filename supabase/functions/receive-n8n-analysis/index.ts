import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8NCandidateData {
  candidato: {
    nome_completo: string;
    idade: number;
    telefone: string;
    email: string;
    cidade: string;
  };
  vaga: {
    id: string;
    nome: string;
    empresa: string;
    local: string;
    salario_base: number;
    comissao_media: number;
  };
  avaliacao: {
    nota_final: number;
    justificativa: string;
    pontos_fortes: string[];
    pontos_fracos: string[];
    observacoes: string;
    recomendacao: string;
    proximos_passos: string;
  };
  pontuacao_detalhada: {
    experiencia_vendas: number;
    formacao: number;
    perfil_comportamental: number;
    conhecimentos_tecnicos: number;
    adequacao_geral: number;
  };
  status: {
    aprovado: boolean;
    fase_atual: string;
    metodo_extracao: string;
    data_processamento: string;
  };
  metadados: {
    curriculo_url: string;
    total_paginas: number;
    caracteres_extraidos: number;
    versao_fluxo: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Expect an array of candidates from N8N
    const candidates: N8NCandidateData[] = await req.json();
    
    console.log('Received N8N analysis data:', candidates);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    for (const candidateData of candidates) {
      try {
        // Map N8N data to our database structure
        const dbData = {
          nome_completo: candidateData.candidato.nome_completo,
          idade: candidateData.candidato.idade,
          telefone: candidateData.candidato.telefone,
          email: candidateData.candidato.email,
          cidade: candidateData.candidato.cidade,
          
          // Avaliação
          nota_final: candidateData.avaliacao.nota_final,
          justificativa: candidateData.avaliacao.justificativa,
          pontos_fortes: candidateData.avaliacao.pontos_fortes,
          pontos_fracos: candidateData.avaliacao.pontos_fracos,
          observacoes: candidateData.avaliacao.observacoes,
          recomendacao: candidateData.avaliacao.recomendacao,
          proximos_passos: candidateData.avaliacao.proximos_passos,
          
          // Pontuação detalhada (only the columns we kept)
          perfil_comportamental: candidateData.pontuacao_detalhada.perfil_comportamental,
          conhecimentos_tecnicos: candidateData.pontuacao_detalhada.conhecimentos_tecnicos,
          adequacao_geral: candidateData.pontuacao_detalhada.adequacao_geral,
          
          // Status
          aprovado: candidateData.status.aprovado,
          fase_atual: candidateData.status.fase_atual,
          metodo_extracao: candidateData.status.metodo_extracao,
          data_processamento: candidateData.status.data_processamento,
        };

        // Insert new candidate
        const { data: newCandidate, error: insertError } = await supabase
          .from('candidates')
          .insert(dbData)
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting candidate ${candidateData.candidato.nome_completo}:`, insertError);
          results.push({
            candidate: candidateData.candidato.nome_completo,
            success: false,
            error: insertError.message
          });
        } else {
          console.log(`Successfully processed candidate: ${candidateData.candidato.nome_completo}`);
          results.push({
            candidate: candidateData.candidato.nome_completo,
            success: true,
            id: newCandidate.id
          });
        }
      } catch (candidateError) {
        console.error(`Error processing candidate ${candidateData.candidato?.nome_completo || 'unknown'}:`, candidateError);
        results.push({
          candidate: candidateData.candidato?.nome_completo || 'unknown',
          success: false,
          error: candidateError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${candidates.length} candidates`,
        results: results
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