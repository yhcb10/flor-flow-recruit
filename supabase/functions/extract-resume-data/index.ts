import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para enviar PDF diretamente para ChatGPT sem nenhuma interferência
async function analyzeResumeDirectly(base64Data: string, fileName: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  console.log('📄 Enviando PDF diretamente para ChatGPT:', fileName);

  const prompt = `Analise este arquivo PDF de currículo e extraia as seguintes informações:

**Nome Completo **
**Email **
**Telefone **
**Observações Iniciais**

INSTRUÇÕES:
- Leia TODAS as páginas do PDF
- Extraia o nome completo da pessoa
- Extraia o email (formato: xxx@xxx.xxx)
- Extraia o telefone (formato brasileiro com DDD)
- Faça um resumo de 2-3 linhas da experiência profissional

IMPORTANTE:
- Se não encontrar alguma informação, deixe o campo vazio
- NÃO invente dados
- Seja preciso e cuidadoso

Retorne APENAS este JSON (sem markdown):
{
  "name": "Nome completo",
  "email": "email@encontrado.com",
  "phone": "telefone",
  "observations": "Resumo da experiência"
}`;

  try {
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
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      // Se GPT-4O não funcionar, tentar com GPT-4O-mini
      console.log('❌ GPT-4O falhou, tentando GPT-4O-mini...');
      
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de currículos. Analise o PDF enviado e extraia nome, email, telefone e observações com máxima precisão.'
            },
            {
              role: 'user',
              content: `Analise este currículo e extraia: Nome Completo, Email, Telefone e Observações Iniciais.

ARQUIVO: ${fileName}

Retorne apenas JSON:
{
  "name": "Nome",
  "email": "email@dominio.com", 
  "phone": "telefone",
  "observations": "resumo experiência"
}`
            }
          ],
          temperature: 0.1,
          max_tokens: 800
        }),
      });

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        throw new Error(`Erro OpenAI: ${fallbackResponse.status} - ${errorText}`);
      }

      const fallbackData = await fallbackResponse.json();
      const fallbackResult = fallbackData.choices[0].message.content.trim();
      
      console.log('🤖 Resposta GPT-4O-mini:', fallbackResult);
      return parseAIResponse(fallbackResult);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta GPT-4O:', aiResponse);
    return parseAIResponse(aiResponse);
    
  } catch (error) {
    console.error('❌ Erro na análise:', error);
    throw error;
  }
}

// Função para fazer parse da resposta da IA
function parseAIResponse(aiResponse: string) {
  try {
    // Limpar resposta
    let cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Extrair JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validar e limpar dados
    const finalData = {
      name: (result.name && typeof result.name === 'string') ? result.name.trim() : '',
      email: (result.email && typeof result.email === 'string' && result.email.includes('@')) 
             ? result.email.trim() : '',
      phone: (result.phone && typeof result.phone === 'string') ? result.phone.trim() : '',
      observations: (result.observations && typeof result.observations === 'string') 
                    ? result.observations.trim() : ''
    };

    console.log('✅ Dados extraídos:', finalData);
    return finalData;
    
  } catch (error) {
    console.error('❌ Erro no parse:', error);
    
    // Fallback: retornar estrutura vazia
    return {
      name: '',
      email: '',
      phone: '',
      observations: ''
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData, fileName } = await req.json();
    console.log('🚀 Processando currículo:', fileName || 'documento.pdf');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF não fornecido' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Enviar PDF DIRETAMENTE para ChatGPT - SEM EXTRAÇÃO MANUAL
    const candidateInfo = await analyzeResumeDirectly(pdfData, fileName || 'resume.pdf');
    
    // Calcular confiança
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 2) {
      confidence += 30;
      console.log('✅ Nome:', candidateInfo.name);
    }
    
    if (candidateInfo.email && candidateInfo.email.includes('@')) {
      confidence += 35;
      console.log('✅ Email:', candidateInfo.email);
    }
    
    if (candidateInfo.phone && candidateInfo.phone.length > 8) {
      confidence += 30;
      console.log('✅ Telefone:', candidateInfo.phone);
    }
    
    if (candidateInfo.observations && candidateInfo.observations.length > 10) {
      confidence += 5;
      console.log('✅ Observações:', candidateInfo.observations.substring(0, 100) + '...');
    }

    console.log('🎯 Confiança final:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'PDF → ChatGPT Direto (sem extração manual)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});