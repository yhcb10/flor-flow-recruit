import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF em texto usando uma abordagem robusta
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryData = atob(base64Data);
    console.log('📄 Processando PDF de', binaryData.length, 'bytes');
    
    // Estratégia 1: Extrair texto de objetos de texto PDF
    const textObjects = [];
    
    // Buscar por objetos de stream que contêm texto
    const streamRegex = /(\d+\s+\d+\s+obj[\s\S]*?stream\s*\n)([\s\S]*?)(endstream)/gi;
    let streamMatch;
    
    while ((streamMatch = streamRegex.exec(binaryData)) !== null) {
      const streamContent = streamMatch[2];
      
      // Procurar por comandos de texto dentro do stream
      const textCommands = [
        /\((.*?)\)\s*Tj/g,
        /\((.*?)\)\s*TJ/g,
        /\[(.*?)\]\s*TJ/g
      ];
      
      for (const command of textCommands) {
        let match;
        while ((match = command.exec(streamContent)) !== null) {
          let text = match[1];
          
          // Se for array TJ, extrair strings individuais
          if (command.source.includes('[')) {
            const stringMatches = text.match(/\((.*?)\)/g) || [];
            text = stringMatches.map(s => s.replace(/[()]/g, '')).join('');
          }
          
          // Decodificar caracteres especiais
          text = decodeTextContent(text);
          
          if (text && text.length > 1) {
            textObjects.push(text);
          }
        }
      }
    }
    
    // Estratégia 2: Buscar texto em parênteses (método mais direto)
    const parenthesesRegex = /\(([^)]{1,200})\)/g;
    let match;
    
    while ((match = parenthesesRegex.exec(binaryData)) !== null) {
      const text = decodeTextContent(match[1]);
      if (text && text.length > 1 && isRelevantText(text)) {
        textObjects.push(text);
      }
    }
    
    // Combinar e limpar todo o texto extraído
    const allText = textObjects.join(' ');
    const cleanedText = cleanAndFilterText(allText);
    
    console.log('✅ Texto extraído:', cleanedText.substring(0, 500) + '...');
    console.log('📏 Tamanho total:', cleanedText.length, 'caracteres');
    
    return cleanedText;
    
  } catch (error) {
    console.error('❌ Erro na extração de texto:', error);
    throw new Error(`Falha ao extrair texto do PDF: ${error.message}`);
  }
}

// Função para decodificar conteúdo de texto PDF
function decodeTextContent(text: string): string {
  if (!text) return '';
  
  return text
    // Decodificar códigos octais
    .replace(/\\([0-7]{3})/g, (match, octal) => {
      try {
        const charCode = parseInt(octal, 8);
        return (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : ' ';
      } catch {
        return ' ';
      }
    })
    // Decodificar escape sequences comuns
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\f/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\(.)/g, '$1')
    // Remover caracteres de controle
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para verificar se o texto é relevante
function isRelevantText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Deve conter pelo menos uma letra
  if (!/[a-zA-ZÀ-ÿ]/.test(text)) return false;
  
  // Filtrar metadados conhecidos
  const irrelevantPatterns = [
    /^(obj|endobj|stream|endstream|xref|trailer|startxref)$/i,
    /^(Type|Font|Encoding|Width|Height|Length|Filter|Subtype|BaseFont|FontDescriptor)$/i,
    /^(FormType|BBox|Resources|Group|Transparency|CS|ProcSet|Image|ColorSpace|Interpolate)$/i,
    /^(PDF|Indeed|Resume|Apache|FOP|Version|Google|Docs|Renderer|Skia|Canva)$/i,
    /^[RF]?\d+$/,
    /^D:\d{14}/,
    /^[0-9\s\.\-\+\*\/\=\<\>\!\@\#\$\%\^\&\(\)]+$/
  ];
  
  return !irrelevantPatterns.some(pattern => pattern.test(text.trim()));
}

// Função para limpar e filtrar o texto final
function cleanAndFilterText(text: string): string {
  if (!text) return '';
  
  // Dividir em palavras e filtrar
  const words = text.split(/\s+/);
  const relevantWords = [];
  
  for (const word of words) {
    const cleanWord = word.trim();
    
    if (cleanWord.length >= 2 && isRelevantText(cleanWord)) {
      relevantWords.push(cleanWord);
    }
  }
  
  return relevantWords.join(' ');
}

// Função para analisar o texto extraído e identificar informações
function analyzeExtractedText(text: string) {
  console.log('🔍 Analisando texto para extrair informações...');
  
  // Extrair email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex) || [];
  const email = emailMatches.find(e => 
    e.length > 5 && 
    !e.includes('example') && 
    !e.includes('domain') &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e)
  ) || '';
  
  // Extrair telefone brasileiro
  const phonePatterns = [
    /\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g,
    /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g,
    /\d{2}\s+\d{4,5}[-\s]?\d{4}/g
  ];
  
  let phone = '';
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    const validPhone = matches.find(p => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13;
    });
    
    if (validPhone) {
      phone = validPhone;
      break;
    }
  }
  
  // Extrair nome (buscar por padrões de nomes próprios)
  const namePatterns = [
    /\b[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]{2,}\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]{2,}(?:\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]{2,})*/g,
    /[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ]{2,}\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ]{2,}(?:\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ]{2,})?/g
  ];
  
  let name = '';
  for (const pattern of namePatterns) {
    const matches = text.match(pattern) || [];
    const validName = matches.find(n => 
      n && 
      n.length > 5 && 
      n.length < 50 &&
      n.split(' ').length >= 2 &&
      n.split(' ').length <= 4 &&
      !/^(CURRICULO|RESUME|CV|PDF|DOCUMENTO|EXPERIENCIA|FORMACAO|CONTATO|TELEFONE|EMAIL)/.test(n.toUpperCase())
    );
    
    if (validName) {
      name = validName;
      break;
    }
  }
  
  // Gerar observações básicas baseadas no conteúdo
  const words = text.toLowerCase().split(/\s+/);
  const experienceKeywords = ['experiência', 'trabalho', 'empresa', 'cargo', 'função', 'atividades', 'responsabilidades'];
  const hasExperience = experienceKeywords.some(keyword => words.includes(keyword));
  
  let observations = '';
  if (hasExperience) {
    observations = 'Profissional com experiência identificada no currículo. Informações detalhadas disponíveis no documento original.';
  } else {
    observations = 'Currículo processado com sucesso. Informações adicionais podem estar disponíveis no documento original.';
  }
  
  const result = {
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    observations: observations
  };
  
  console.log('📧 Email encontrado:', result.email || 'Nenhum');
  console.log('📱 Telefone encontrado:', result.phone || 'Nenhum');
  console.log('👤 Nome encontrado:', result.name || 'Nenhum');
  
  return result;
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
          error: 'Não foi possível extrair texto suficiente do PDF. O arquivo pode estar corrompido ou ser uma imagem.',
          debug: { textLength: extractedText.length }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Analisar o texto extraído
    const candidateInfo = analyzeExtractedText(extractedText);
    
    // Calcular confiança baseada nos dados encontrados
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 5) confidence += 30;
    if (candidateInfo.email && candidateInfo.email.includes('@')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8) confidence += 30;
    if (candidateInfo.observations && candidateInfo.observations.length > 10) confidence += 5;

    console.log('🎯 Confiança final:', confidence + '%');
    console.log('✅ Dados extraídos:', candidateInfo);

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'Extração direta de PDF com análise de texto'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro no processamento:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Erro no processamento do PDF: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});