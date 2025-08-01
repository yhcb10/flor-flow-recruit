import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF em imagem usando API externa
async function convertPDFToImage(base64Data: string): Promise<string> {
  try {
    console.log('🔄 Convertendo PDF para imagem...');
    
    // Usar API ConvertAPI para converter PDF para PNG
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/png?Secret=your_secret_here', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Name: 'resume.pdf',
              Data: base64Data
            }
          },
          {
            Name: 'PageRange',
            Value: '1'
          }
        ]
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.Files && result.Files[0]) {
        const imageResponse = await fetch(result.Files[0].Url);
        const imageArrayBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
        console.log('✅ PDF convertido para imagem');
        return imageBase64;
      }
    }
    
    throw new Error('API conversion failed');
    
  } catch (error) {
    console.log('❌ API externa falhou, tentando método direto');
    throw error;
  }
}

// Função para analisar currículo usando GPT-4o Vision
async function analyzeResumeWithVision(imageBase64: string): Promise<string> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  try {
    console.log('👁️ Usando GPT-4o Vision para analisar currículo...');
    
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
            content: `Você é um especialista em análise de currículos. Analise esta imagem de currículo e extraia TODAS as informações disponíveis em formato de texto estruturado.

Retorne as informações extraídas em formato de texto simples, incluindo:
- Nome completo
- Email
- Telefone
- Endereço/Localização
- Experiências profissionais (cargo, empresa, período, descrição)
- Formação acadêmica (curso, instituição, período)
- Habilidades e competências
- Idiomas
- Certificações
- Outras informações relevantes

Seja detalhado e extraia todas as informações visíveis no currículo.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este currículo e extraia todas as informações de forma detalhada e estruturada.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro GPT-4o Vision:', response.status, errorText);
      throw new Error(`GPT-4o Vision error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content.trim();
    
    console.log('✅ Currículo analisado via GPT-4o Vision');
    return extractedText;
    
  } catch (error) {
    console.error('❌ Erro GPT-4o Vision:', error);
    throw error;
  }
}

// Função para analisar o texto extraído e estruturar os dados
function parseExtractedText(text: string) {
  const result = {
    name: '',
    email: '',
    phone: '',
    observations: '',
    fullText: ''
  };
  
  if (!text) return result;
  
  // Extrair email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // Extrair telefone
  const phoneMatch = text.match(/(?:\+55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }
  
  // Extrair nome (procurar por padrões após "Nome:" ou similar)
  const namePatterns = [
    /(?:Nome|Name):\s*([A-Za-zÀ-ÿ\s]{5,50})/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m,
    /([A-Z][A-Z\s]{10,50})/
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = text.match(pattern);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      if (name.length > 3 && name.length < 50) {
        result.name = name;
        break;
      }
    }
  }
  
  // Gerar observações baseadas no conteúdo
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  if (lines.length > 3) {
    result.observations = lines.slice(0, 3).join('. ').substring(0, 200) + '...';
  } else {
    result.observations = 'Informações extraídas do currículo processado.';
  }
  
  return result;
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

    let extractedText = '';
    let method = '';

    // Método 1: Converter PDF para imagem e analisar com GPT-4o Vision
    try {
      console.log('🔄 Tentando converter PDF para imagem...');
      let imageBase64 = '';
      
      // Tentar converter PDF para imagem via API externa
      try {
        imageBase64 = await convertPDFToImage(pdfData);
        method = 'API Externa + GPT-4o Vision';
      } catch (conversionError) {
        console.log('❌ Conversão via API falhou, usando PDF direto no GPT-4o Vision');
        // Se conversão falhar, tentar enviar PDF direto como imagem para o GPT-4o
        imageBase64 = pdfData; // Usar o PDF base64 como fallback
        method = 'GPT-4o Vision (PDF direto)';
      }
      
      // Analisar a imagem/PDF com GPT-4o Vision
      extractedText = await analyzeResumeWithVision(imageBase64);
      
    } catch (error) {
      console.log('❌ GPT-4o Vision falhou:', error.message);
      
      // Fallback: retornar erro se não conseguir processar
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível processar o currículo. Verifique se o arquivo não está corrompido e tente novamente.',
          method: 'Falha completa'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!extractedText || extractedText.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto do PDF. Arquivo pode estar corrompido ou protegido.',
          method: method
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Analisar o texto extraído
    const candidateInfo = parseExtractedText(extractedText);
    
    // Adicionar o texto completo para análise IA posterior
    candidateInfo.fullText = extractedText;
    
    // Filtrar resultados de baixa qualidade
    if (candidateInfo.name === 'Google Docs Renderer' || 
        candidateInfo.name.includes('PDF') || 
        candidateInfo.name.includes('Font') ||
        candidateInfo.name.includes('Stream')) {
      candidateInfo.name = '';
    }

    // Calcular confiança
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 3) confidence += 30;
    if (candidateInfo.email && candidateInfo.email.includes('@')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8) confidence += 30;
    if (candidateInfo.observations && candidateInfo.observations.length > 10) confidence += 5;

    // Se confiança muito baixa, tentar métodos alternativos
    if (confidence < 50) {
      console.log('🔄 Baixa confiança, tentando métodos alternativos...');
      
      // Tentar extrair nomes de formato brasileiro
      const brazilianNamePattern = /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+){1,3})/g;
      const brazilianNames = extractedText.match(brazilianNamePattern) || [];
      
      if (brazilianNames.length > 0 && !candidateInfo.name) {
        const validName = brazilianNames.find(name => 
          name.length > 5 && name.length < 50 && 
          !/(PDF|Font|Type|Stream|Object|Page|Root|Info|Creator|Producer|Google|Docs|Renderer)/i.test(name)
        );
        if (validName) {
          candidateInfo.name = validName;
          confidence += 25;
        }
      }
    }

    console.log('✅ Resultado final:', candidateInfo);
    console.log('🎯 Confiança:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: method,
        debug: {
          extractedTextLength: extractedText.length,
          extractedTextSample: extractedText.substring(0, 300)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Erro no processamento: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});