import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF para imagem usando API externa
async function convertPDFToImage(base64Data: string): Promise<string> {
  try {
    console.log('🔄 Convertendo PDF para imagem...');
    
    // Usar API gratuita do PDF.co para converter PDF para imagem
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/png', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'demo' // Usar chave demo por enquanto
      },
      body: JSON.stringify({
        file: `data:application/pdf;base64,${base64Data}`,
        pages: '1', // Primeira página apenas
        async: false
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na conversão: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Erro PDF.co: ${result.message}`);
    }

    console.log('✅ PDF convertido para imagem');
    return result.url; // URL da imagem gerada
    
  } catch (error) {
    console.error('❌ Erro na conversão PDF→Imagem:', error);
    throw error;
  }
}

// Função para analisar imagem com ChatGPT Vision
async function analyzeImageWithChatGPT(imageUrl: string, fileName: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  console.log('👁️ Enviando imagem para ChatGPT Vision...');

  const prompt = `Analise esta imagem de currículo e extraia exatamente estas informações:

**Nome Completo**
**Email** 
**Telefone**
**Observações Iniciais**

INSTRUÇÕES DETALHADAS:
- Procure pelo NOME da pessoa (geralmente em destaque no topo)
- Procure pelo EMAIL (formato: xxx@xxx.com)
- Procure pelo TELEFONE brasileiro (formato: (11) 99999-9999 ou +55 11 99999-9999)
- Faça um RESUMO de 2-3 linhas da experiência profissional

MUITO IMPORTANTE:
- Se não conseguir encontrar alguma informação, deixe o campo vazio
- NÃO invente dados
- Seja muito preciso com email e telefone

Retorne APENAS este JSON:
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de currículos. Analise a imagem do currículo com extrema precisão e extraia nome, email, telefone e observações.'
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
                  url: imageUrl,
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
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      throw new Error(`Erro ChatGPT Vision: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta ChatGPT Vision:', aiResponse);
    
    // Parse JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Resposta sem JSON:', aiResponse);
      throw new Error('ChatGPT não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validar dados
    const finalData = {
      name: (result.name && typeof result.name === 'string') ? result.name.trim() : '',
      email: (result.email && typeof result.email === 'string' && result.email.includes('@')) 
             ? result.email.trim() : '',
      phone: (result.phone && typeof result.phone === 'string') ? result.phone.trim() : '',
      observations: (result.observations && typeof result.observations === 'string') 
                    ? result.observations.trim() : ''
    };

    console.log('✅ Dados extraídos pelo ChatGPT Vision:', finalData);
    return finalData;
    
  } catch (error) {
    console.error('❌ Erro ChatGPT Vision:', error);
    throw error;
  }
}

// Função de fallback usando extração simples + ChatGPT normal
async function fallbackTextAnalysis(base64Data: string) {
  try {
    console.log('🔄 Usando análise de texto como fallback...');
    
    const binaryString = atob(base64Data);
    
    // Buscar apenas padrões específicos
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /(\+55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
    
    const emails = binaryString.match(emailPattern) || [];
    const phones = binaryString.match(phonePattern) || [];
    
    // Extrair texto simples
    const textPattern = /\(([^)]{2,50})\)/g;
    const texts = [];
    let match;
    
    while ((match = textPattern.exec(binaryString)) !== null) {
      const text = match[1].replace(/[^\w\s\u00C0-\u017F@.-]/g, ' ').trim();
      if (text.length > 2 && /[a-zA-ZÀ-ÿ]/.test(text)) {
        texts.push(text);
      }
    }
    
    const extractedText = [...emails, ...phones, ...texts].join(' ');
    
    console.log('📄 Texto extraído para fallback:', extractedText.substring(0, 500));
    
    if (extractedText.length < 20) {
      throw new Error('Texto insuficiente para análise');
    }
    
    // Analisar com ChatGPT normal
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
            content: 'Analise este texto de currículo e extraia nome, email, telefone e observações.'
          },
          {
            role: 'user',
            content: `Texto do currículo: ${extractedText}

Extraia:
- Nome completo
- Email (deve conter @)
- Telefone brasileiro
- Observações sobre experiência

JSON:
{
  "name": "",
  "email": "",
  "phone": "",
  "observations": ""
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ChatGPT: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        name: result.name || '',
        email: result.email || '',
        phone: result.phone || '',
        observations: result.observations || ''
      };
    }
    
    throw new Error('Fallback falhou');
    
  } catch (error) {
    console.error('❌ Erro no fallback:', error);
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
    console.log('🚀 Processando:', fileName || 'documento.pdf');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF não fornecido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let candidateInfo;
    
    try {
      // Método 1: PDF → Imagem → ChatGPT Vision
      const imageUrl = await convertPDFToImage(pdfData);
      candidateInfo = await analyzeImageWithChatGPT(imageUrl, fileName || 'resume.pdf');
      
    } catch (visionError) {
      console.log('❌ ChatGPT Vision falhou, usando fallback:', visionError.message);
      
      // Método 2: Extração simples + ChatGPT normal
      candidateInfo = await fallbackTextAnalysis(pdfData);
    }
    
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
      console.log('✅ Observações encontradas');
    }

    console.log('🎯 Confiança final:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'PDF → Imagem → ChatGPT Vision'
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