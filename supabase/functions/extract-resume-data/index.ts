import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função simplificada para extrair texto de PDF
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    
    // Buscar padrões de texto comuns em PDFs
    const patterns = [
      /\(([^)]{3,})\)/g,        // Texto entre parênteses (mín 3 chars)
      /\/([A-Za-z\u00C0-\u017F\s]{3,})\s/g,  // Texto após barra
    ];
    
    let extractedText = '';
    
    for (const pattern of patterns) {
      const matches = binaryString.match(pattern) || [];
      for (const match of matches) {
        let cleanText = match.replace(/[()\/]/g, '').trim();
        
        // Filtrar apenas texto que parece ser legível
        if (cleanText.length >= 3 && 
            /[a-zA-ZÀ-ÿ]/.test(cleanText) && 
            !cleanText.match(/^[0-9\.\-\+\*\/\=\<\>\!\@\#\$\%\^\&]+$/)) {
          extractedText += cleanText + ' ';
        }
      }
    }
    
    // Se não encontrou texto suficiente, fazer extração mais simples
    if (extractedText.length < 20) {
      const simpleText = binaryString
        .replace(/[^\x20-\x7E\u00C0-\u017F]/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(word => word.length > 2 && /[a-zA-ZÀ-ÿ]/.test(word))
        .slice(0, 100)
        .join(' ');
      
      extractedText = simpleText;
    }
    
    return extractedText.trim();
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    return '';
  }
}

// Função para analisar currículo usando ChatGPT
async function analyzeResumeWithAI(resumeText: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const prompt = `Analise o seguinte currículo e extraia as informações em formato JSON. Se alguma informação não estiver disponível, deixe o campo vazio.

Currículo:
${resumeText}

Retorne APENAS um JSON válido com esta estrutura:
{
  "name": "Nome completo da pessoa",
  "email": "email@exemplo.com",
  "phone": "telefone formatado",
  "experience": "X anos de experiência em...",
  "skills": ["habilidade1", "habilidade2", "habilidade3"],
  "education": "Formação educacional principal"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em análise de currículos. Extraia informações de forma precisa e retorne apenas JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('Resposta da IA:', aiResponse);
    
    // Parse da resposta JSON
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        return extractedData;
      } else {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta da IA:', parseError);
      throw new Error('Resposta da IA inválida');
    }
  } catch (error) {
    console.error('Erro na análise com IA:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData, fileName } = await req.json();

    console.log('Processing resume:', fileName || 'unknown');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados do PDF não fornecidos',
          confidence: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 400
        }
      );
    }

    // Extrair texto do PDF
    let textToAnalyze = '';
    try {
      textToAnalyze = await extractTextFromPDF(pdfData);
      console.log('Texto extraído (primeiros 300 chars):', textToAnalyze.substring(0, 300));
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar PDF',
          confidence: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 400
        }
      );
    }

    if (!textToAnalyze || textToAnalyze.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto suficiente do currículo',
          confidence: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 400
        }
      );
    }

    // Analisar com ChatGPT
    let aiAnalysis;
    try {
      aiAnalysis = await analyzeResumeWithAI(textToAnalyze);
      console.log('Análise da IA concluída:', aiAnalysis);
    } catch (error) {
      console.error('Erro na análise da IA:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro na análise inteligente do currículo',
          confidence: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 500
        }
      );
    }
    
    // Calcular confiança baseada nos campos preenchidos
    let confidence = 0;
    if (aiAnalysis.name && aiAnalysis.name.trim() && aiAnalysis.name !== '' && aiAnalysis.name.length > 2) confidence += 30;
    if (aiAnalysis.email && aiAnalysis.email.includes('@') && aiAnalysis.email.length > 5) confidence += 25;
    if (aiAnalysis.phone && aiAnalysis.phone.trim() && aiAnalysis.phone !== '' && aiAnalysis.phone.length > 3) confidence += 25;
    if (aiAnalysis.experience && aiAnalysis.experience.trim() && aiAnalysis.experience !== '' && aiAnalysis.experience.length > 5) confidence += 10;
    if (aiAnalysis.skills && Array.isArray(aiAnalysis.skills) && aiAnalysis.skills.length > 0) confidence += 10;
    if (aiAnalysis.education && aiAnalysis.education.trim() && aiAnalysis.education !== '' && aiAnalysis.education.length > 3) confidence += 5;

    console.log('Dados extraídos:', aiAnalysis);
    console.log('Confiança calculada:', confidence);

    return new Response(
      JSON.stringify({
        success: true,
        data: aiAnalysis,
        confidence: confidence,
        extractedText: textToAnalyze.substring(0, 500) // Para debug
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing resume:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to process resume',
        confidence: 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});