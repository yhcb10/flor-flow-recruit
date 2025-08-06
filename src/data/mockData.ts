import { Candidate, JobPosition, KanbanColumn, CandidateStage } from '@/types/recruitment';

export const gestorAdsJobPosition: JobPosition = {
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
};

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
    stage: 'selecao_rh',
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
    allowedTransitions: ['selecao_rh', 'nao_aprovado']
  },
  {
    id: 'selecao_rh',
    title: 'Seleção RH',
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
    allowedTransitions: []
  },
  {
    id: 'nao_aprovado',
    title: 'Não Aprovado',
    description: 'Candidatos não selecionados',
    color: 'bg-status-rejected',
    candidates: [],
    allowedTransitions: []
  }
];