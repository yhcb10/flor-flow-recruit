-- Insert new job position for Gestor de Ads
INSERT INTO public.job_positions (
  id,
  title,
  department,
  location,
  type,
  description,
  salary_range,
  requirements,
  responsibilities,
  benefits,
  status
) VALUES (
  '5c852ff2-1fdc-4d54-b765-948fe54397e4',
  'Gestor de Ads',
  'Marketing Digital',
  'Remoto/Presencial',
  'full-time',
  'Responsável por gerenciar campanhas de tráfego pago e estratégias de marketing digital.',
  'R$ 4.000 - R$ 8.000',
  ARRAY['Experiência com Google Ads', 'Facebook Ads', 'Analytics', 'Conhecimento em funis de conversão'],
  ARRAY['Gerenciar campanhas de tráfego pago', 'Otimizar ROI das campanhas', 'Análise de métricas', 'Relatórios de performance'],
  ARRAY['Vale alimentação', 'Plano de saúde', 'Home office'],
  'active'
);