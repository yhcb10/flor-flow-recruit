import { Candidate, JobPosition, KanbanColumn, CandidateStage } from '@/types/recruitment';
import { analistaIAPosition } from './newPositions';

export const mockJobPositions: JobPosition[] = [
  {
    id: '1',
    title: 'Vendedor',
    department: 'Vendas',
    description: 'Vendedor presencial para atendimento ativo e receptivo via telefone e WhatsApp na Barra Funda - SP',
    requirements: [
      'Ensino Médio completo',
      'Experiência em call center de vendas com metas',
      'Boa digitação',
      'Domínio da norma culta da língua portuguesa',
      'Disponibilidade para escala 12x36'
    ],
    responsibilities: [
      'Atendimento ativo e receptivo via telefone e WhatsApp',
      'Apresentação de soluções com empatia, clareza e foco em conversão',
      'Negociação com agilidade e orientação para metas',
      'Registro de atendimentos no CRM',
      'Comunicação profissional e eficaz durante todo o processo'
    ],
    culturalValues: [
      'Agilidade para múltiplas demandas',
      'Comunicação verbal e escrita',
      'Organização sob pressão',
      'Postura consultiva e foco em resultado',
      'Resiliência e senso de urgência'
    ],
    minimumQualification: 'Ensino médio completo',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    createdBy: 'Ana Santos - RH',
    targetHires: 2,
    endpointId: 'vendedor_001',
    aiAnalysisPrompt: `🧠 Prompt Personalizado GPT – Avaliador de Currículos: Vaga de Vendedor (Barra Funda – SP)

🎯 OBJETIVO GERAL
Você é um avaliador inteligente de currículos, especializado em identificar candidatos ideais para uma vaga de vendedor presencial, com base em critérios técnicos, comportamentais, experienciais e de compatibilidade com a cultura e as demandas da função.

Seu papel é ler atentamente cada currículo enviado, analisar todas as informações disponíveis, pontuar o candidato de forma justa e estruturada com base em critérios objetivos definidos previamente, verificar a adequação ao perfil etário desejado, e recomendar ou não o candidato para entrevista, justificando com base em dados reais.

📌 SOBRE A VAGA
🧾 Informações Gerais
Cargo: Vendedor
Local: Barra Funda – São Paulo (presencial)
Salário fixo: R$ 2.335,00
Comissão média: R$ 1.400,00
Ganhos médios mensais: R$ 3.735,00
Escala: 12x36
Idade preferencial: 20 a 30 anos

🧩 Responsabilidades
Atendimento ativo e receptivo via telefone e WhatsApp
Apresentação de soluções com empatia, clareza e foco em conversão
Negociação com agilidade e orientação para metas
Registro de atendimentos no CRM
Comunicação profissional e eficaz durante todo o processo

💡 Competências Comportamentais Esperadas
Agilidade para múltiplas demandas
Comunicação verbal e escrita
Organização sob pressão
Postura consultiva e foco em resultado
Resiliência e senso de urgência

🧠 Experiências Desejadas
Call center de vendas com metas
Vendas por telefone ou WhatsApp
Uso de CRM e ambiente digital

🎓 Qualificação Mínima
Ensino Médio completo
Boa digitação
Domínio da norma culta da língua portuguesa
Disponibilidade para escala mencionada, inclusive fins de semana e feriados

🧬 Mindset Esperado
Proatividade
Mentalidade de dono
Foco em conversão
Organização

📊 CRITÉRIOS DE AVALIAÇÃO (TOTAL BASE: 8 PONTOS)
1. Experiência Profissional (4 pontos): Vendas por telefone/WhatsApp, call center com metas, uso de CRM, ambiente digital
2. Habilidades Técnicas (2 pontos): Boa digitação, português correto, domínio de sistemas digitais (CRM, planilhas, etc.)
3. Competências Comportamentais (1 ponto): Comunicação, empatia, agilidade, resiliência, organização
4. Formação Acadêmica (1 ponto): Ensino Médio completo (obrigatório). Técnicos ou superiores são diferenciais, mas não somam pontos

🌟 DIFERENCIAIS (PONTUAÇÃO EXTRA: 0 a 2 PONTOS)
Apenas atribua nota entre 9 e 10 se o candidato atender 100% dos requisitos obrigatórios e apresentar pelo menos 2 diferenciais abaixo:
- Experiência com metas agressivas e histórico de performance
- Uso recorrente e declarado de CRM
- Vendas por WhatsApp com foco consultivo
- Certificações, cursos de vendas ou atendimento
- Promoções ou reconhecimentos anteriores
- Demonstração clara de foco em resultado, mentalidade de dono ou liderança informal

🚫 ITENS NÃO PONTUÁVEIS (MAS DEVEM SER OBSERVADOS)
Pretensão Salarial: Deve ser até R$ 3.735,00. Se superior, destaque como ponto de atenção.
Localização / Disponibilidade para Escala 12x36: Deve residir em SP ou região com fácil acesso à Barra Funda. Se não for o caso, destaque como ponto de atenção.
Idade: O perfil desejado está entre 20 e 30 anos. Caso o currículo contenha idade ou data de nascimento que indiquem idade fora desse intervalo, sinalize como desclassificado para entrevista e mostre o porquê, se não houver esses dados sinalize como ponto de atenção.

⚠️ Não penalize a nota com base na idade.

✅ CRITÉRIO DE APROVAÇÃO PARA ENTREVISTA
Apenas candidatos com nota final igual ou superior a 6.5/10 devem ser recomendados para entrevista.
Candidatos abaixo dessa nota devem ser marcados como "Não recomendados neste momento".

🧾 FORMATO DE RESPOSTA
📄 Candidato Avaliado
Nome: [Nome completo do candidato]
Telefone: [Número de contato]
Nota final: [X.X]/10

🔍 Avaliação Detalhada
Experiência Profissional: X/4
Habilidades Técnicas: X/2
Competências Comportamentais: X/1
Formação Acadêmica: X/1
Diferenciais relevantes: X/2

✅ Pontos Fortes:
- [Exemplo: Experiência sólida com vendas por WhatsApp em call center]
- [Exemplo: Comunicação clara, proatividade e uso de CRM]

⚠️ Pontos de Atenção:
- Pretensão salarial: [Exemplo: R$ 4.200,00 – acima da faixa desejada]
- Localização: [Exemplo: Mora em Guarulhos – verificar viabilidade logística]
- Idade estimada: [Exemplo: Provável idade acima do intervalo (baseado em datas de experiência)]

📌 Recomendação Final:
✅ Aprovado para entrevista ou ❌ Não recomendado neste momento

Resumo Profissional:
[Texto de 3 a 5 linhas com os principais pontos da trajetória profissional, perfil técnico e potencial do candidato]

⚠️ CONDUTA DO GPT
Seja criterioso e profissional.
Não presuma informações não mencionadas.
Faça o melhor julgamento possível com base no conteúdo real do currículo.
Nunca aprove currículos com nota inferior a 6.5.
Nunca atribua nota 10 a candidatos que não atendam 100% dos obrigatórios + diferenciais.
Sempre destaque idade estimada fora do intervalo, pretensão acima do teto e localização desfavorável, mas não reduza pontos por esses motivos.`
  },
  {
    id: 'gestor-ads',
    title: 'Gestor de Ads',
    department: 'Marketing',
    description: 'Gestor de campanhas de Google Ads e Facebook Ads para maximizar ROI e conversões',
    requirements: [
      'Superior completo em Marketing, Publicidade ou áreas afins',
      'Experiência mínima de 2 anos com Google Ads',
      'Experiência com Facebook Ads e Instagram Ads',
      'Conhecimento em Google Analytics e ferramentas de análise',
      'Certificações Google Ads (preferencial)'
    ],
    responsibilities: [
      'Criação e otimização de campanhas no Google Ads',
      'Gestão de campanhas em redes sociais (Facebook, Instagram)',
      'Análise de métricas e relatórios de performance',
      'Otimização de ROI e redução de CPA',
      'Definição de públicos-alvo e segmentações',
      'Acompanhamento de tendências e melhores práticas'
    ],
    culturalValues: [
      'Foco em resultados e métricas',
      'Pensamento analítico e estratégico',
      'Capacidade de adaptação rápida',
      'Criatividade para testes e otimizações',
      'Transparência na comunicação de resultados'
    ],
    minimumQualification: 'Superior completo',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    createdBy: 'RH - Recursos Humanos',
    targetHires: 1,
    endpointId: 'gestor_ads_001',
    aiAnalysisPrompt: `🧠 Avaliador IA - Gestor de Ads

🎯 OBJETIVO
Avaliar candidatos para posição de Gestor de Ads com foco em performance digital e ROI.

📌 VAGA: GESTOR DE ADS
🏢 Empresa: Coroa de Flores Nobre
💰 Salário: R$ 4.500 - R$ 6.500 + bonificação por performance
📍 Local: São Paulo - SP (Híbrido)
⏰ Jornada: Segunda a sexta, 8h às 18h

🎯 RESPONSABILIDADES PRINCIPAIS
- Gestão completa de campanhas Google Ads
- Otimização de campanhas Facebook/Instagram Ads
- Análise de métricas e ROI
- Criação de estratégias de segmentação
- Relatórios de performance detalhados

📊 CRITÉRIOS DE AVALIAÇÃO (0-10 pontos)

1. EXPERIÊNCIA COM ADS (0-4 pontos)
- Google Ads: Criação, otimização, análise
- Facebook/Instagram Ads: Gestão de campanhas
- Histórico de resultados comprovados
- Tempo de experiência (mín. 2 anos)

2. CONHECIMENTOS TÉCNICOS (0-2 pontos)
- Google Analytics e ferramentas de análise
- Pixel do Facebook, conversões, eventos
- Conhecimento de funis de vendas
- Excel/Planilhas avançado

3. CERTIFICAÇÕES E FORMAÇÃO (0-2 pontos)
- Superior completo (obrigatório)
- Certificações Google Ads
- Cursos especializados em marketing digital
- Certificações Facebook Blueprint

4. COMPETÊNCIAS COMPORTAMENTAIS (0-2 pontos)
- Foco em resultados e métricas
- Capacidade analítica
- Organização e gestão de múltiplas campanhas
- Comunicação clara de resultados

🌟 DIFERENCIAIS EXTRAS (+1 a +2 pontos)
- Experiência com e-commerce
- Conhecimento de outras plataformas (LinkedIn, TikTok)
- Experiência com automação de marketing
- Gestão de equipe ou freelancers
- Portfolio com cases de sucesso

✅ CRITÉRIO DE APROVAÇÃO
Nota mínima: 7.0/10 para aprovação
Foco especial em experiência prática e resultados

🎯 PERFIL IDEAL
Profissional analítico, focado em resultados, com experiência sólida em gestão de campanhas pagas e capacidade de otimizar constantemente para melhor ROI.`
  },
  analistaIAPosition
];

