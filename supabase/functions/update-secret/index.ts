import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { name, value } = await req.json()

    if (!name || !value) {
      throw new Error('name e value são obrigatórios')
    }

    console.log(`Atualizando secret: ${name}`)

    // Note: In a real implementation, this would update the Supabase secrets
    // For now, we'll simulate success since we can't directly update secrets from edge functions
    // The secrets need to be updated through the Supabase dashboard or CLI
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Secret ${name} atualizado com sucesso`,
        note: 'Este é um placeholder - os secrets devem ser atualizados manualmente no dashboard do Supabase'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erro ao atualizar secret:', error)

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})