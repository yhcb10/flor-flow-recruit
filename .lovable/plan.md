
# Plano: Sistema Híbrido Escalável de Carregamento de Candidatos

## Resumo Executivo

O sistema atual está limitado a 1.000 candidatos devido à restrição padrão do Supabase, mas o banco de dados contém **4.583 candidatos**. A solução proposta implementa um sistema híbrido que:

1. **Carrega candidatos ativos usando paginação iterativa completa** (garante 100% dos dados mesmo quando ultrapassar 1.000)
2. **Implementa lazy loading para colunas terminais** (Não Aprovado, Aprovado, Banco de Talentos)
3. **Mantém contadores precisos** via queries COUNT separadas
4. **Preserva realtime** para atualizações em tempo real

---

## Distribuicao Atual de Candidatos

| Coluna | Candidatos | Classificacao |
|--------|-----------|---------------|
| Nao Aprovado | 3.696 | Terminal |
| Selecao Pre Entrevista | 410 | Ativa |
| Aguardando Feedback | 279 | Ativa |
| Pre-entrevista | 146 | Ativa |
| Entrevista Presencial | 20 | Ativa |
| Selecao Entrevista Presencial | 16 | Ativa |
| Aprovado | 9 | Terminal |
| Banco de Talentos | 7 | Terminal |

**Total Ativo**: ~871 candidatos (abaixo de 1.000, mas crescendo)
**Total Terminal**: ~3.712 candidatos

---

## Arquitetura da Solucao

### Estrategia em 3 Camadas

```text
+-------------------------------------------------------------------+
|                    CAMADA 1: CARREGAMENTO INICIAL                 |
|  Candidatos em colunas ATIVAS (exceto terminais)                  |
|  Usa paginacao iterativa para garantir 100% dos dados             |
|  fetchAllPaginated() busca em lotes de 1000 ate esgotar           |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|                    CAMADA 2: CONTADORES                           |
|  Query COUNT separada para colunas terminais                      |
|  Exibe total real no badge mesmo sem carregar dados               |
|  Atualiza em tempo real via subscription                          |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|                    CAMADA 3: LAZY LOADING                         |
|  Colunas terminais: nao_aprovado, aprovado, banco_talentos        |
|  Carrega sob demanda quando usuario expande/clica                 |
|  Paginacao: 50 candidatos por vez com "Carregar mais"             |
+-------------------------------------------------------------------+
```

---

## Fases de Implementacao

### Fase 1: Criar Funcao de Paginacao Iterativa

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Objetivo**: Garantir que NUNCA percamos dados, mesmo quando houver mais de 1.000 candidatos em colunas ativas.

**Implementacao**:
- Criar funcao `fetchAllPaginated` que:
  - Busca em lotes de 1.000 usando `.range(from, to)`
  - Continua buscando enquanto retornar exatamente 1.000 registros
  - Concatena todos os resultados
  - Retorna array completo de candidatos

**Logica**:
```
Inicio: offset = 0, pageSize = 1000
Loop:
  - Buscar .range(offset, offset + pageSize - 1)
  - Adicionar resultados ao array
  - Se resultados.length < pageSize: parar
  - offset += pageSize
Retornar array completo
```

### Fase 2: Separar Colunas Terminais

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Objetivo**: Definir quais colunas usam carregamento imediato vs lazy loading.

**Implementacao**:
- Criar constante `TERMINAL_STAGES`:
  - `nao_aprovado`
  - `aprovado`
  - `banco_talentos`
- Criar constante `ACTIVE_STAGES` (todas as outras 7 colunas)

### Fase 3: Refatorar Carregamento Inicial

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Objetivo**: Carregar apenas candidatos ativos no inicio, mas de forma completa.

**Modificacoes no useEffect de carregamento**:

1. **Query principal**: Buscar candidatos onde `stage NOT IN (nao_aprovado, aprovado, banco_talentos)`
   - Usar `fetchAllPaginated` para garantir todos os dados
   - Mesmo que etapas ativas ultrapassem 1.000, todos serao carregados

