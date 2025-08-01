import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função inteligente para extrair texto limpo do PDF
async function extractCleanTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    console.log('📄 Analisando PDF de', binaryString.length, 'bytes');
    
    const extractedParts: string[] = [];
    
    // 1. Buscar emails diretamente no binário
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = binaryString.match(emailPattern) || [];
    if (emails.length > 0) {
      console.log('📧 Emails encontrados:', emails);
      extractedParts.push(...emails);
    }
    
    // 2. Buscar telefones brasileiros
    const phonePatterns = [
      /\+55\s*\d{2}\s*\d{4,5}[-\s]?\d{4}/g,
      /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g,
      /\d{2}\s+\d{4,5}[-\s]?\d{4}/g
    ];
    
    for (const pattern of phonePatterns) {
      const phones = binaryString.match(pattern) || [];
      if (phones.length > 0) {
        console.log('📱 Telefones encontrados:', phones);
        extractedParts.push(...phones);
      }
    }
    
    // 3. Extrair texto de comandos PDF (método mais preciso)
    const textCommands = [
      /BT\s*([\s\S]*?)\s*ET/gi,           // Blocos de texto
      /\(([\w\s\u00C0-\u017F.@-]{2,50})\)\s*Tj/gi,  // Comandos Tj
      /\[(.*?)\]\s*TJ/gi                  // Arrays TJ
    ];
    
    for (const command of textCommands) {
      let match;
      while ((match = command.exec(binaryString)) !== null) {
        let text = match[1];
        
        // Se for array TJ, extrair strings
        if (command.source.includes('TJ')) {
          const strings = text.match(/\(([^)]*)\)/g) || [];
          text = strings.map(s => s.replace(/[()]/g, '')).join(' ');
        }
        
        // Limpar e validar texto
        text = cleanText(text);
        if (text.length > 2 && isValidText(text)) {
          extractedParts.push(text);
        }
      }
    }
    
    // 4. Buscar texto em parênteses (mais genérico)
    const parenthesesPattern = /\(([^)]{3,100})\)/g;
    let match;
    while ((match = parenthesesPattern.exec(binaryString)) !== null) {
      const text = cleanText(match[1]);
      if (text.length > 2 && isValidText(text)) {
        extractedParts.push(text);
      }
    }
    
    // Combinar tudo e remover duplicatas
    const uniqueParts = [...new Set(extractedParts)];
    const finalText = uniqueParts.join(' ');
    
    console.log('✅ Texto limpo extraído (', finalText.length, 'chars):', finalText.substring(0, 600));
    
    return finalText;
    
  } catch (error) {
    console.error('❌ Erro na extração:', error);
    return '';
  }
}

// Função para limpar texto
function cleanText(text: string): string {
  return text
    .replace(/\\([0-7]{3})/g, (match, octal) => {
      const code = parseInt(octal, 8);
      return (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
    })
    .replace(/\\[rntf]/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\./g, ' ')
    .replace(/[^\w\s\u00C0-\u017F\u00A0-\u024F@.\-+()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para validar se é texto útil
function isValidText(text: string): boolean {
  // Deve ter pelo menos uma letra
  if (!/[a-zA-ZÀ-ÿ]/.test(text)) return false;
  
  // Não deve ser apenas números
  if (/^[0-9\s.\-+()]+$/.test(text)) return false;
  
  // Não deve ser metadados conhecidos
  const badPatterns = [
    /^(obj|endobj|stream|endstream|xref|trailer|startxref)$/i,
    /^(Type|Font|Encoding|Width|Height|Length|Filter|Subtype|FormType|BBox|Resources|Group|Transparency|CS|ProcSet|Image|ColorSpace|Interpolate|DeviceRGB|DeviceGray)$/i,
    /^(PDF|Indeed|Resume|Apache|FOP|Version|Canva|Google|Docs|Renderer|Skia)$/i,
    /^[RF]?\d+$/,
    /^D:\d{14}/
  ];
  
  return !badPatterns.some(pattern => pattern.test(text.trim()));
}

// Função para analisar com ChatGPT usando prompt otimizado
async function analyzeWithChatGPT(extractedText: string, fileName: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const prompt = `Você é um especialista em análise de currículos. Analise este texto extraído de um PDF de currículo e extraia as informações solicitadas.

TEXTO DO CURRÍCULO:
${extractedText}

ARQUIVO: ${fileName}

TAREFA: Extraia exatamente estas informações:

1. **Nome Completo**: Procure pelo nome da pessoa (geralmente aparece primeiro ou em destaque)
2. **Email**: Procure por qualquer email válido (deve conter @ e domínio)
3. **Telefone**: Procure por telefone brasileiro (formatos: (11) 99999-9999, +55 11 99999-9999, 11 99999-9999)
4. **Observações Iniciais**: Faça um resumo de 2-3 linhas sobre a experiência profissional da pessoa

INSTRUÇÕES IMPORTANTES:
- Seja MUITO cuidadoso com email e telefone - extraia exatamente como aparece
- Se não encontrar alguma informação com certeza, deixe o campo vazio
- NÃO invente ou suponha informações
- Use apenas dados que estão claramente no texto

FORMATO DE RESPOSTA:
Retorne APENAS este JSON (sem explicações adicionais):
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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em extração de dados de currículos. Analise textos extraídos de PDFs e identifique nome, email, telefone e experiência com máxima precisão. Retorne apenas JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,
        max_tokens: 1200
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      throw new Error(`Erro ChatGPT: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta ChatGPT:', aiResponse);
    
    // Parse JSON mais robusto
    let cleanResponse = aiResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{]*/, '')  // Remove texto antes do JSON
      .replace(/[^}]*$/, '}'); // Remove texto depois do JSON
    
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Resposta sem JSON válido:', aiResponse);
      throw new Error('ChatGPT não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validação final
    const finalData = {
      name: (result.name && typeof result.name === 'string' && result.name !== 'Nome completo encontrado') 
             ? result.name.trim() : '',
      email: (result.email && typeof result.email === 'string' && result.email.includes('@') && result.email !== 'email@encontrado.com') 
             ? result.email.trim() : '',
      phone: (result.phone && typeof result.phone === 'string' && result.phone !== 'telefone encontrado') 
             ? result.phone.trim() : '',
      observations: (result.observations && typeof result.observations === 'string' && result.observations !== 'Resumo da experiência profissional') 
                    ? result.observations.trim() : ''
    };

    console.log('✅ Dados finais validados:', finalData);
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
    console.log('🚀 Processando:', fileName || 'documento.pdf');

    if (!pdfData) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF não fornecido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extrair texto limpo do PDF
    const extractedText = await extractCleanTextFromPDF(pdfData);
    
    if (!extractedText || extractedText.length < 30) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto suficiente do PDF',
          debug: { textLength: extractedText.length }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Analisar com ChatGPT
    const candidateInfo = await analyzeWithChatGPT(extractedText, fileName || 'resume.pdf');
    
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
        method: 'Extração Inteligente + ChatGPT'
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