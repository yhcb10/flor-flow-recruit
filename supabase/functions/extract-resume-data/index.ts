import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função corrigida para extrair texto de PDF
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    let extractedText = '';
    
    // Padrões corrigidos - TODAS as regex estão válidas agora
    const patterns = [
      // Padrão 1: Texto entre parênteses com comandos Tj/Td
      /\(([^)]*)\)\s*T[jd]/gi,
      // Padrão 2: Arrays de texto TJ
      /\[([^\]]*)\]\s*TJ/gi,
      // Padrão 3: Blocos de texto BT...ET
      /BT\s*([\s\S]*?)\s*ET/gi,
      // Padrão 4: Texto simples entre parênteses (mínimo 2 chars)
      /\(([^)]{2,})\)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(binaryString)) !== null) {
        let text = match[1] || '';
        
        // Se for array TJ, extrair texto dos parênteses internos
        if (pattern.source.includes('TJ')) {
          const innerTextRegex = /\(([^)]*)\)/g;
          const textParts = [];
          let innerMatch;
          
          while ((innerMatch = innerTextRegex.exec(text)) !== null) {
            textParts.push(innerMatch[1]);
          }
          text = textParts.join(' ');
        }
        
        // Limpeza de caracteres especiais
        text = text
          .replace(/\\([0-7]{3})/g, ' ') // Códigos octais
          .replace(/\\[rntf]/g, ' ')     // Escape chars comuns
          .replace(/\\\\/g, '\\')        // Barras duplas
          .replace(/\\(.)/g, '$1')       // Outros escapes
          .replace(/[^\w\s\u00C0-\u017F\u00A0-\u024F@.\-+]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Filtrar apenas texto válido
        if (text.length >= 2 && 
            /[a-zA-ZÀ-ÿ]/.test(text) &&
            !text.match(/^(obj|endobj|stream|endstream|xref|null)$/i) &&
            !text.match(/^[0-9\s\.\-\+\*\/\=\<\>\!\@\#\$\%\^\&]+$/)) {
          extractedText += text + ' ';
        }
      }
    }
    
    // Limpeza final
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remover duplicatas mantendo ordem
    const words = cleanedText.split(' ');
    const uniqueWords = [];
    const seen = new Set();
    
    for (const word of words) {
      if (word.length > 1 && 
          /[a-zA-ZÀ-ÿ0-9@.]/.test(word) && 
          !seen.has(word.toLowerCase())) {
        seen.add(word.toLowerCase());
        uniqueWords.push(word);
      }
    }
    
    return uniqueWords.join(' ');
    
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