2. **Query de contadores**: Buscar COUNT por stage para colunas terminais
   - Query: `SELECT stage, COUNT(*) FROM candidates WHERE stage IN (...) GROUP BY stage`
   - Armazenar em estado separado `terminalCounts`

### Fase 4: Adicionar Estado para Colunas Terminais

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Novos estados**:
- `terminalCandidates`: Map<CandidateStage, Candidate[]> - candidatos ja carregados das colunas terminais
- `terminalCounts`: Record<CandidateStage, number> - total real de cada coluna terminal
- `terminalLoadingStates`: Record<CandidateStage, 'idle' | 'loading' | 'error'> - estado de loading
- `terminalOffsets`: Record<CandidateStage, number> - offset atual para paginacao

### Fase 5: Criar Funcao de Lazy Loading

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Nova funcao `loadMoreFromTerminalColumn`**:
- Recebe: `stage: CandidateStage, pageSize: number = 50`
- Busca proximos N candidatos usando `.range(offset, offset + pageSize - 1)`
- Adiciona ao `terminalCandidates` sem duplicar
- Incrementa `terminalOffsets[stage]`
- Retorna `hasMore: boolean`

### Fase 6: Atualizar Geracao de Colunas

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Modificar o useMemo `columns`**:
- Para colunas ativas: usar `candidates` (estado principal)
- Para colunas terminais: usar `terminalCandidates.get(stage) || []`
- Manter ordenacao existente por entrevistas

### Fase 7: Ajustar Realtime Subscriptions

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Modificar handlers de INSERT e UPDATE**:

Para INSERT:
- Se stage eh terminal: incrementar `terminalCounts[stage]`
- Se stage eh ativo: adicionar ao estado `candidates`

Para UPDATE:
- Verificar stage anterior e novo
- Se moveu DE ativo PARA terminal: remover de `candidates`, incrementar count
- Se moveu DE terminal PARA ativo: adicionar em `candidates`, decrementar count
- Se moveu ENTRE terminais: ajustar counts, atualizar `terminalCandidates` se ja carregado

### Fase 8: Atualizar Interface do Hook

**Arquivo**: `src/hooks/useRecruitmentKanban.ts`

**Novo retorno do hook**:
```typescript
return {
  columns,              // Existente
  candidates,           // Existente (agora apenas ativos)
  loading,              // Existente
  moveCandidateToStage, // Existente
  updateCandidate,      // Existente
  addCandidate,         // Existente
  deleteCandidate,      // Existente
  stats,                // Existente
  // NOVOS:
  terminalCounts,       // Contadores reais das colunas terminais
  terminalLoadingStates,// Estado de loading por coluna
  loadMoreFromTerminalColumn, // Funcao para lazy load
  hasMoreInTerminal,    // Funcao: (stage) => boolean
}
```

### Fase 9: Atualizar Tipos

**Arquivo**: `src/types/recruitment.ts`

**Adicionar interface para estado de loading terminal**:
```typescript
export interface TerminalColumnState {
  count: number;
  loaded: number;
  loading: boolean;
  hasMore: boolean;
}
```

### Fase 10: Atualizar KanbanBoard

**Arquivo**: `src/components/recruitment/KanbanBoard.tsx`

**Modificacoes**:

1. **Receber novas props**:
   - `terminalCounts`
   - `terminalLoadingStates`
   - `onLoadMore: (stage: CandidateStage) => Promise<void>`
   - `hasMoreInTerminal: (stage: CandidateStage) => boolean`

2. **Badge da coluna**:
   - Para colunas terminais: exibir "X / Y" (carregados / total)
   - Para colunas ativas: exibir apenas total

3. **Botao "Carregar mais"**:
   - Adicionar ao final da ScrollArea das colunas terminais
   - Visivel apenas quando `hasMore`
   - Exibir spinner durante loading

4. **Estado inicial de colunas terminais**:
   - Mostrar mensagem "Clique para carregar candidatos"
   - Ou botao "Carregar primeiros 50"

### Fase 11: Atualizar Selecao em Massa

**Arquivo**: `src/components/recruitment/KanbanBoard.tsx`

**Modificacoes para selecao de coluna terminal**:
- Ao clicar "Selecionar coluna" em coluna terminal:
  - Se nao carregou todos: mostrar dialog perguntando se deseja carregar todos primeiro
  - Se ja carregou: selecionar todos normalmente

