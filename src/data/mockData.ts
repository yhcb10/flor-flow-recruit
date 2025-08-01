import { Candidate, JobPosition, KanbanColumn, CandidateStage } from '@/types/recruitment';

export const mockJobPositions: JobPosition[] = [
  {
    id: '1',
    title: 'Florista Especializada',
    department: 'Produção',
    description: 'Profissional responsável pela criação e montagem de arranjos florais para cerimônias de despedida, demonstrando sensibilidade e técnica refinada.',
    requirements: [
      'Experiência em floricultura ou áreas relacionadas',
      'Sensibilidade para trabalhar com famílias em luto',
      'Habilidades manuais e criativas',
      'Disponibilidade para horários flexíveis'
    ],
    responsibilities: [
      'Criar arranjos florais únicos e respeitosos',
      'Atender famílias com empatia e profissionalismo',
      'Manter a qualidade e frescor das flores',
      'Coordenar com equipe de entrega'
    ],
    culturalValues: [
      'Respeito e dignidade',
      'Sensibilidade emocional',
      'Excelência no atendimento',
      'Trabalho em equipe'
    ],
    minimumQualification: 'Ensino médio completo',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    createdBy: 'Ana Santos - RH',
    targetHires: 2
  }
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
      strengths: [
        'Experiência de 3 anos em floricultura',
        'Curso técnico em arranjos florais',
        'Experiência anterior em funerária'
      ],
      weaknesses: [
        'Sem experiência em vendas',
        'Disponibilidade limitada aos fins de semana'
      ],
      recommendation: 'advance',
      reasoning: 'Candidata com perfil técnico sólido e experiência relevante no setor. A experiência anterior em funerária demonstra sensibilidade para o ambiente.',
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
      strengths: [
        'Formação em Design',
        'Experiência em atendimento ao cliente',
        'Portfólio criativo'
      ],
      weaknesses: [
        'Sem experiência específica em floricultura',
        'Pouca experiência em ambientes sensíveis'
      ],
      recommendation: 'review',
      reasoning: 'Candidato criativo com bom potencial, mas necessita treinamento específico para o ambiente funerário.',
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
      strengths: [
        'Graduação em Biologia',
        '5 anos de experiência em floricultura',
        'Certificação em arranjos funerários',
        'Experiência prévia em ambiente hospitalar'
      ],
      weaknesses: [
        'Mora longe da empresa'
      ],
      recommendation: 'advance',
      reasoning: 'Candidata excepcional com formação técnica sólida e experiência específica. Demonstra sensibilidade necessária para o ambiente.',
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