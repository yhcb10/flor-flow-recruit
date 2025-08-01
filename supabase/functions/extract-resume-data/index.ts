import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função melhorada para extrair texto de PDF usando múltiplas estratégias
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    let allText = '';
    
    console.log('📄 Iniciando extração de texto do PDF...');
    
    // Estratégia 1: Buscar texto em streams descomprimidos
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(binaryString)) !== null) {
      const streamContent = streamMatch[1];
      
      // Procurar por comandos de texto PDF
      const textCommands = [
        /\(([^)]{2,})\)\s*Tj/gi,
        /\(([^)]{2,})\)\s*TJ/gi,
        /\[([^\]]+)\]\s*TJ/gi
      ];
      
      for (const command of textCommands) {
        let match;
        while ((match = command.exec(streamContent)) !== null) {
          let text = match[1];
          
          if (command.source.includes('\\]')) {
            // Extrair strings de array TJ
            const strings = text.match(/\(([^)]*)\)/g) || [];
            text = strings.map(s => s.replace(/[()]/g, '')).join(' ');
          }
          
          // Decodificar texto
          text = decodeText(text);
          if (text.length > 1) {
            allText += text + ' ';
          }
        }
      }
    }
    
    // Estratégia 2: Buscar texto fora de streams
    const directTextPattern = /\(([^)]{3,})\)/g;
    let directMatch;
    
    while ((directMatch = directTextPattern.exec(binaryString)) !== null) {
      let text = decodeText(directMatch[1]);
      
      if (text.length > 2 && 
          /[a-zA-ZÀ-ÿ@]/.test(text) &&
          !isMetadata(text)) {
        allText += text + ' ';
      }
    }
    
    // Estratégia 3: Buscar especificamente por email e telefone
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /(?:\+55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
    
    const emails = binaryString.match(emailPattern) || [];
    const phones = binaryString.match(phonePattern) || [];
    
    if (emails.length > 0) {
      console.log('📧 Emails encontrados:', emails);
      allText += ' ' + emails.join(' ') + ' ';
    }
    
    if (phones.length > 0) {
      console.log('📱 Telefones encontrados:', phones);
      allText += ' ' + phones.join(' ') + ' ';
    }
    
    // Limpeza final
    const cleanText = allText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✅ Texto extraído (primeiros 800 chars):', cleanText.substring(0, 800));
    console.log('📏 Tamanho total do texto:', cleanText.length);
    
    return cleanText;
    
  } catch (error) {
    console.error('❌ Erro na extração:', error);
    return '';
  }
}

// Função para decodificar texto PDF
function decodeText(text: string): string {
  return text
    .replace(/\\([0-7]{3})/g, (match, octal) => {
      try {
        const charCode = parseInt(octal, 8);
        return (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : ' ';
      } catch {
        return ' ';
      }
    })
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\./g, ' ')
    .replace(/[^\w\s\u00C0-\u017F\u00A0-\u024F@.\-+()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para identificar metadados
function isMetadata(text: string): boolean {
  const metadataPatterns = [
    /^(obj|endobj|stream|endstream|xref|trailer|startxref)$/i,
    /^(Type|Font|Encoding|Width|Height|Length|Filter|Subtype)$/i,
    /^(FormType|BBox|Resources|Group|Transparency|CS|true|false)$/i,
    /^(ProcSet|Image|ColorSpace|Interpolate|DeviceRGB|DeviceGray)$/i,
    /^(PDF|Indeed|Resume|Apache|FOP|Version|Canva)$/i,
    /^[RF]?\d+$/,
    /^[0-9\s\.\-\+\*\/\=\<\>\!\@\#\$\%\^\&]+$/
  ];
  
  return metadataPatterns.some(pattern => pattern.test(text.trim()));
}

// Função para analisar com ChatGPT normal
async function analyzeWithChatGPT(extractedText: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const prompt = `Analise este texto extraído de um currículo em PDF e extraia as informações de contato.

TEXTO EXTRAÍDO:
${extractedText}

INSTRUÇÕES DETALHADAS:
1. NOME COMPLETO: Procure pelo nome da pessoa (geralmente aparece no início ou em destaque)
2. EMAIL: Procure por qualquer texto que contenha @ seguido de domínio (.com, .com.br, etc.)
3. TELEFONE: Procure por números que pareçam telefone brasileiro:
   - Formato: (11) 99999-9999
   - Ou: +55 11 99999-9999  
   - Ou: 11 99999-9999
   - Ou: 11999999999
4. OBSERVAÇÕES: Faça um resumo da experiência profissional em 2-3 linhas

EXEMPLOS DO QUE PROCURAR:
- Email: maria@gmail.com, joao.silva@empresa.com.br
- Telefone: (11) 98765-4321, +55 11 91234-5678
- Nome: MARIA SILVA, João Santos, Ana Costa

MUITO IMPORTANTE:
- Se não encontrar email com @, deixe vazio
- Se não encontrar telefone, deixe vazio  
- NÃO invente informações
- Use apenas o que está escrito no texto

Retorne APENAS este JSON (sem markdown):
{
  "name": "Nome encontrado ou vazio",
  "email": "email@encontrado.com ou vazio", 
  "phone": "telefone encontrado ou vazio",
  "observations": "Resumo da experiência profissional ou vazio"
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
            content: 'Você é um especialista em análise de currículos. Extraia informações de contato com extrema precisão. Se não tiver certeza absoluta sobre email ou telefone, deixe vazio. Retorne apenas JSON válido.'
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
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta do ChatGPT:', aiResponse);
    
    // Parse JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('ChatGPT não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validação e limpeza
    const finalData = {
      name: (result.name && typeof result.name === 'string') ? result.name.trim() : '',
      email: (result.email && typeof result.email === 'string' && result.email.includes('@')) 
             ? result.email.trim() : '',
      phone: (result.phone && typeof result.phone === 'string') ? result.phone.trim() : '',
      observations: (result.observations && typeof result.observations === 'string') 
                    ? result.observations.trim() : ''
    };

    console.log('✅ Dados finais:', finalData);
    return finalData;
    
  } catch (error) {
    console.error('❌ Erro ChatGPT:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData, fileName } = await req.json();
    console.log('🚀 Processando:', fileName || 'resume.pdf');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF não fornecido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extrair texto do PDF
    const extractedText = await extractTextFromPDF(pdfData);
    
    if (!extractedText || extractedText.length < 20) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto suficiente do PDF',
          debug: { textLength: extractedText.length, sample: extractedText.substring(0, 200) }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Analisar com ChatGPT
    const candidateInfo = await analyzeWithChatGPT(extractedText);
    
    // Calcular confiança
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 2) confidence += 30;
    if (candidateInfo.email && candidateInfo.email.includes('@')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8) confidence += 30;
    if (candidateInfo.observations && candidateInfo.observations.length > 10) confidence += 5;

    console.log('🎯 Confiança final:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'ChatGPT Text Analysis'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});