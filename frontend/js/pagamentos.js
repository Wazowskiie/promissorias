document.addEventListener("DOMContentLoaded", () => {
  carregarPagamentos();
});

async function carregarPagamentos() {
  try {

    const { data, error } = await supabaseClient
      .from("parcelas")
      .select("*")
      .eq("status", "paga");

    if (error) throw error;

    let totalEmDia = 0;
    let totalAtrasado = 0;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    data.forEach(p => {
      const vencimento = new Date(p.data_vencimento);

      if (vencimento >= hoje) {
        totalEmDia += Number(p.valor);
      } else {
        totalAtrasado += Number(p.valor);
      }
    });

    document.getElementById("pagamentosEmDia").textContent =
      formatarMoeda(totalEmDia);

    document.getElementById("pagamentosAtrasados").textContent =
      formatarMoeda(totalAtrasado);

  } catch (err) {
    console.error("Erro ao carregar pagamentos:", err);
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}
