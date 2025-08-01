import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF em imagens e enviar direto para ChatGPT Vision
async function analyzeResumeDirectly(base64Data: string, fileName: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  console.log('📄 Enviando PDF diretamente para ChatGPT Vision:', fileName);

  const prompt = `Analise este currículo em PDF e extraia as seguintes informações:

INSTRUÇÕES ESPECÍFICAS:
1. NOME COMPLETO: Procure o nome da pessoa (geralmente no topo)
2. EMAIL: Procure email no formato xxx@xxx.xxx
3. TELEFONE: Procure telefone brasileiro (pode ter DDD entre parênteses)
4. OBSERVAÇÕES: Faça um resumo da experiência profissional em 2-3 linhas

MUITO IMPORTANTE:
- Leia TODAS as páginas do PDF cuidadosamente
- Se não encontrar email ou telefone, retorne string vazia
- NÃO invente informações
- Seja preciso com os dados de contato

Retorne APENAS este JSON (sem markdown):
{
  "name": "Nome completo encontrado",
  "email": "email@encontrado.com",
  "phone": "telefone encontrado",
  "observations": "Resumo da experiência profissional"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Usando GPT-4O que tem capacidade de visão
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de currículos. Analise PDFs com extrema precisão. Extraia informações de contato de forma muito cuidadosa. Se não tiver certeza absoluta sobre email ou telefone, deixe vazio.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`,
                  detail: 'high' // Alta resolução para melhor leitura
                }
              }
            ]
          }
        ],
        temperature: 0.0, // Zero criatividade
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta do ChatGPT Vision:', aiResponse);
    
    // Extrair JSON da resposta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Nenhum JSON encontrado na resposta');
      throw new Error('ChatGPT não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log('✅ Dados extraídos pelo ChatGPT:', result);
    
    // Validação final
    const finalData = {
      name: (result.name && typeof result.name === 'string') ? result.name.trim() : '',
      email: (result.email && typeof result.email === 'string' && result.email.includes('@')) 
             ? result.email.trim() : '',
      phone: (result.phone && typeof result.phone === 'string') ? result.phone.trim() : '',
      observations: (result.observations && typeof result.observations === 'string') 
                    ? result.observations.trim() : ''
    };

    console.log('📊 Dados finais validados:', finalData);
    return finalData;
    
  } catch (error) {
    console.error('❌ Erro na análise com ChatGPT Vision:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData, fileName } = await req.json();
    console.log('🚀 Iniciando análise:', fileName || 'documento.pdf');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF não fornecido' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Enviar PDF diretamente para ChatGPT Vision
    const candidateInfo = await analyzeResumeDirectly(pdfData, fileName || 'resume.pdf');
    
    // Calcular confiança baseada na qualidade dos dados
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 2) {
      confidence += 30;
      console.log('✅ Nome encontrado:', candidateInfo.name);
    }
    
    if (candidateInfo.email && candidateInfo.email.includes('@')) {
      confidence += 35;
      console.log('✅ Email encontrado:', candidateInfo.email);
    }
    
    if (candidateInfo.phone && candidateInfo.phone.length > 8) {
      confidence += 30;
      console.log('✅ Telefone encontrado:', candidateInfo.phone);
    }
    
    if (candidateInfo.observations && candidateInfo.observations.length > 10) {
      confidence += 5;
      console.log('✅ Observações encontradas');
    }

    console.log('🎯 Confiança final:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'ChatGPT Vision API - Análise direta do PDF'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        method: 'ChatGPT Vision API'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});