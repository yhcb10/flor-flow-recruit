export interface JobPosition {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  culturalValues: string[];
  minimumQualification: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  createdAt: Date;
  createdBy: string;
  targetHires: number;
  endpointId?: string; // ID único para o endpoint N8N
  aiAnalysisPrompt?: string;
  // Campos específicos do formulário
  salarioFixo?: string;
  escala?: string;
  idadePreferencial?: string;
  competenciasComportamentais?: string;
  experienciasDesejadas?: string;
  mindsetEsperado?: string;
  criteriosAvaliacao?: string;
  diferenciais?: string;
  itensNaoPontuaveis?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  positionId: string;
  resumeUrl?: string;
  resumeText?: string;
  resumeFileName?: string;
  source: 'indeed' | 'linkedin' | 'manual' | 'referral';
  stage: CandidateStage;
  aiAnalysis?: AIAnalysis;
  notes: CandidateNote[];
  interviews: Interview[];
  rejectionReason?: string;
  talentPoolReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CandidateStage = 
  | 'nova_candidatura'
  | 'analise_ia'
  | 'selecao_pre_entrevista'
  | 'pre_entrevista'
  | 'aguardando_feedback_pre_entrevista'
  | 'selecao_entrevista_presencial'
  | 'entrevista_presencial'
  | 'aprovado'
  | 'nao_aprovado'
  | 'banco_talentos';

export interface AIAnalysis {
  score: number; // 0-10
  experienciaProfissional: number; // 0-4
  habilidadesTecnicas: number; // 0-2
  competenciasComportamentais: number; // 0-1
  formacaoAcademica: number; // 0-1
  diferenciaisRelevantes: number; // 0-2
  pontoFortes: string[];
  pontosAtencao: string[];
  recommendation: 'advance' | 'reject' | 'review';
  reasoning: string;
  recomendacaoFinal: 'aprovado' | 'nao_recomendado';
  analyzedAt: Date;
}

export interface CandidateNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  type: 'general' | 'interview' | 'hr_review';
}

export interface Interview {
  id: string;
  type: 'pre_interview' | 'in_person';
  scheduledAt: Date;
  duration: number; // minutes
  meetingUrl?: string;
  location?: string;
  interviewerIds: string[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback?: InterviewFeedback;
}

export interface InterviewFeedback {
  overallRating: number; // 1-5
  technicalSkills: number;
  culturalFit: number;
  communication: number;
  comments: string;
  recommendation: 'hire' | 'reject' | 'maybe';
}

export interface KanbanColumn {
  id: CandidateStage;
  title: string;
  description: string;
  color: string;
  candidates: Candidate[];
  allowedTransitions: CandidateStage[];
}

export interface RecruitmentStats {
  totalCandidates: number;
  candidatesByStage: Record<CandidateStage, number>;
  averageTimeToHire: number; // days
  conversionRates: Record<string, number>;
  aiAccuracyRate: number;
}