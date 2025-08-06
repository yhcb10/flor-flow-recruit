import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8NAnalysisData {
  candidateId: string;
  candidateInfo: {
    name: string;
    email: string;
    phone: string;
    positionId: string;
    source?: 'indeed' | 'manual' | 'referral';
  };
  resumeData: {
    resumeText?: string;
    resumeUrl?: string;
    resumeFileName?: string;
  };
  aiAnalysis: {
    score: number; // 0-10
    experienciaProfissional: number; // 0-4
    habilidadesTecnicas: number; // 0-2
    competenciasComportamentais: number; // 0-1
    formacaoAcademica: number; // 0-1
    diferenciaisRelevantes: number; // 0-2
    pontoFortes: string[];
    pontosAtencao: string[];
    recommendation: 'advance' | 'reject' | 'review';
    reasoning: string;
    recomendacaoFinal: 'aprovado' | 'nao_recomendado';
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: N8NAnalysisData = await req.json();
    
    console.log('Received N8N analysis data:', data);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if candidate exists
    const { data: existingCandidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', data.candidateId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Error fetching candidate: ${fetchError.message}`);
    }

    const candidateData = {
      id: data.candidateId,
      name: data.candidateInfo.name,
      email: data.candidateInfo.email,
      phone: data.candidateInfo.phone,
      position_id: data.candidateInfo.positionId,
      source: data.candidateInfo.source || 'manual',
      stage: 'analise_ia', // Start at AI analysis stage
      resume_url: data.resumeData.resumeUrl,
      resume_text: data.resumeData.resumeText,
      resume_file_name: data.resumeData.resumeFileName,
      ai_analysis: {
        ...data.aiAnalysis,
        analyzedAt: new Date().toISOString()
      },
      created_at: existingCandidate?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingCandidate) {
      // Update existing candidate
      const { data: updatedCandidate, error: updateError } = await supabase
        .from('candidates')
        .update(candidateData)
        .eq('id', data.candidateId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Error updating candidate: ${updateError.message}`);
      }
      result = updatedCandidate;
    } else {
      // Create new candidate
      const { data: newCandidate, error: insertError } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error creating candidate: ${insertError.message}`);
      }
      result = newCandidate;
    }

    console.log('Successfully processed candidate:', result);

    return new Response(
      JSON.stringify({
        success: true,
        candidate: result,
        message: existingCandidate ? 'Candidate updated successfully' : 'Candidate created successfully'
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