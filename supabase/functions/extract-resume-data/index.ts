import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF para texto usando API externa gratuita
async function convertPDFToTextUsingAPI(base64Data: string): Promise<string> {
  try {
    console.log('🔄 Convertendo PDF para texto usando API externa...');
    
    // Usar API ConvertAPI (tem plano gratuito)
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/txt?Secret=your_secret_here', {
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
          }
        ]
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.Files && result.Files[0]) {
        const textResponse = await fetch(result.Files[0].Url);
        const extractedText = await textResponse.text();
        console.log('✅ Texto extraído via API:', extractedText.substring(0, 500));
        return extractedText;
      }
    }
    
    throw new Error('API conversion failed');
    
  } catch (error) {
    console.log('❌ API externa falhou, usando método alternativo');
    throw error;
  }
}

// Função alternativa usando ChatGPT para "ler" o PDF como texto
async function extractUsingChatGPT(base64Data: string): Promise<string> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  try {
    console.log('🤖 Usando ChatGPT para extrair texto do PDF...');
    
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
            content: 'Você é um especialista em leitura de documentos. Analise este arquivo e extraia SOMENTE as seguintes informações em formato de texto simples: Nome completo, Email, Telefone e um resumo da experiência profissional.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia do documento: Nome, Email, Telefone e Experiência. Retorne em formato de texto simples, uma informação por linha.'
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
      const errorText = await response.text();
      console.error('❌ Erro ChatGPT:', response.status, errorText);
      throw new Error(`ChatGPT error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content.trim();
    
    console.log('✅ Texto extraído via ChatGPT:', extractedText);
    return extractedText;
    
  } catch (error) {
    console.error('❌ Erro ChatGPT:', error);
    throw error;
  }
}

// Função para fazer parsing manual como último recurso
function parseRawPDFData(base64Data: string): string {
  try {
    console.log('🔧 Tentando extração manual básica...');
    
    const binaryData = atob(base64Data);
    const textParts = [];
    
    // Buscar especificamente por padrões de email e telefone no binário
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
    
    const emails = binaryData.match(emailRegex) || [];
    const phones = binaryData.match(phoneRegex) || [];
    
    console.log('📧 Emails no binário:', emails);
    console.log('📱 Telefones no binário:', phones);
    
    // Tentar extrair nomes de padrões simples
    const nameMatches = binaryData.match(/[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g) || [];
    const possibleNames = nameMatches.filter(name => 
      name.length > 5 && 
      name.length < 50 &&
      !/(PDF|Font|Type|Stream|Object|Page|Root|Info|Creator|Producer)/i.test(name)
    );
    
    console.log('👤 Nomes possíveis:', possibleNames);
    
    if (emails.length > 0) textParts.push(`Email: ${emails[0]}`);
    if (phones.length > 0) textParts.push(`Telefone: ${phones[0]}`);
    if (possibleNames.length > 0) textParts.push(`Nome: ${possibleNames[0]}`);
    
    return textParts.join('\n');
    
  } catch (error) {
    console.error('❌ Erro na extração manual:', error);
    return '';
  }
}

// Função para analisar o texto extraído e estruturar os dados
function parseExtractedText(text: string) {
  const result = {
    name: '',
    email: '',
    phone: '',
    observations: ''
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

    // Método 1: Tentar ChatGPT Vision primeiro
    try {
      extractedText = await extractUsingChatGPT(pdfData);
      method = 'ChatGPT Vision';
    } catch (error) {
      console.log('❌ ChatGPT falhou:', error.message);
      
      // Método 2: Tentar API externa
      try {
        extractedText = await convertPDFToTextUsingAPI(pdfData);
        method = 'API Externa';
      } catch (apiError) {
        console.log('❌ API externa falhou:', apiError.message);
        
        // Método 3: Parsing manual como último recurso
        extractedText = parseRawPDFData(pdfData);
        method = 'Extração Manual';
      }
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
    
    // Calcular confiança
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 3) confidence += 30;
    if (candidateInfo.email && candidateInfo.email.includes('@')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8) confidence += 30;
    if (candidateInfo.observations && candidateInfo.observations.length > 10) confidence += 5;

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