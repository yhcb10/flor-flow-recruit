import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função para converter PDF para PNG usando jsPDF ou similar
async function convertPDFToImage(base64Data: string): Promise<string> {
  try {
    console.log('🖼️ Convertendo PDF para imagem...');
    
    // Usar PDF-lib para converter primeira página em imagem
    const response = await fetch('https://api.cloudconvert.com/v2/convert', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your_api_key_here',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'base64',
        inputformat: 'pdf',
        outputformat: 'png',
        file: base64Data
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.output;
    }
    
    throw new Error('Conversão falhou');
    
  } catch (error) {
    console.log('❌ Conversão PDF→Imagem falhou:', error.message);
    throw error;
  }
}

// Função robusta para extrair dados diretamente do PDF
function extractDataFromPDFBinary(base64Data: string) {
  try {
    console.log('🔍 Extraindo dados diretamente do binário PDF...');
    
    const binaryData = atob(base64Data);
    const result = {
      name: '',
      email: '',
      phone: '',
      observations: ''
    };
    
    // 1. Extrair emails com regex mais precisa
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    ];
    
    let emails = [];
    for (const pattern of emailPatterns) {
      const matches = binaryData.match(pattern) || [];
      emails.push(...matches);
    }
    
    // Filtrar emails válidos
    const validEmails = emails.filter(email => {
      return email &&
             email.length > 5 &&
             email.length < 100 &&
             !email.includes('example') &&
             !email.includes('test') &&
             !email.includes('domain') &&
             /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    });
    
    if (validEmails.length > 0) {
      result.email = validEmails[0];
      console.log('📧 Email encontrado:', result.email);
    }
    
    // 2. Extrair telefones brasileiros
    const phonePatterns = [
      /\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g,
      /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g,
      /\d{2}\s+\d{4,5}[-\s]?\d{4}/g,
      /\d{2}\d{4,5}\d{4}/g
    ];
    
    let phones = [];
    for (const pattern of phonePatterns) {
      const matches = binaryData.match(pattern) || [];
      phones.push(...matches);
    }
    
    // Filtrar telefones válidos
    const validPhones = phones.filter(phone => {
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 10 && 
             digits.length <= 13 && 
             !digits.startsWith('0000') &&
             !digits.startsWith('1111') &&
             parseInt(digits.substring(0, 2)) >= 11 && 
             parseInt(digits.substring(0, 2)) <= 99;
    });
    
    if (validPhones.length > 0) {
      result.phone = validPhones[0];
      console.log('📱 Telefone encontrado:', result.phone);
    }
    
    // 3. Extrair nomes usando múltiplas estratégias
    const nameStrategies = [
      // Estratégia 1: Nomes em comandos de texto PDF
      () => {
        const textCommands = binaryData.match(/\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\)\s*Tj/g) || [];
        return textCommands.map(cmd => cmd.match(/\((.+?)\)/)[1]);
      },
      
      // Estratégia 2: Nomes em formato de título
      () => {
        const titlePattern = /([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/g;
        const matches = binaryData.match(titlePattern) || [];
        return matches.filter(name => 
          name.length > 5 && 
          name.length < 50 &&
          !/(PDF|FONT|TYPE|STREAM|OBJECT|PAGE|ROOT|INFO|CREATOR|PRODUCER|GOOGLE|DOCS|RENDERER)/i.test(name)
        );
      },
      
      // Estratégia 3: Nomes em formato normal
      () => {
        const normalPattern = /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g;
        const matches = binaryData.match(normalPattern) || [];
        return matches.filter(name => 
          name.length > 5 && 
          name.length < 50 &&
          !/^(Google Docs|Adobe|Microsoft|Windows|Linux|Android|iPhone)/i.test(name)
        );
      }
    ];
    
    // Tentar cada estratégia até encontrar um nome válido
    for (const strategy of nameStrategies) {
      try {
        const names = strategy();
        if (names && names.length > 0) {
          const bestName = names.find(name => 
            name.split(' ').length >= 2 && 
            name.split(' ').length <= 4 &&
            !/^(CURRICULO|RESUME|CV|DOCUMENTO|EXPERIENCIA|FORMACAO|CONTATO)/i.test(name)
          );
          
          if (bestName) {
            result.name = bestName.trim();
            console.log('👤 Nome encontrado:', result.name);
            break;
          }
        }
      } catch (error) {
        console.log('❌ Estratégia de nome falhou:', error.message);
        continue;
      }
    }
    
    // 4. Gerar observações baseadas nos dados encontrados
    if (result.email || result.phone || result.name) {
      const parts = [];
      if (result.name) parts.push(`Candidato: ${result.name}`);
      if (result.email) parts.push(`Email de contato disponível`);
      if (result.phone) parts.push(`Telefone de contato disponível`);
      parts.push('Currículo processado com sucesso');
      result.observations = parts.join('. ') + '.';
    } else {
      result.observations = 'Currículo processado. Dados de contato podem estar em formato não reconhecido.';
    }
    
    console.log('✅ Extração concluída:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Erro na extração binária:', error);
    return {
      name: '',
      email: '',
      phone: '',
      observations: 'Erro no processamento do currículo.'
    };
  }
}

