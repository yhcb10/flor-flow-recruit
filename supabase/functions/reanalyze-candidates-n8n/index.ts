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
    const candidateIds = Array.isArray(body.candidateIds)
      ? body.candidateIds
      : (body.candidateId ? [body.candidateId] : []);

    if (candidateIds.length === 0) {
      throw new Error("candidateIds (array) ou candidateId (string) é obrigatório");
    }

    // Proteção: evitar disparos gigantes acidentais
    const MAX_BATCH = 30;
    if (candidateIds.length > MAX_BATCH) {
      throw new Error(`Limite de ${MAX_BATCH} candidatos por lote. Recebido: ${candidateIds.length}`);
    }

    const baseUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (!baseUrl) {
      throw new Error("N8N_WEBHOOK_BASE_URL não está configurado nos secrets");
    }

    const results: Array<{ candidateId: string; ok: boolean; error?: string; webhookUrl?: string }> = [];

    for (const candidateId of candidateIds) {
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

        results.push({ candidateId, ok: true, webhookUrl });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Reanálise - erro por candidato:", { candidateId, err: message });
        results.push({ candidateId, ok: false, error: message || "Erro desconhecido" });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        message: `Reanálise disparada. Sucesso: ${successCount}. Falhas: ${failCount}.`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
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
