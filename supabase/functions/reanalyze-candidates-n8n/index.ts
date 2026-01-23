import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  candidateIds?: string[];
  candidateId?: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const limit = Math.max(1, Math.floor(concurrency || 1));
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      try {
        const value = await worker(items[current], current);
        results[current] = { status: "fulfilled", value };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(runners);
  return results;
}

function normalizeCandidateIds(body: RequestBody): string[] {
  const raw = Array.isArray(body.candidateIds)
    ? body.candidateIds
    : (body.candidateId ? [body.candidateId] : []);
  const trimmed = raw
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  // Dedup para evitar reprocessamento acidental
  return Array.from(new Set(trimmed));
}

type PerCandidateResult = { candidateId: string; ok: boolean; error?: string; webhookUrl?: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "OK", function: "reanalyze-candidates-n8n" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const candidateIds = normalizeCandidateIds(body);

    if (candidateIds.length === 0) {
      throw new Error("candidateIds (array) ou candidateId (string) é obrigatório");
    }

    // Configurações
    // - MAX_BATCH: tamanho do lote lógico (quebra automática acima disso)
    // - HARD_CAP: proteção contra disparos gigantes acidentais
    // - CONCURRENCY: paralelismo controlado dentro de cada lote
    const MAX_BATCH = 100;
    const HARD_CAP = 1000;
    const CONCURRENCY = 5;
    if (candidateIds.length > HARD_CAP) {
      throw new Error(`Limite máximo de ${HARD_CAP} candidatos por requisição. Recebido: ${candidateIds.length}`);
    }

    const baseUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (!baseUrl) {
      throw new Error("N8N_WEBHOOK_BASE_URL não está configurado nos secrets");
    }

    async function processCandidate(candidateId: string): Promise<PerCandidateResult> {
      try {
        if (!uuidRegex.test(candidateId)) {
          throw new Error("candidateId inválido (esperado UUID)");
        }

        const { data: candidate, error: candidateError } = await supabase
          .from("candidates")
          .select("id, name, source, position_id, resume_url, resume_file_name")
          .eq("id", candidateId)
          .maybeSingle();

        if (candidateError) {
          throw new Error(`Erro ao buscar candidato: ${candidateError.message}`);
        }
        if (!candidate) {
          throw new Error("Candidato não encontrado");
        }

        if (!candidate.position_id) {
          throw new Error("Candidato sem position_id (vaga)");
        }

        if (!candidate.resume_url) {
          throw new Error("Candidato sem resume_url (currículo)");
        }

        const { data: jobPosition, error: jobError } = await supabase
          .from("job_positions")
          .select("id, title, n8n_webhook_path, endpoint_id")
          .eq("id", candidate.position_id)
          .maybeSingle();

        if (jobError) {
          throw new Error(`Erro ao buscar vaga: ${jobError.message}`);
        }
        if (!jobPosition) {
          throw new Error("Vaga não encontrada");
        }
        if (!jobPosition.n8n_webhook_path) {
          throw new Error(`Vaga "${jobPosition.title}" sem n8n_webhook_path configurado`);
        }

        const webhookUrl = `${baseUrl}${jobPosition.n8n_webhook_path}`;

        const payload = {
          candidateId: candidate.id,
          resumeUrl: candidate.resume_url,
          fileName: candidate.resume_file_name || "curriculum.pdf",
          positionId: jobPosition.endpoint_id || jobPosition.id,
          positionTitle: jobPosition.title,
          source: candidate.source || "manual",
          reanalysis: true,
          requestedAt: new Date().toISOString(),
        };

        console.log("Reanálise - enviando para n8n:", JSON.stringify({ webhookUrl, payload }, null, 2));

        const n8nResp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const n8nText = await n8nResp.text();
        console.log("Reanálise - resposta n8n:", { status: n8nResp.status, body: n8nText });

        if (!n8nResp.ok) {
          throw new Error(`Erro do n8n: ${n8nResp.status} - ${n8nText}`);
        }

        // Efeito no funil: voltar para analise_ia
        const { error: updateError } = await supabase
          .from("candidates")
          .update({ stage: "analise_ia", updated_at: new Date().toISOString() })
          .eq("id", candidate.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar stage do candidato: ${updateError.message}`);
        }

        return { candidateId, ok: true, webhookUrl };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Reanálise - erro por candidato:", { candidateId, err: message });
        return { candidateId, ok: false, error: message || "Erro desconhecido" };
      }
    }

    const batches = chunkArray(candidateIds, MAX_BATCH);
    console.log("Reanálise - iniciado", {
      totalCandidateIds: candidateIds.length,
      batches: batches.length,
      maxBatchSize: MAX_BATCH,
      concurrency: CONCURRENCY,
    });

    const backgroundTask = async () => {
      const startedAt = Date.now();
      let totalOk = 0;
      let totalFail = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log("Reanálise - lote start", { batchIndex: i + 1, batchSize: batch.length });

        const settled = await runWithConcurrency(batch, CONCURRENCY, async (id) => await processCandidate(id));
        const results: PerCandidateResult[] = settled.map((r, idx) => {
          if (r.status === "fulfilled") return r.value;
          const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
          return { candidateId: batch[idx], ok: false, error: reason || "Erro desconhecido" };
        });

        const ok = results.filter((r) => r.ok).length;
        const fail = results.length - ok;
        totalOk += ok;
        totalFail += fail;

        console.log("Reanálise - lote end", { batchIndex: i + 1, ok, fail });
      }

      console.log("Reanálise - finalizado", {
        totalCandidateIds: candidateIds.length,
        ok: totalOk,
        fail: totalFail,
        durationMs: Date.now() - startedAt,
      });
    };

    // Executa em background para evitar timeout no request; a análise em si será entregue via webhook (receive-n8n-analysis)
    // EdgeRuntime existe no ambiente de execução das Edge Functions.
    // deno-lint-ignore no-explicit-any
    const edgeRuntime: any = (globalThis as any).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(backgroundTask());
    } else {
      // Fallback: se não suportar background tasks, executa no caminho síncrono.
      await backgroundTask();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reanálise iniciada para ${candidateIds.length} candidatos (em ${batches.length} lotes de até ${MAX_BATCH}).`,
        totalCandidateIds: candidateIds.length,
        batches: batches.length,
        maxBatchSize: MAX_BATCH,
        concurrency: CONCURRENCY,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro em reanalyze-candidates-n8n:", message);
    return new Response(
      JSON.stringify({ success: false, error: message || "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
