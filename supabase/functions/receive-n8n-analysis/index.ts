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
  id?: string; // ID da vaga para vincular automaticamente (ex: "vendedor_001")
  curriculo_pdf?: string; // PDF em base64
  nome_arquivo?: string; // Nome do arquivo PDF
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

    // Map position IDs
    const positionMapping: { [key: string]: string } = {
      'vendedor_001': '4b941ff1-0efc-4c43-a654-f37ed43286d3', // UUID da vaga de Vendedor
      'gestor_ads_001': '5c852ff2-1fdc-4d54-b765-948fe54397e4' // UUID da vaga de Gestor de Ads
    };

    const mappedPositionId = candidateData.id ? positionMapping[candidateData.id] || null : null;

    // Handle PDF upload if provided
    let resumeUrl = null;
    let resumeFileName = null;
    
    if (candidateData.curriculo_pdf && candidateData.nome_arquivo) {
      try {
        // Decode base64 PDF
        const pdfBuffer = Uint8Array.from(atob(candidateData.curriculo_pdf), c => c.charCodeAt(0));
        
        // Generate unique filename
        const timestamp = new Date().getTime();
        const sanitizedName = candidateData.nome_completo.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedName}_${timestamp}_${candidateData.nome_arquivo}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading PDF:', uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('resumes')
            .getPublicUrl(fileName);
          
          resumeUrl = urlData.publicUrl;
          resumeFileName = candidateData.nome_arquivo;
          console.log('PDF uploaded successfully:', resumeUrl);
        }
      } catch (pdfError) {
        console.error('Error processing PDF:', pdfError);
      }
    }

    // Transform N8N data to candidate format
    const candidate = {
      name: candidateData.nome_completo,
      email: candidateData.email || '',
      phone: candidateData.telefone || '',
      position_id: mappedPositionId,
      source: 'manual',
      stage: 'analise_ia',
      resume_url: resumeUrl,
      resume_file_name: resumeFileName,
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