// Função para usar ChatGPT como análise de texto simples
async function analyzeWithTextGPT(extractedData: any): Promise<any> {
  if (!openAIApiKey || (!extractedData.email && !extractedData.phone && !extractedData.name)) {
    return extractedData;
  }

  try {
    console.log('🤖 Melhorando extração com ChatGPT...');
    
    const prompt = `Baseado nos seguintes dados extraídos de um currículo, melhore e valide as informações:

Nome encontrado: ${extractedData.name || 'Não encontrado'}
Email encontrado: ${extractedData.email || 'Não encontrado'}
Telefone encontrado: ${extractedData.phone || 'Não encontrado'}

Tarefas:
1. Se o nome parecer estar em MAIÚSCULAS, converta para formato adequado (Primeira Letra Maiúscula)
2. Valide se o email está correto
3. Valide se o telefone tem formato brasileiro válido
4. Crie uma observação profissional sobre o candidato

Retorne apenas:
Nome: [nome corrigido]
Email: [email validado]
Telefone: [telefone validado]
Observações: [observação profissional]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const aiText = data.choices[0].message.content;
      
      // Parse simples da resposta
      const lines = aiText.split('\n');
      const improved = { ...extractedData };
      
      for (const line of lines) {
        if (line.includes('Nome:') && line.split('Nome:')[1]?.trim()) {
          improved.name = line.split('Nome:')[1].trim();
        }
        if (line.includes('Email:') && line.split('Email:')[1]?.trim()) {
          improved.email = line.split('Email:')[1].trim();
        }
        if (line.includes('Telefone:') && line.split('Telefone:')[1]?.trim()) {
          improved.phone = line.split('Telefone:')[1].trim();
        }
        if (line.includes('Observações:') && line.split('Observações:')[1]?.trim()) {
          improved.observations = line.split('Observações:')[1].trim();
        }
      }
      
      console.log('✅ Dados melhorados pela IA:', improved);
      return improved;
    }
    
  } catch (error) {
    console.log('❌ Melhoria com ChatGPT falhou:', error.message);
  }
  
  return extractedData;
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

    // Extrair dados diretamente do PDF
    let candidateInfo = extractDataFromPDFBinary(pdfData);
    
    // Melhorar com ChatGPT se possível
    candidateInfo = await analyzeWithTextGPT(candidateInfo);
    
    // Calcular confiança
    let confidence = 0;
    if (candidateInfo.name && candidateInfo.name.length > 3 && candidateInfo.name !== 'Google Docs Renderer') confidence += 30;
    if (candidateInfo.email && candidateInfo.email.includes('@') && candidateInfo.email.includes('.')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8 && !candidateInfo.phone.startsWith('0000')) confidence += 30;
    if (candidateInfo.observations && candidateInfo.observations.length > 20) confidence += 5;

    console.log('🎯 Confiança final:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence,
        method: 'Extração Binária Robusta + IA'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro final:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Erro no processamento: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});