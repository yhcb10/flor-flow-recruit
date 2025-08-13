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
  download_url?: string; // URL para download do PDF
  curriculo_pdf?: string; // PDF em base64 (compatibilidade)
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
    
    console.log('=== RECEIVED N8N DATA ===');
    console.log('Full payload:', JSON.stringify(candidateData, null, 2));
    console.log('download_url:', candidateData.download_url);
    console.log('curriculo_pdf:', candidateData.curriculo_pdf);
    console.log('nome_arquivo:', candidateData.nome_arquivo);
    console.log('========================');

    // Map position IDs
    const positionMapping: { [key: string]: string } = {
      'vendedor_001': '4b941ff1-0efc-4c43-a654-f37ed43286d3', // UUID da vaga de Vendedor
      'vendedor_interno_849750': '8f120339-2b13-425d-a504-8157dd77f411', // UUID da vaga de Vendedor Interno (Farmer)
      'gestor_ads_001': '5c852ff2-1fdc-4d54-b765-948fe54397e4', // UUID da vaga de Gestor de Ads
      'analista_de_inteligencia_artificial_e_automacoes_390000': '72a59b27-5286-4591-b841-af1c5dfcc87d' // UUID da vaga de Analista de IA
    };

    const mappedPositionId = candidateData.id ? positionMapping[candidateData.id] || candidateData.id : null;
    
    console.log('ID recebido do N8N:', candidateData.id);
    console.log('Position ID mapeado:', mappedPositionId);
    console.log('Mapeamento disponível:', positionMapping);

    // Verificar se já existe candidato com mesmo email para a mesma vaga
    if (candidateData.email && mappedPositionId) {
      const { data: existingCandidate, error: checkError } = await supabase
        .from('candidates')
        .select('id, name, email, position_id')
        .eq('email', candidateData.email.trim().toLowerCase())
        .eq('position_id', mappedPositionId)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar candidato existente:', checkError);
      } else if (existingCandidate) {
        console.log(`Candidato duplicado detectado: ${candidateData.nome_completo} (${candidateData.email}) já existe para a vaga ${mappedPositionId}`);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `Candidato ${candidateData.nome_completo} já existe para esta vaga`,
            duplicate: true,
            existing_candidate: existingCandidate
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict
          }
        );
      }
    }

  // Handle PDF download if provided - try multiple field variations
  let resumeUrl = null;
  let resumeFileName = null;
  
  // Try multiple possible field names for the PDF URL
  const pdfUrl = candidateData.download_url || 
                 candidateData.curriculo_pdf || 
                 (candidateData as any).pdf_url ||
                 (candidateData as any).resume_url ||
                 (candidateData as any).url_download;
                 
  const fileName = candidateData.nome_arquivo || 
                   (candidateData as any).filename ||
                   (candidateData as any).file_name ||
                   'curriculum.pdf';
  
  if (pdfUrl && fileName) {
    try {
      // Check if it's a URL (starts with http) or base64 data
      if (pdfUrl.startsWith('http')) {
        // If it's already a Supabase Storage URL, use it directly
        if (pdfUrl.includes('supabase.co/storage')) {
          resumeUrl = pdfUrl;
          resumeFileName = fileName;
        } else {
          // Download and re-upload to our storage
          const downloadResponse = await fetch(pdfUrl);
          
          if (!downloadResponse.ok) {
            throw new Error(`Failed to download PDF: ${downloadResponse.status}`);
          }
          
          const pdfBuffer = await downloadResponse.arrayBuffer();
          
          // Generate unique filename
          const timestamp = new Date().getTime();
          const sanitizedName = candidateData.nome_completo.replace(/[^a-zA-Z0-9]/g, '_');
          const storagePath = `curriculums/${sanitizedName}_${timestamp}_${fileName}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(storagePath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading PDF:', uploadError);
            // Fallback to original URL if upload fails
            resumeUrl = pdfUrl;
            resumeFileName = fileName;
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('resumes')
              .getPublicUrl(storagePath);
            
            resumeUrl = urlData.publicUrl;
            resumeFileName = fileName;
          }
        }
      } else {
        resumeUrl = pdfUrl;
        resumeFileName = fileName;
      }
    } catch (pdfError) {
      console.error('Error downloading/processing PDF:', pdfError);
      // Fallback: use original URL if processing fails
      resumeUrl = pdfUrl;
      resumeFileName = fileName;
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