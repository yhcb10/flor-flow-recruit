import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Função simplificada para extrair texto bruto do PDF
async function extractRawTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    let allText = '';
    
    // Método 1: Buscar diretamente por email e telefone no binário
    const emailMatches = binaryString.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phoneMatches = binaryString.match(/\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g) || [];
    
    console.log('📧 Emails encontrados no binário:', emailMatches);
    console.log('📱 Telefones encontrados no binário:', phoneMatches);
    
    // Método 2: Extrair texto entre parênteses (formato PDF comum)
    const textPattern = /\(([^)]+)\)/g;
    const foundTexts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(binaryString)) !== null) {
      const text = match[1];
      
      // Filtrar apenas texto que parece real
      if (text.length > 1 && 
          /[a-zA-ZÀ-ÿ0-9@.-]/.test(text) &&
          !text.match(/^(obj|stream|endstream|BT|ET|Tj|TJ|Type|Font|Width|Height|Length|Filter|FormType|BBox|Resources|Group|Transparency|ProcSet|Image|ColorSpace|Interpolate)$/i)) {
        foundTexts.push(text);
      }
    }
    
    // Combinar tudo
    allText = [...emailMatches, ...phoneMatches, ...foundTexts].join(' ');
    
    console.log('📄 Texto completo extraído:', allText.substring(0, 800));
    return allText;
    
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    return '';
  }
}

// Função super simples para IA analisar
async function analyzeWithAI(textContent: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const prompt = `Você é um especialista em análise de currículos. Analise este texto e extraia as informações de contato.

TEXTO COMPLETO DO CURRÍCULO:
${textContent}

INSTRUÇÕES ESPECÍFICAS:
1. PROCURE CUIDADOSAMENTE por email no formato xxx@xxx.com (pode estar em qualquer lugar)
2. PROCURE por telefone brasileiro no formato (XX) XXXXX-XXXX 
3. PROCURE pelo nome da pessoa (geralmente no início)
4. Faça um resumo da experiência profissional

EXEMPLO DO QUE VOCÊ DEVE ENCONTRAR:
- Email: aurelio.sodre.ar@gmail.com
- Telefone: (11) 97665-2685  
- Nome: AURELIO RODRIGUES

MUITO IMPORTANTE:
- Leia TODO o texto palavra por palavra
- Procure especificamente por @ para encontrar email
- Procure por números entre parênteses para telefone
- Se não encontrar, retorne string vazia (não invente)

Retorne APENAS este JSON:
{
  "name": "Nome encontrado",
  "email": "email@encontrado.com",
  "phone": "(XX) XXXXX-XXXX",
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
            content: 'Você é um especialista em extrair informações de currículos. Seja EXTREMAMENTE cuidadoso ao procurar emails (com @) e telefones brasileiros. Leia palavra por palavra. Se não encontrar com certeza, deixe vazio. Retorne apenas JSON limpo.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0, // Zero criatividade
        max_tokens: 800,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('🤖 Resposta bruta da IA:', aiResponse);
    
    // Extrair JSON da resposta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log('✅ Dados finais extraídos:', result);
    
    // Validação extra - verificar se email tem @ e se telefone tem formato correto
    if (result.email && !result.email.includes('@')) {
      console.warn('⚠️ Email inválido detectado, removendo:', result.email);
      result.email = '';
    }
    
    if (result.phone && !/\(\d{2}\)/.test(result.phone)) {
      console.warn('⚠️ Telefone com formato inválido:', result.phone);
      // Não remover, apenas avisar
    }
    
    return {
      name: result.name || '',
      email: result.email || '',
      phone: result.phone || '',
      observations: result.observations || ''
    };
    
  } catch (error) {
    console.error('❌ Erro na IA:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData, fileName } = await req.json();
    console.log('📄 Processando:', fileName);

    if (!pdfData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF não fornecido' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extrair texto bruto
    const rawText = await extractRawTextFromPDF(pdfData);
    
    if (!rawText || rawText.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto do PDF' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Analisar com IA
    const candidateInfo = await analyzeWithAI(rawText);
    
    // Calcular confiança simples
    let confidence = 0;
    if (candidateInfo.name) confidence += 25;
    if (candidateInfo.email && candidateInfo.email.includes('@')) confidence += 35;
    if (candidateInfo.phone && candidateInfo.phone.length > 8) confidence += 35;
    if (candidateInfo.observations) confidence += 5;

    console.log('✅ Resultado final:', candidateInfo);
    console.log('📊 Confiança:', confidence + '%');

    return new Response(
      JSON.stringify({
        success: true,
        data: candidateInfo,
        confidence: confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});