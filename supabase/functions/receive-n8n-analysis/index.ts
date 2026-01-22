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
  source?: string; // Fonte do currículo (indeed, linkedin, manual) - DEPRECATED: use origem_candidato
  origem_candidato?: string; // Nova variável: origem real do candidato (ex: "Indeed", "LinkedIn", "Indicação", etc)
  candidate_id?: string; // Quando for reanálise, atualizar este candidato
  candidateId?: string; // Alias camelCase
}

serve(async (req) => {
  console.log(`=== RECEIVE N8N ANALYSIS FUNCTION CALLED ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return new Response(null, { headers: corsHeaders });
  }

  // Add health check endpoint
  if (req.method === 'GET') {
    console.log('Health check request received');
    return new Response(
      JSON.stringify({
        status: 'OK',
        function: 'receive-n8n-analysis',
        timestamp: new Date().toISOString(),
        message: 'Endpoint is working correctly'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
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
    console.log('origem_candidato:', candidateData.origem_candidato);
    console.log('source (deprecated):', candidateData.source);
    console.log('========================');

    // Reanálise: se vier candidate_id, atualiza o candidato existente
    const candidateIdFromPayload: string | null = (
      (candidateData as any).candidate_id ||
      (candidateData as any).candidateId ||
      (candidateData as any).candidato?.id ||
      null
    );

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let existingCandidateRow: any = null;
    if (candidateIdFromPayload) {
      if (!uuidRegex.test(candidateIdFromPayload)) {
        throw new Error(`candidate_id inválido (esperado UUID): ${candidateIdFromPayload}`);
      }

      const { data: existingCandidate, error: existingCandidateError } = await supabase
        .from('candidates')
        .select('id, position_id')
        .eq('id', candidateIdFromPayload)
        .maybeSingle();

      if (existingCandidateError) {
        console.error('❌ ERRO ao buscar candidato para reanálise:', existingCandidateError);
        throw new Error(`Erro ao buscar candidato para reanálise: ${existingCandidateError.message}`);
      }
      if (!existingCandidate) {
        throw new Error(`Candidato para reanálise não encontrado: ${candidateIdFromPayload}`);
      }

      existingCandidateRow = existingCandidate;
      console.log('🔁 Reanálise detectada. candidate_id:', candidateIdFromPayload);
    }

    // Resolver position_id de forma dinâmica e robusta (aceita UUID, endpoint_id e estruturas aninhadas)
    // Suporta: { id }, { position_id }, { vaga: { id } }, { vaga_id }, { job_id }
    const rawPositionIdentifier: string | null = (
      (candidateData as any).position_id ||
      candidateData.id ||
      (candidateData as any).vaga?.id ||
      (candidateData as any).vaga_id ||
      (candidateData as any).job_id ||
      null
    );

    console.log('Identificador de vaga recebido:', rawPositionIdentifier);

    if (!rawPositionIdentifier && !existingCandidateRow?.position_id) {
      console.error('❌ ERRO CRÍTICO: position_id/endpoint_id não fornecido no payload do N8N');
      throw new Error('position_id é obrigatório. Envie o UUID da vaga ou o endpoint_id configurado na vaga.');
    }

    let mappedPositionId: string | null = null;
    let jobPosition: { id: string; title: string } | null = null;

    // Se for reanálise e não veio vaga, reaproveitar a vaga já cadastrada no candidato
    if (!rawPositionIdentifier && existingCandidateRow?.position_id) {
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, title')
        .eq('id', existingCandidateRow.position_id)
        .maybeSingle();
      if (error) {
        console.error('❌ ERRO ao validar vaga do candidato existente:', error);
        throw new Error(`Erro ao validar vaga do candidato: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Vaga do candidato (${existingCandidateRow.position_id}) não existe.`);
      }
      mappedPositionId = (data as any).id;
      jobPosition = data as any;
    } else if (rawPositionIdentifier && uuidRegex.test(rawPositionIdentifier)) {
      // Já é um UUID: validar existência
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, title')
        .eq('id', rawPositionIdentifier)
        .maybeSingle();
      if (error) {
        console.error('❌ ERRO ao validar vaga por UUID:', error);
        throw new Error(`Erro ao validar vaga: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Vaga com ID "${rawPositionIdentifier}" não existe.`);
      }
      mappedPositionId = data.id;
      jobPosition = data as any;
    } else {
      // Não é UUID: tratar como endpoint_id dinâmico
      const endpointId = rawPositionIdentifier!.toString().trim();
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, title, endpoint_id')
        .eq('endpoint_id', endpointId)
        .maybeSingle();
      if (error) {
        console.error('❌ ERRO ao buscar vaga por endpoint_id:', error);
        throw new Error(`Erro ao validar vaga (endpoint_id): ${error.message}`);
      }
      if (!data) {
        throw new Error(`Vaga com endpoint_id "${endpointId}" não encontrada. Configure o endpoint_id da vaga e reenvie.`);
      }
      mappedPositionId = (data as any).id;
      jobPosition = { id: (data as any).id, title: (data as any).title };
    }

    console.log('✅ Vaga validada:', jobPosition?.title, mappedPositionId);

    // Verificar se já existe candidato com mesmo email para a mesma vaga
    // IMPORTANTE: Só verifica duplicados se o email for válido e não for "não informado"
    let existingCandidateId = null;
    const normalizedEmail = candidateData.email?.trim().toLowerCase();
    
    // Lista de emails inválidos (variações de "não informado")
    const invalidEmails = ['não informado', 'nao informado', 'n/a', 'na', 'not provided', ''];
    const isValidEmail = normalizedEmail && 
                        !invalidEmails.includes(normalizedEmail) &&
                        normalizedEmail.includes('@');
    
    // MUDANÇA: Desabilitar verificação de duplicados temporariamente para permitir reenvios
    // Se necessário reativar no futuro, descomentar o bloco abaixo
    /*
    if (isValidEmail && mappedPositionId) {
      const { data: existingCandidate, error: checkError } = await supabase
        .from('candidates')
        .select('id, name, email, position_id, stage')
        .eq('email', normalizedEmail)
        .eq('position_id', mappedPositionId)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar candidato existente:', checkError);
      } else if (existingCandidate) {
        console.log(`✅ Candidato duplicado encontrado: ${candidateData.nome_completo} (${normalizedEmail})`);
        console.log(`📝 Candidato existente está no stage: ${existingCandidate.stage}`);
        console.log(`🔄 Atualizando dados do candidato ao invés de criar novo`);
        existingCandidateId = existingCandidate.id;
      }
    } else if (!isValidEmail) {
      console.log(`⚠️ Email inválido ou não informado - criando novo candidato sem verificar duplicatas`);
    }
    */
    
    console.log(`➕ Sempre criando novo candidato (verificação de duplicados desabilitada)`);
    existingCandidateId = null;

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

    // VALIDAÇÃO FINAL: Garantir que todos os campos obrigatórios estão presentes
    if (!candidateData.nome_completo || candidateData.nome_completo.trim() === '') {
      throw new Error('nome_completo é obrigatório');
    }

    // Determinar a origem do candidato (priorizar origem_candidato, depois source, depois manual)
    const candidateSource = candidateData.origem_candidato?.trim() || candidateData.source?.trim() || 'manual';
    console.log('📍 Origem do candidato:', candidateSource);

    // Normalizar dados recebidos (suporta estruturas aninhadas do N8N)
    const nomeCompleto = (candidateData.nome_completo ?? (candidateData as any).candidato?.nome_completo ?? '').toString().trim();
    const emailNorm = ((candidateData.email ?? (candidateData as any).candidato?.email ?? '') as string).toString().trim().toLowerCase();
    const telefoneNorm = ((candidateData.telefone ?? (candidateData as any).candidato?.telefone ?? '') as string).toString().trim();

    const notaFinalRaw = (candidateData as any).nota_final ?? (candidateData as any).avaliacao?.nota_final;
    const score = typeof notaFinalRaw === 'string' ? parseFloat(notaFinalRaw) : Number(notaFinalRaw ?? 0);

    const justificativa = (candidateData as any).justificativa ?? (candidateData as any).avaliacao?.justificativa ?? '';
    const pontosFortesRaw = (candidateData as any).pontos_fortes ?? (candidateData as any).avaliacao?.pontos_fortes;
    const pontosFracosRaw = (candidateData as any).pontos_fracos ?? (candidateData as any).avaliacao?.pontos_fracos;

    const parseArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch {
          return [val];
        }
      }
      return [];
    };

    const recomendacaoRaw = ((candidateData as any).recomendacao ?? (candidateData as any).avaliacao?.recomendacao ?? '').toString().toUpperCase();
    const observacoes = (candidateData as any).observacoes ?? (candidateData as any).avaliacao?.observacoes ?? '';
    const proximosPassos = (candidateData as any).proximos_passos ?? (candidateData as any).avaliacao?.proximos_passos ?? '';

    // Transform N8N data to candidate format
    const candidate = {
      name: nomeCompleto,
      email: emailNorm || '',
      phone: telefoneNorm,
      position_id: mappedPositionId, // Já validado como UUID válido e existente
      source: candidateSource, // Usar origem_candidato se disponível
      stage: 'analise_ia',
      resume_url: resumeUrl,
      resume_file_name: resumeFileName,
      ai_analysis: {
        score: isNaN(score) ? 0 : score,
        reasoning: justificativa || '',
        pontoFortes: parseArray(pontosFortesRaw),
        pontosAtencao: parseArray(pontosFracosRaw),
        recommendation: recomendacaoRaw === 'APROVAR' ? 'advance' : 'review',
        recomendacaoFinal: recomendacaoRaw === 'APROVAR' ? 'aprovado' : 'nao_recomendado',
        analyzedAt: new Date().toISOString(),
        observacoes: observacoes || '',
        proximosPassos: proximosPassos || ''
      }
    };

    console.log('✅ Candidato validado e pronto para processamento:', JSON.stringify(candidate, null, 2));

    let data, error;

    if (candidateIdFromPayload) {
      // UPDATE: reanálise
      console.log(`🔁 Atualizando candidato existente no banco de dados: ${candidateIdFromPayload}`);
      const updatePayload: any = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        position_id: candidate.position_id,
        source: candidate.source,
        stage: 'analise_ia',
        resume_url: candidate.resume_url,
        resume_file_name: candidate.resume_file_name,
        ai_analysis: candidate.ai_analysis,
        updated_at: new Date().toISOString(),
      };

      const updateResult = await supabase
        .from('candidates')
        .update(updatePayload)
        .eq('id', candidateIdFromPayload)
        .select()
        .single();

      data = updateResult.data;
      error = updateResult.error;

      if (!error) {
        console.log(`✅ Candidato reanalisado e atualizado: ${candidate.name}`);
      }
    } else {
      // INSERT: fluxo atual
      console.log(`➕ Criando novo candidato no banco de dados`);
      const insertResult = await supabase
        .from('candidates')
        .insert(candidate)
        .select()
        .single();

      data = insertResult.data;
      error = insertResult.error;

      if (!error) {
        console.log(`✅ Novo candidato criado: ${candidateData.nome_completo}`);
      }
    }

    if (error) {
      console.error('Erro ao processar candidato:', error);
      throw error;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: candidateIdFromPayload
          ? `Candidato ${candidateData.nome_completo} reanalisado e atualizado com sucesso`
          : `Novo candidato ${candidateData.nome_completo} criado com sucesso`,
        action: candidateIdFromPayload ? 'updated' : 'created',
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