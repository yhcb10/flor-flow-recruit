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
    
    // Método 1: Procurar por texto simples entre parênteses
    const textPattern = /\(([^)]+)\)/g;
    const foundTexts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(binaryString)) !== null) {
      const text = match[1];
      
      // Filtrar apenas texto que parece real (não metadados)
      if (text.length > 1 && 
          /[a-zA-ZÀ-ÿ0-9@.]/.test(text) &&
          !text.match(/^(obj|stream|endstream|BT|ET|Tj|TJ)$/i)) {
        foundTexts.push(text);
      }
    }
    
    // Método 2: Procurar por padrões específicos (email e telefone)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g;
    
    let emailMatch = binaryString.match(emailPattern);
    let phoneMatch = binaryString.match(phonePattern);
    
    if (emailMatch) foundTexts.push(...emailMatch);
    if (phoneMatch) foundTexts.push(...phoneMatch);
    
    // Juntar todo o texto encontrado
    const allText = foundTexts.join(' ');
    
    console.log('Texto bruto extraído:', allText.substring(0, 500));
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

  const prompt = `Analise este texto de currículo e extraia APENAS:

TEXTO:
${textContent}

Procure especificamente por:
1. NOME COMPLETO (ex: João Silva, Maria Santos)
2. EMAIL (formato: xxx@xxx.com - procure por @)
3. TELEFONE (formato brasileiro: (11) 99999-9999)
4. OBSERVAÇÕES (resumo da experiência em 1-2 linhas)

MUITO IMPORTANTE:
- Se não encontrar email, retorne string vazia
- Se não encontrar telefone, retorne string vazia
- NÃO invente informações

Retorne apenas este JSON limpo:
{
  "name": "Nome encontrado",
  "email": "email@encontrado.com",
  "phone": "(XX) XXXXX-XXXX",
  "observations": "Breve resumo da experiência"
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
            content: 'Você extrai informações de currículos. Seja MUITO cuidadoso com emails e telefones. Se não tiver certeza, deixe vazio. Retorne apenas JSON limpo sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0, // Zero criatividade
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('Resposta bruta da IA:', aiResponse);
    
    // Extrair JSON da resposta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log('Dados extraídos pela IA:', result);
    
    return {
      name: result.name || '',
      email: result.email || '',
      phone: result.phone || '',
      observations: result.observations || ''
    };
    
  } catch (error) {
    console.error('Erro na IA:', error);
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