import { JobPosition } from '@/types/recruitment';

// Nova posição de Analista de Inteligência Artificial
export const analistaIAPosition: JobPosition = {
  id: 'analista-ia-001',
  title: 'Analista de Inteligência Artificial e Automações',
  department: 'Tecnologia',
  description: 'Analista responsável por implementar soluções de IA e automações para otimizar processos empresariais',
  requirements: [
    'Superior completo em Ciência da Computação, Engenharia ou áreas afins',
    'Experiência com Python e bibliotecas de Machine Learning',
    'Conhecimento em APIs e integração de sistemas',
    'Experiência com automação de processos (RPA)',
    'Inglês técnico para leitura'
  ],
  responsibilities: [
    'Desenvolver e implementar soluções de IA',
    'Criar automações para processos empresariais',
    'Integrar sistemas através de APIs',
    'Analisar dados e propor melhorias',
    'Documentar soluções desenvolvidas'
  ],
  culturalValues: [
    'Inovação e criatividade',
    'Pensamento analítico',
    'Aprendizado contínuo',
    'Colaboração em equipe',
    'Foco em resultados'
  ],
  minimumQualification: 'Superior completo',
  status: 'active',
  createdAt: new Date('2024-01-20'),
  createdBy: 'TI - Tecnologia da Informação',
  targetHires: 1,
  endpointId: 'analista_de_inteligencia_artificial_e_automacoes_390000',
  aiAnalysisPrompt: `🧠 Avaliador IA - Analista de Inteligência Artificial e Automações

🎯 OBJETIVO
Avaliar candidatos para posição de Analista de IA com foco em implementação de soluções inteligentes e automações.

📌 VAGA: ANALISTA DE INTELIGÊNCIA ARTIFICIAL E AUTOMAÇÕES
🏢 Empresa: Flow Nobre
💰 Salário: R$ 6.000 - R$ 9.000 + benefícios
📍 Local: São Paulo - SP (Híbrido)
⏰ Jornada: Segunda a sexta, 9h às 18h

🎯 RESPONSABILIDADES PRINCIPAIS
- Desenvolvimento de soluções de IA e Machine Learning
- Implementação de automações de processos (RPA)
- Integração de sistemas via APIs
- Análise de dados e proposta de melhorias
- Documentação técnica das soluções

📊 CRITÉRIOS DE AVALIAÇÃO (0-10 pontos)

1. EXPERIÊNCIA TÉCNICA (0-4 pontos)
- Python e bibliotecas ML (scikit-learn, pandas, numpy)
- Experiência com APIs e integração de sistemas
- Automação de processos (RPA, workflows)
- Projetos práticos com IA/ML

2. CONHECIMENTOS ESPECÍFICOS (0-2 pontos)
- Machine Learning e Deep Learning
- Ferramentas de automação (UiPath, Automation Anywhere, etc.)
- Bancos de dados e SQL
- Cloud Computing (AWS, Azure, GCP)

3. FORMAÇÃO E CERTIFICAÇÕES (0-2 pontos)
- Superior completo (obrigatório)
- Cursos especializados em IA/ML
- Certificações em cloud ou automação
- Portfólio com projetos relevantes

4. COMPETÊNCIAS COMPORTAMENTAIS (0-2 pontos)
- Capacidade analítica e resolução de problemas
- Aprendizado contínuo e adaptabilidade
- Comunicação técnica clara
- Trabalho em equipe e colaboração

🌟 DIFERENCIAIS EXTRAS (+1 a +2 pontos)
- Experiência com LLMs (GPT, LLaMA, etc.)
- Conhecimento em Computer Vision ou NLP
- Experiência com DevOps e CI/CD
- Contribuições em projetos open source
- Experiência em startup ou empresa de tecnologia

✅ CRITÉRIO DE APROVAÇÃO
Nota mínima: 7.5/10 para aprovação
Foco especial em experiência prática e capacidade de implementação

🎯 PERFIL IDEAL
Profissional técnico inovador, com sólida base em programação e IA, capaz de transformar ideias em soluções práticas e escaláveis.`
};