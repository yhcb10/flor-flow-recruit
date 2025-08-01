import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, resumeText } = await req.json();

    // Simulação de extração de dados do currículo
    // Em produção, aqui você integraria com uma API de OCR ou processamento de PDF
    console.log('Processing resume:', resumeUrl);

    // Análise básica de texto do currículo para extrair informações
    const extractedData = analyzeResumeText(resumeText || '');

    return new Response(
      JSON.stringify(extractedData),
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
      JSON.stringify({ error: 'Failed to process resume' }),
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

function analyzeResumeText(text: string) {
  const extractedInfo = {
    name: '',
    email: '',
    phone: '',
    experience: '',
    skills: [] as string[],
    education: '',
  };

  // Regex patterns para extrair informações
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(?:\+55\s?)?(?:\(?(?:11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|86|87|88|89|91|92|93|94|95|96|97|98|99)\)?\s?)?(?:9\s?)?[0-9]{4}[\s-]?[0-9]{4}/;

  // Extrair email
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    extractedInfo.email = emailMatch[0];
  }

  // Extrair telefone
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    extractedInfo.phone = phoneMatch[0];
  }

  // Extrair nome (primeira linha que não seja email/telefone e tenha entre 2-4 palavras)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  for (const line of lines) {
    const words = line.split(' ').filter(word => word.length > 1);
    if (words.length >= 2 && words.length <= 4 && 
        !emailRegex.test(line) && !phoneRegex.test(line) &&
        !line.toLowerCase().includes('currículo') &&
        !line.toLowerCase().includes('cv') &&
        !line.toLowerCase().includes('resumo')) {
      extractedInfo.name = line;
      break;
    }
  }

  // Extrair experiência (anos)
  const experienceRegex = /(\d+)\s*(?:anos?|years?)\s*(?:de\s*)?(?:experiência|experience)/i;
  const expMatch = text.match(experienceRegex);
  if (expMatch) {
    extractedInfo.experience = `${expMatch[1]} anos de experiência`;
  }

  // Extrair habilidades relacionadas a floricultura
  const floricultySkills = [
    'arranjos florais', 'decoração', 'floricultura', 'jardinagem',
    'paisagismo', 'plantas', 'flores', 'eventos', 'casamentos',
    'buquês', 'coroas', 'ornamentação', 'atendimento', 'vendas',
    'ikebana', 'composições florais'
  ];

  const textLower = text.toLowerCase();
  const foundSkills = floricultySkills.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  extractedInfo.skills = foundSkills;

  // Extrair educação básica
  const educationKeywords = ['superior', 'graduação', 'ensino médio', 'técnico', 'curso'];
  for (const keyword of educationKeywords) {
    if (textLower.includes(keyword)) {
      const sentences = text.split('.').filter(sentence => 
        sentence.toLowerCase().includes(keyword)
      );
      if (sentences.length > 0) {
        extractedInfo.education = sentences[0].trim();
        break;
      }
    }
  }

  return {
    success: true,
    data: extractedInfo,
    confidence: calculateConfidence(extractedInfo)
  };
}

function calculateConfidence(data: any): number {
  let score = 0;
  if (data.name) score += 30;
  if (data.email) score += 25;
  if (data.phone) score += 25;
  if (data.experience) score += 10;
  if (data.skills.length > 0) score += 10;
  return score;
}