import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função completamente reescrita para extrair texto de PDF
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Converter para string UTF-8 com fallback
    let pdfString: string;
    try {
      pdfString = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      pdfString = new TextDecoder('latin1').decode(bytes);
    }
    
    console.log('PDF processado, tamanho:', pdfString.length);
    
    let extractedText = '';
    
    // Método 1: Buscar streams descomprimidos
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(pdfString)) !== null) {
      const streamContent = streamMatch[1];
      
      // Verificar se o stream contém texto legível (não é binário comprimido)
      if (streamContent && streamContent.length > 0) {
        // Buscar por texto em comandos de texto PDF
        const textInStream = extractTextFromStream(streamContent);
        if (textInStream.length > 0) {
          extractedText += textInStream + ' ';
        }
      }
    }
    
    // Método 2: Buscar texto fora de streams (texto inline)
    const inlineText = extractInlineText(pdfString);
    if (inlineText.length > 0) {
      extractedText += inlineText + ' ';
    }
    
    // Método 3: Buscar por padrões específicos de texto
    const patternText = extractPatternText(pdfString);
    if (patternText.length > 0) {
      extractedText += patternText + ' ';
    }
    
    // Limpeza final
    const cleanedText = cleanAndFilterText(extractedText);
    
    console.log('Texto limpo extraído (primeiros 500 chars):', cleanedText.substring(0, 500));
    
    return cleanedText;
    
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Falha ao processar PDF: ' + error.message);
  }
}

// Extrair texto de streams PDF
function extractTextFromStream(streamContent: string): string {
  let text = '';
  
  // Padrões de comandos de texto PDF
  const textPatterns = [
    // Tj - mostrar string de texto
    /\(([^)]*)\)\s*Tj/gi,
    // TJ - mostrar array de strings
    /\[([^\]]*)\]\s*TJ/gi,
    // Td, TD - mover posição e mostrar texto
    /\(([^)]*)\)\s*T[dD]/gi,
    // ' - mover para próxima linha e mostrar texto
    /\(([^)]*)\)\s*'/gi
  ];
  
  for (const pattern of textPatterns) {
    let match;
    while ((match = pattern.exec(streamContent)) !== null) {
      let textContent = match[1];
      
      // Se for array TJ, extrair strings individuais
      if (pattern.source.includes('TJ')) {
        const stringMatches = textContent.match(/\(([^)]*)\)/g) || [];
        textContent = stringMatches.map(s => s.replace(/[()]/g, '')).join(' ');
      }
      
      // Decodificar caracteres especiais
      textContent = decodeTextContent(textContent);
      
      if (textContent.trim().length > 0) {
        text += textContent + ' ';
      }
    }
  }
  
  return text;
}

// Extrair texto inline (fora de streams)
function extractInlineText(pdfContent: string): string {
  let text = '';
  
  // Procurar por blocos BT...ET (Begin Text...End Text)
  const btPattern = /BT\s*([\s\S]*?)\s*ET/gi;
  let btMatch;
  
  while ((btMatch = btPattern.exec(pdfContent)) !== null) {
    const textBlock = btMatch[1];
    const blockText = extractTextFromStream(textBlock);
    if (blockText.trim().length > 0) {
      text += blockText + ' ';
    }
  }
  
  return text;
}

// Extrair usando padrões gerais
function extractPatternText(pdfContent: string): string {
  let text = '';
  
  // Buscar strings entre parênteses que parecem ser texto real
  const stringPattern = /\(([^)]{3,})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfContent)) !== null) {
    const str = match[1];
    
    // Verificar se parece ser texto real (não metadados)
    if (isLikelyText(str)) {
      const decodedStr = decodeTextContent(str);
      if (decodedStr.trim().length > 0) {
        text += decodedStr + ' ';
      }
    }
  }
  
  return text;
}

// Decodificar conteúdo de texto PDF
function decodeTextContent(text: string): string {
  return text
    // Códigos octais (\123)
    .replace(/\\([0-7]{3})/g, (match, octal) => {
      try {
        return String.fromCharCode(parseInt(octal, 8));
      } catch {
        return ' ';
      }
    })
    // Códigos hexadecimais (\x41)
    .replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return ' ';
      }
    })
    // Caracteres de escape comuns
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\f/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    // Remover outros escapes
    .replace(/\\./g, ' ');
}