export const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-9999',
    positionId: '1',
    source: 'indeed',
    stage: 'analise_ia',
    aiAnalysis: {
      score: 8.5,
      experienciaProfissional: 4,
      habilidadesTecnicas: 2,
      competenciasComportamentais: 1,
      formacaoAcademica: 1,
      diferenciaisRelevantes: 1,
      pontoFortes: [
        'Experiência de 3 anos em floricultura',
        'Curso técnico em arranjos florais',
        'Experiência anterior em funerária'
      ],
      pontosAtencao: [
        'Sem experiência em vendas',
        'Disponibilidade limitada aos fins de semana'
      ],
      recommendation: 'advance',
      reasoning: 'Candidata com perfil técnico sólido e experiência relevante no setor. A experiência anterior em funerária demonstra sensibilidade para o ambiente.',
      recomendacaoFinal: 'aprovado',
      analyzedAt: new Date('2024-01-20')
    },
    notes: [
      {
        id: '1',
        content: 'Candidata demonstrou muito interesse na vaga durante contato inicial.',
        authorId: '1',
        authorName: 'Ana Santos',
        createdAt: new Date('2024-01-20'),
        type: 'general'
      }
    ],
    interviews: [],
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'João Santos',
    email: 'joao.santos@email.com',
    phone: '(11) 88888-8888',
    positionId: '1',
    source: 'manual',
    stage: 'selecao_pre_entrevista',
    aiAnalysis: {
      score: 7.2,
      experienciaProfissional: 3,
      habilidadesTecnicas: 2,
      competenciasComportamentais: 1,
      formacaoAcademica: 1,
      diferenciaisRelevantes: 0,
      pontoFortes: [
        'Formação em Design',
        'Experiência em atendimento ao cliente',
        'Portfólio criativo'
      ],
      pontosAtencao: [
        'Sem experiência específica em floricultura',
        'Pouca experiência em ambientes sensíveis'
      ],
      recommendation: 'review',
      reasoning: 'Candidato criativo com bom potencial, mas necessita treinamento específico para o ambiente funerário.',
      recomendacaoFinal: 'aprovado',
      analyzedAt: new Date('2024-01-19')
    },
    notes: [],
    interviews: [],
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: '3',
    name: 'Ana Paula Costa',
    email: 'ana.costa@email.com',
    phone: '(11) 77777-7777',
    positionId: '1',
    source: 'indeed',
    stage: 'pre_entrevista',
    aiAnalysis: {
      score: 9.1,
      experienciaProfissional: 4,
      habilidadesTecnicas: 2,
      competenciasComportamentais: 1,
      formacaoAcademica: 1,
      diferenciaisRelevantes: 2,
      pontoFortes: [
        'Graduação em Biologia',
        '5 anos de experiência em floricultura',
        'Certificação em arranjos funerários',
        'Experiência prévia em ambiente hospitalar'
      ],
      pontosAtencao: [
        'Mora longe da empresa'
      ],
      recommendation: 'advance',
      reasoning: 'Candidata excepcional com formação técnica sólida e experiência específica. Demonstra sensibilidade necessária para o ambiente.',
      recomendacaoFinal: 'aprovado',
      analyzedAt: new Date('2024-01-16')
    },
    notes: [
      {
        id: '2',
        content: 'Candidata aprovada para pré-entrevista. Agendamento para terça-feira às 14h.',
        authorId: '1',
        authorName: 'Ana Santos',
        createdAt: new Date('2024-01-21'),
        type: 'hr_review'
      }
    ],
    interviews: [
      {
        id: '1',
        type: 'pre_interview',
        scheduledAt: new Date('2024-01-25T14:00:00'),
        duration: 45,
        meetingUrl: 'https://meet.google.com/abc-def-ghi',
        interviewerIds: ['1'],
        status: 'scheduled'
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-21')
  }
];

