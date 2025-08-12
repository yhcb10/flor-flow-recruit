import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
}

const defaultUsers: CreateUserRequest[] = [
  {
    email: "danilo.lima@coroadefloresnobre.com.br",
    password: "Coroas2025!#"
  },
  {
    email: "yuri.carvalho@coroadefloresnobre.com.br", 
    password: "Coroas2025!#"
  },
  {
    email: "beatriz.meluci@coroadefloresnobre.com.br",
    password: "Coroas2025!#"
  }
];

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results = [];

    for (const user of defaultUsers) {
      console.log(`Creating user: ${user.email}`);
      
      // Check if user already exists by trying to create and catching the error
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true // Auto-confirm email
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          console.log(`User ${user.email} already exists, skipping...`);
          results.push({
            email: user.email,
            status: 'already_exists',
            message: 'Usuário já existe'
          });
        } else {
          console.error(`Error creating user ${user.email}:`, error);
          results.push({
            email: user.email,
            status: 'error',
            message: error.message
          });
        }
      } else {
        console.log(`User ${user.email} created successfully`);
        results.push({
          email: user.email,
          status: 'created',
          message: 'Usuário criado com sucesso',
          userId: data.user?.id
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in create-default-users function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);