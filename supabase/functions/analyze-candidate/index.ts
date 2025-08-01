import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, analysisPrompt, candidateName } = await req.json();

    console.log(`🚀 Analisando candidato: ${candidateName}`);

    if (!resumeText) {
      throw new Error('Texto do currículo é obrigatório');
    }

    if (!analysisPrompt) {
      throw new Error('Prompt de análise é obrigatório');
    }

    const fullPrompt = `${analysisPrompt}

CURRÍCULO PARA ANÁLISE:
${resumeText}

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato:
{
  "experienciaProfissional": [número de 0 a 4],
  "habilidadesTecnicas": [número de 0 a 2], 
  "competenciasComportamentais": [número de 0 a 1],
  "formacaoAcademica": [número de 0 a 1],
  "diferenciaisRelevantes": [número de 0 a 2],
  "pontoFortes": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "pontosAtencao": ["ponto atenção 1", "ponto atenção 2"],
  "reasoning": "Análise detalhada do candidato baseada nos critérios",
  "recomendacaoFinal": "aprovado" ou "nao_recomendado"
}`;

    console.log('📤 Enviando para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em análise de currículos. Responda sempre com JSON válido seguindo exatamente o formato solicitado.'
          },
          { 
            role: 'user', 
            content: fullPrompt 
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro OpenAI:', response.status, error);
      throw new Error(`Erro da API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Resposta recebida do OpenAI');

    const analysisText = data.choices[0].message.content;
    
    // Tentar extrair JSON da resposta
    let analysisData;
    try {
      // Remover possíveis marcações de código
      const cleanJson = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      console.error('Resposta original:', analysisText);
      throw new Error('Resposta inválida do ChatGPT');
    }

    // Calcular score total
    const totalScore = (analysisData.experienciaProfissional || 0) + 
                      (analysisData.habilidadesTecnicas || 0) + 
                      (analysisData.competenciasComportamentais || 0) + 
                      (analysisData.formacaoAcademica || 0) + 
                      (analysisData.diferenciaisRelevantes || 0);

    // Determinar recommendation baseado no score
    const recommendation = totalScore >= 6.5 ? 'advance' : totalScore >= 4 ? 'review' : 'reject';

    const result = {
      score: totalScore,
      experienciaProfissional: analysisData.experienciaProfissional || 0,
      habilidadesTecnicas: analysisData.habilidadesTecnicas || 0,
      competenciasComportamentais: analysisData.competenciasComportamentais || 0,
      formacaoAcademica: analysisData.formacaoAcademica || 0,
      diferenciaisRelevantes: analysisData.diferenciaisRelevantes || 0,
      pontoFortes: analysisData.pontoFortes || [],
      pontosAtencao: analysisData.pontosAtencao || [],
      recommendation,
      reasoning: analysisData.reasoning || 'Análise realizada com base nos critérios estabelecidos.',
      recomendacaoFinal: analysisData.recomendacaoFinal || (totalScore >= 6.5 ? 'aprovado' : 'nao_recomendado'),
      analyzedAt: new Date().toISOString()
    };

    console.log('✅ Análise concluída:', {
      score: result.score,
      recommendation: result.recommendation,
      recomendacaoFinal: result.recomendacaoFinal
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na análise:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro interno do servidor'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});