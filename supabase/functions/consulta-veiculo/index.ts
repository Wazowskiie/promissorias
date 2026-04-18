import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CP_EMAIL = "isabelandrade965@gmail.com";
const CP_APIKEY = "0f547c58886e82a0a69635f7aa4614a5"; // ← troque pela nova key

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { placa } = await req.json();

    if (!placa) {
      return new Response(JSON.stringify({ error: "Placa não informada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${CP_EMAIL}:${CP_APIKEY}`);
    const base = "https://api.consultarplaca.com.br/v2";

    const [resBasica, resMultas] = await Promise.all([
      fetch(`${base}/consultarPlaca?placa=${placa}`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
      fetch(`${base}/consultarRegistrosInfracoesRenainf?placa=${placa}`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
    ]);

    const dadosBasicos = await resBasica.json();
    const dadosMultas = await resMultas.json();

    return new Response(
      JSON.stringify({ basica: dadosBasicos, multas: dadosMultas }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});