---

## Fluxo de Dados

```text
1. INICIALIZACAO
   +-- fetchAllPaginated(stages ativos) --> candidates
   +-- COUNT(stages terminais) --> terminalCounts
   +-- Renderiza Kanban

2. VISUALIZACAO COLUNA TERMINAL
   +-- Badge mostra: "0 / 3.696"
   +-- Usuario clica "Carregar candidatos"
   +-- loadMoreFromTerminalColumn('nao_aprovado', 50)
   +-- Badge atualiza: "50 / 3.696"

3. SCROLL / LOAD MORE
   +-- Usuario clica "Carregar mais"
   +-- loadMoreFromTerminalColumn('nao_aprovado', 50)
   +-- Badge atualiza: "100 / 3.696"

4. REALTIME - NOVO CANDIDATO
   +-- Se stage ativo: adiciona em candidates
   +-- Se stage terminal: incrementa terminalCounts[stage]

5. REALTIME - CANDIDATO ATUALIZADO
   +-- Verifica stage anterior vs novo
   +-- Ajusta candidates e/ou terminalCandidates
   +-- Atualiza terminalCounts se necessario

6. MOVIMENTACAO MANUAL (drag ou botao)
   +-- moveCandidateToStage atualiza Supabase
   +-- Realtime propaga mudanca
   +-- Estados ajustados automaticamente
```

---

## Garantias de Integridade

1. **Paginacao Iterativa para Ativos**:
   - Mesmo que `selecao_pre_entrevista` ultrapasse 1.000, `fetchAllPaginated` busca todos
   - Loop continua ate `results.length < pageSize`

2. **Contadores Precisos**:
   - Query COUNT separada garante numero real
   - Badge mostra "carregados / total"
   - Usuario sabe exatamente quantos candidatos existem

3. **Realtime Mantido**:
   - Novos candidatos aparecem instantaneamente em colunas ativas
   - Contadores atualizam em tempo real
   - Candidatos em colunas terminais ja carregadas tambem atualizam

4. **Sem Perda de Dados**:
   - Nenhum candidato eh excluido ou ignorado
   - Lazy loading eh apenas adiamento, nao exclusao
   - Todas as operacoes (mover, deletar, atualizar) funcionam normalmente

5. **Fallback Robusto**:
   - Se lazy loading falhar, exibe erro e permite retry
   - Logs detalhados para debug
   - Estado de erro por coluna

---

## Consideracoes de Performance

1. **Carga Inicial Rapida**:
   - Apenas ~871 candidatos ativos carregados inicialmente
   - Mesmo com paginacao iterativa, sao apenas 1 requisicao hoje

2. **Memoria Otimizada**:
   - Colunas terminais carregam sob demanda
   - 50 candidatos por vez eh suficiente para scroll fluido

3. **Realtime Eficiente**:
   - Subscription nao muda
   - Apenas logica de distribuicao eh mais inteligente

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| `src/hooks/useRecruitmentKanban.ts` | Refatoracao completa do carregamento |
| `src/components/recruitment/KanbanBoard.tsx` | UI para lazy loading e contadores |
| `src/types/recruitment.ts` | Adicionar tipos para estado terminal |

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Colunas ativas ultrapassam 1.000 | `fetchAllPaginated` garante busca completa |
| Perda de dados em transicao | Rollback otimista: reverte estado se Supabase falhar |
| Realtime perde sincronia | Count queries periodicos como fallback |
| Usuario seleciona coluna nao carregada | Dialog pergunta se quer carregar todos |

---

## Testes Recomendados Pos-Implementacao

1. Verificar que todos os ~871 candidatos ativos aparecem
2. Verificar que contadores das colunas terminais estao corretos
3. Testar lazy loading: carregar 50, depois mais 50
4. Mover candidato de ativo para terminal e vice-versa
5. Criar novo candidato e verificar que aparece em tempo real
6. Testar selecao em massa em coluna terminal parcialmente carregada
7. Simular cenario com mais de 1.000 candidatos em coluna ativa (adicionar temporariamente)

