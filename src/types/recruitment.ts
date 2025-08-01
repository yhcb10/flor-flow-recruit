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
  source: 'indeed' | 'manual' | 'referral';
  stage: CandidateStage;
  aiAnalysis?: AIAnalysis;
  notes: CandidateNote[];
  interviews: Interview[];
  createdAt: Date;
  updatedAt: Date;
}

export type CandidateStage = 
  | 'nova_candidatura'
  | 'analise_ia'
  | 'selecao_rh'
  | 'pre_entrevista'
  | 'entrevista_presencial'
  | 'aprovado'
  | 'nao_aprovado';

export interface AIAnalysis {
  score: number; // 0-10
  strengths: string[];
  weaknesses: string[];
  recommendation: 'advance' | 'reject' | 'review';
  reasoning: string;
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