// Verificar se uma string parece ser texto real
function isLikelyText(str: string): boolean {
  // Deve ter pelo menos 2 caracteres
  if (str.length < 2) return false;
  
  // Deve conter pelo menos uma letra
  if (!/[a-zA-ZÀ-ÿ]/.test(str)) return false;
  
  // Não deve ser apenas números ou símbolos
  if (/^[0-9\s\.\-\+\*\/\=\<\>\!\@\#\$\%\^\&]+$/.test(str)) return false;
  
  // Não deve ser metadados conhecidos
  const metadataPatterns = [
    /^(obj|endobj|stream|endstream|xref|trailer)$/i,
    /^(Type|Font|Encoding|Width|Height|Length|Filter)$/i,
    /^(FormType|BBox|Resources|Group|Transparency)$/i,
    /^(ProcSet|Image|ColorSpace|Interpolate)$/i,
    /^[RF][0-9]+$/,  // Referências R1, F2, etc
    /^[0-9\s]+$/     // Apenas números
  ];
  
  for (const pattern of metadataPatterns) {
    if (pattern.test(str.trim())) return false;
  }
  
  return true;
}

// Limpar e filtrar texto final
function cleanAndFilterText(text: string): string {
  // Normalizar espaços
  text = text.replace(/\s+/g, ' ').trim();
  
  // Dividir em palavras e filtrar
  const words = text.split(' ');
  const validWords = [];
  const seenWords = new Set();
  
  for (const word of words) {
    const cleanWord = word.trim();
    
    // Filtros de qualidade
    if (cleanWord.length >= 2 && 
        /[a-zA-ZÀ-ÿ]/.test(cleanWord) &&
        !seenWords.has(cleanWord.toLowerCase()) &&
        isLikelyText(cleanWord)) {
      
      seenWords.add(cleanWord.toLowerCase());
      validWords.push(cleanWord);
    }
  }
  
  return validWords.join(' ');
}

// Função para analisar currículo usando ChatGPT (melhorada)
async function analyzeResumeWithAI(resumeText: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  // SEMPRE extrair informações básicas primeiro (como backup)
  const basicInfo = extractBasicInfo(resumeText);
  console.log('Informações básicas extraídas por regex:', basicInfo);

  const prompt = `Analise o seguinte texto extraído de um currículo e extraia as informações disponíveis. 
IMPORTANTE: Procure especialmente por emails (formato: xxx@xxx.xxx) e telefones (números com DDD, podem ter parênteses, traços ou espaços).

Texto do currículo:
${resumeText}

Procure por:
- Email: padrões como "email@dominio.com", "contato@", "usuario@gmail.com", etc.
- Telefone: números brasileiros com DDD como "(11) 99999-9999", "11999999999", "11 9999-9999", "+55 11 99999-9999"
- Nome: geralmente no início do currículo
- Experiência profissional e educação

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "name": "Nome completo encontrado ou string vazia",
  "email": "email@encontrado.com ou string vazia", 
  "phone": "telefone encontrado ou string vazia",
  "experience": "Resumo da experiência profissional ou string vazia",
  "skills": ["lista", "de", "habilidades"] ou array vazio,
  "education": "Formação educacional ou string vazia"
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
            content: 'Você é um especialista em análise de currículos. Seja minucioso ao procurar emails e telefones no texto. Procure por padrões como "@", números com DDD brasileiro, etc. Retorne apenas JSON válido.'
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
    
    // Parse mais robusto da resposta JSON
    try {
      // Remover markdown se presente
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        
        // Combinar dados da IA com extração por regex (priorizar regex para email/phone se estiver vazio)
        const finalData = {
          name: extractedData.name || basicInfo.name || '',
          email: extractedData.email || basicInfo.email || '',
          phone: extractedData.phone || basicInfo.phone || '',
          experience: extractedData.experience || '',
          skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
          education: extractedData.education || ''
        };

        console.log('Dados finais combinados:', finalData);
        return finalData;
      } else {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta da IA:', parseError);
      
      // Fallback: usar informações básicas extraídas por regex
      return {
        name: basicInfo.name || '',
        email: basicInfo.email || '',
        phone: basicInfo.phone || '',
        experience: '',
        skills: [],
        education: ''
      };
    }
  } catch (error) {
    console.error('Erro na análise com IA:', error);
    
    // Fallback: usar informações básicas extraídas por regex
    return {
      name: basicInfo.name || '',
      email: basicInfo.email || '',
      phone: basicInfo.phone || '',
      experience: '',
      skills: [],
      education: ''
    };
  }
}

// Extração básica por regex como fallback (melhorada)
function extractBasicInfo(text: string) {
  const info: any = {};
  
  console.log('Iniciando extração básica do texto:', text.substring(0, 300));
  
  // Email - padrões mais abrangentes
  const emailPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    // Capturar emails que podem estar separados por espaços
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g
  ];
  
  for (const emailRegex of emailPatterns) {
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch[0]) {
      // Limpar espaços do email encontrado
      info.email = emailMatch[0].replace(/\s/g, '');
      console.log('Email encontrado:', info.email);
      break;
    }
  }
  
  // Telefone brasileiro - padrões mais abrangentes
  const phonePatterns = [
    // Padrão completo: +55 (11) 99999-9999
    /\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g,
    // Padrão com DDD: (11) 99999-9999
    /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g,
    // Padrão simples: 11 99999-9999
    /\b\d{2}\s+\d{4,5}[-\s]?\d{4}\b/g,
    // Padrão sem espaços: 11999999999
    /\b\d{11}\b/g,
    // Padrão com traços: 11-99999-9999
    /\b\d{2}[-\s]?\d{4,5}[-\s]?\d{4}\b/g,
    // Capturar números que podem estar espalhados
    /\d{2}\s*\d{4,5}\s*\d{4}/g
  ];
  
  for (const phoneRegex of phonePatterns) {
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch[0]) {
      let phone = phoneMatch[0].trim();
      
      // Validar se tem pelo menos 10 dígitos
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
        info.phone = phone;
        console.log('Telefone encontrado:', info.phone);
        break;
      }
    }
  }
  
  // Nome - buscar no início do texto ou por padrões específicos
  const namePatterns = [
    // Procurar por duas palavras em maiúscula no início
    /^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]+)/,
    // Procurar padrão "Nome: João Silva"
    /(?:nome|name):\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]+(?:\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]+)+)/i,
  ];
  
  const words = text.split(/\s+/);
  
  // Tentar padrões específicos primeiro
  for (const nameRegex of namePatterns) {
    const nameMatch = text.match(nameRegex);
    if (nameMatch && nameMatch[1]) {
      info.name = nameMatch[1].trim();
      console.log('Nome encontrado por padrão:', info.name);
      break;
    }
  }
  
  // Se não encontrou nome, procurar no início do texto
  if (!info.name) {
    for (let i = 0; i < Math.min(words.length - 1, 20); i++) {
      const word1 = words[i];
      const word2 = words[i + 1];
      
      if (word1 && word2 && 
          word1.length > 2 && word2.length > 2 && 
          /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ]/.test(word1) &&
          /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]/.test(word2) &&
          !/^(PDF|TYPE|FORM|STREAM|OBJ|CURRICULO|RESUME|CV)$/i.test(word1) &&
          !/^(PDF|TYPE|FORM|STREAM|OBJ|CURRICULO|RESUME|CV)$/i.test(word2)) {
        
        info.name = `${word1} ${word2}`;
        console.log('Nome encontrado no início:', info.name);
        break;
      }
    }
  }
  
  console.log('Informações básicas extraídas:', info);
  return info;
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
      console.log('Texto extraído (primeiros 500 chars):', textToAnalyze.substring(0, 500));
      console.log('Tamanho total do texto extraído:', textToAnalyze.length);
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar PDF: ' + error.message,
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

    if (!textToAnalyze || textToAnalyze.trim().length < 5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto legível do currículo. O arquivo pode estar corrompido ou usar um formato não suportado.',
          confidence: 0,
          debug: {
            extractedLength: textToAnalyze.length,
            sample: textToAnalyze.substring(0, 200)
          }
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
      
      // Fallback para extração básica
      const basicInfo = extractBasicInfo(textToAnalyze);
      aiAnalysis = {
        name: basicInfo.name || '',
        email: basicInfo.email || '',
        phone: basicInfo.phone || '',
        experience: '',
        skills: [],
        education: ''
      };
    }
    
    // Calcular confiança baseada nos campos preenchidos
    let confidence = 0;
    if (aiAnalysis.name && aiAnalysis.name.trim() && aiAnalysis.name.length > 2) confidence += 30;
    if (aiAnalysis.email && aiAnalysis.email.includes('@') && aiAnalysis.email.length > 5) confidence += 25;
    if (aiAnalysis.phone && aiAnalysis.phone.trim() && aiAnalysis.phone.length > 3) confidence += 25;
    if (aiAnalysis.experience && aiAnalysis.experience.trim() && aiAnalysis.experience.length > 5) confidence += 10;
    if (aiAnalysis.skills && Array.isArray(aiAnalysis.skills) && aiAnalysis.skills.length > 0) confidence += 10;
    if (aiAnalysis.education && aiAnalysis.education.trim() && aiAnalysis.education.length > 3) confidence += 5;

    console.log('Dados extraídos:', aiAnalysis);
    console.log('Confiança calculada:', confidence);

    return new Response(
      JSON.stringify({
        success: true,
        data: aiAnalysis,
        confidence: confidence,
        debug: {
          extractedTextLength: textToAnalyze.length,
          extractedTextSample: textToAnalyze.substring(0, 300)
        }
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