export const kanbanColumns: KanbanColumn[] = [
  {
    id: 'nova_candidatura',
    title: 'Nova Candidatura',
    description: 'Candidatos recém inscritos',
    color: 'bg-status-new',
    candidates: [],
    allowedTransitions: ['analise_ia', 'nao_aprovado']
  },
  {
    id: 'analise_ia',
    title: 'Análise IA',
    description: 'Em avaliação automática',
    color: 'bg-status-analysis',
    candidates: [],
    allowedTransitions: ['selecao_pre_entrevista', 'nao_aprovado']
  },
  {
    id: 'selecao_pre_entrevista',
    title: 'Seleção Pré Entrevista',
    description: 'Análise manual do RH',
    color: 'bg-accent',
    candidates: [],
    allowedTransitions: ['pre_entrevista', 'nao_aprovado']
  },
  {
    id: 'pre_entrevista',
    title: 'Pré-entrevista',
    description: 'Entrevista online agendada',
    color: 'bg-status-interview',
    candidates: [],
    allowedTransitions: ['aguardando_feedback_pre_entrevista', 'nao_aprovado']
  },
  {
    id: 'aguardando_feedback_pre_entrevista',
    title: 'Aguardando Feedback',
    description: 'Aguardando retorno pós pré-entrevista',
    color: 'bg-status-pre-interview',
    candidates: [],
    allowedTransitions: ['selecao_entrevista_presencial', 'nao_aprovado']
  },
  {
    id: 'selecao_entrevista_presencial',
    title: 'Seleção Entrevista Presencial',
    description: 'Avaliação para entrevista presencial',
    color: 'bg-accent/80',
    candidates: [],
    allowedTransitions: ['entrevista_presencial', 'nao_aprovado']
  },
  {
    id: 'entrevista_presencial',
    title: 'Entrevista Presencial',
    description: 'Entrevista final presencial',
    color: 'bg-status-interview',
    candidates: [],
    allowedTransitions: ['aprovado', 'nao_aprovado']
  },
  {
    id: 'aprovado',
    title: 'Aprovado',
    description: 'Candidatos selecionados',
    color: 'bg-status-approved',
    candidates: [],
    allowedTransitions: ['banco_talentos']
  },
  {
    id: 'nao_aprovado',
    title: 'Não Aprovado',
    description: 'Candidatos não selecionados',
    color: 'bg-status-rejected',
    candidates: [],
    allowedTransitions: ['banco_talentos']
  },
  {
    id: 'banco_talentos',
    title: 'Banco de Talentos',
    description: 'Candidatos com potencial para futuras oportunidades',
    color: 'bg-status-talent-bank',
    candidates: [],
    allowedTransitions: []
  }
];