

# Correcao: Race Condition na Automacao IA

## Problema Identificado

A funcao `checkAndApplyAIAutomation` esta falhando devido a um **race condition** causado pela natureza assincrona do React state. O fluxo problematico e:

```text
1. useEffect carrega candidatos do Supabase
2. setCandidates(transformedCandidates) - Define candidatos no state
3. Loop sobre transformedCandidates chama checkAndApplyAIAutomation
4. checkAndApplyAIAutomation cria setTimeout de 1 segundo
5. Apos 1 segundo, moveCandidateToStage busca em "candidates" state
6. PROBLEMA: O state "candidates" ainda nao foi atualizado (closure capturou state vazio/antigo)
7. candidates.find() retorna undefined -> "Candidato nao encontrado"
```

**Evidencia nos logs:**
- 50 candidatos na etapa `analise_ia` com `ai_analysis` preenchido
- Todos estao em vagas ativas
- Erro "Candidato nao encontrado" para todos os IDs

## Causa Raiz

A funcao `moveCandidateToStage` e uma closure que captura o state `candidates` no momento de sua criacao. Quando chamada apos o `setTimeout`, ela usa uma versao desatualizada do state.

```typescript
// Problema: "candidates" aqui e o valor capturado na closure
let candidateToMove = candidates.find(c => c.id === candidateId);
```

## Solucao Proposta

### Abordagem: Modificar `checkAndApplyAIAutomation` para receber o candidato e atualizar diretamente no Supabase

Em vez de buscar o candidato no state local (que pode estar desatualizado), passar o candidato como parametro e atualizar diretamente no banco de dados. O realtime se encarregara de sincronizar o state.

### Modificacoes

**Arquivo:** `src/hooks/useRecruitmentKanban.ts`

1. **Refatorar `checkAndApplyAIAutomation`** para:
   - Receber o candidato completo como parametro
   - Atualizar diretamente no Supabase usando o ID do candidato
   - Remover a busca no state local
   - Deixar o realtime subscription lidar com a atualizacao do state

2. **Atualizar chamadas de `checkAndApplyAIAutomation`**:
   - No carregamento inicial (linha 257)
   - No INSERT realtime (linha 312)
   - No UPDATE realtime (linhas 392, 444)
   - No updateCandidate (linha 692)

### Codigo da Nova Funcao

```typescript
const checkAndApplyAIAutomation = async (candidate: Candidate) => {
  // Apenas aplicar automacao para candidatos na etapa 'analise_ia' com analise IA
  if (candidate.stage !== 'analise_ia' || !candidate.aiAnalysis) {
    return;
  }
  
  const score = candidate.aiAnalysis.score;
  console.log('🤖 Automacao IA - Candidato:', candidate.name, 'Nota:', score);
  
  // Determinar nova etapa baseada na nota
  const newStage = score >= 6.5 ? 'selecao_pre_entrevista' : 'nao_aprovado';
  const rejectionReason = score < 6.5 ? 'Pontuacao IA abaixo do minimo (6.5)' : undefined;
  
  console.log(score >= 6.5 ? '✅ Auto-aprovando candidato' : '❌ Auto-reprovando candidato');
  
  try {
    // Atualizar diretamente no Supabase - o realtime sincroniza o state
    const updateData: any = {
      stage: newStage,
      updated_at: new Date().toISOString()
    };
    
    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }
    
    const { error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidate.id);
    
    if (error) {
      console.error('Erro ao aplicar automacao IA:', error);
    }
  } catch (error) {
    console.error('Erro ao aplicar automacao IA:', error);
  }
};
```

### Beneficios da Solucao

1. **Elimina race condition**: Nao depende do state local estar atualizado
2. **Usa realtime existente**: O subscription ja esta configurado para lidar com UPDATEs
3. **Simplicidade**: Remove a complexidade do setTimeout e busca no state
4. **Consistencia**: Garante que o banco de dados e sempre a fonte de verdade

### Fluxo Corrigido

```text
1. useEffect carrega candidatos do Supabase
2. setCandidates(transformedCandidates)
3. Loop sobre transformedCandidates chama checkAndApplyAIAutomation
4. checkAndApplyAIAutomation atualiza DIRETAMENTE no Supabase via UPDATE
5. Realtime subscription recebe o UPDATE
6. Handler do UPDATE atualiza o state local corretamente
7. Candidato movido para nova etapa com sucesso
```

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useRecruitmentKanban.ts` | Refatorar `checkAndApplyAIAutomation` para atualizar diretamente no Supabase |

### Testes Recomendados

1. Recarregar a pagina e verificar que candidatos em `analise_ia` com nota >= 6.5 movem para `selecao_pre_entrevista`
2. Verificar que candidatos com nota < 6.5 movem para `nao_aprovado`
3. Verificar que nao ha mais erros "Candidato nao encontrado" no console
4. Testar reanalise via N8N e confirmar que automacao funciona em tempo real

