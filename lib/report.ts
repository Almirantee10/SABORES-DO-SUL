import { fmt, fmtDate } from "@/lib/data";
import { byCustomer, byDay, byItem, payLabel, statusLabel, summary, tally, type Order } from "@/lib/orders";

/* Report exports: a formatted Excel workbook and a printable page (save it as PDF). */

const stamp = (iso: string) => new Date(iso).toLocaleString("pt-BR");
const itemText = (o: Order) => o.items.map((i) => `${i.qty}x ${i.name}${i.size ? " (" + i.size + ")" : ""}${i.flavors.length ? " [" + i.flavors.join(", ") + "]" : ""}`).join(" | ");
const orderNo = (id: string) => "#" + id.slice(8).toUpperCase();

/* -------------------------------------------------------------------- Excel */

const BRL = '"R$" #,##0.00';
const head = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E0B650", textColor: "#150D0C" });
const money = (value: number) => ({ value, type: Number, format: BRL });
const int = (value: number) => ({ value, type: Number });

export async function downloadXlsx(orders: Order[], from: string, to: string) {
  // loaded only when the button is used, so the page itself stays light
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const s = summary(orders);
  const cols = (...w: number[]) => w.map((width) => ({ width }));
  const customers = byCustomer(orders);
  const items = byItem(orders);
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  await writeXlsxFile(
    [
      {
        sheet: "Resumo",
        columns: cols(30, 22),
        data: [
          [{ value: "Relatório de vendas — Sabores do Sul", fontWeight: "bold" as const, fontSize: 14 }],
          [`Período: ${fmtDate(from)} até ${fmtDate(to)}`],
          [`Gerado em ${new Date().toLocaleString("pt-BR")}`],
          [],
          [head("Indicador"), head("Valor")],
          ["Faturamento", money(s.revenue)],
          ["Pedidos (sem cancelados)", int(s.orders)],
          ["Pedidos cancelados", int(s.cancelled)],
          ["Ticket médio", money(s.ticket)],
          ["Clientes diferentes", int(s.customers)],
          ["Unidades vendidas", int(s.units)],
          [],
          [head("Situação dos pedidos"), head("Pedidos")],
          ...[...new Map(orders.map((o) => [o.status, 0])).keys()].map((st) => [statusLabel(st), int(orders.filter((o) => o.status === st).length)]),
          [],
          [head("Forma de pagamento"), head("Pedidos")],
          ...tally(orders, (o) => payLabel(o.pay)).map((t) => [t.label, int(t.value)]),
          [],
          [head("Recebimento"), head("Pedidos")],
          ...tally(orders, (o) => (o.delivery === "entrega" ? "Entrega" : "Retirada")).map((t) => [t.label, int(t.value)]),
        ],
      },
      {
        sheet: "Vendas por dia",
        columns: cols(14, 12, 18),
        stickyRowsCount: 1,
        data: [[head("Data"), head("Pedidos"), head("Faturamento")], ...byDay(orders, from, to).map((d) => [fmtDate(d.day), int(d.orders), money(d.revenue)])],
      },
      {
        sheet: "Pedidos",
        columns: cols(11, 19, 14, 24, 17, 12, 12, 9, 34, 36, 18, 60, 14),
        stickyRowsCount: 1,
        data: [
          ["Pedido", "Feito em", "Situação", "Cliente", "Telefone", "Recebimento", "Data", "Horário", "Endereço", "Mapa", "Pagamento", "Itens", "Total"].map(head),
          ...sorted.map((o) => [orderNo(o.id), stamp(o.createdAt), statusLabel(o.status), o.name, o.phone, o.delivery === "entrega" ? "Entrega" : "Retirada", fmtDate(o.date), o.time, o.address, o.mapLink, payLabel(o.pay), itemText(o), money(o.total)]),
        ],
      },
      {
        sheet: "Itens dos pedidos",
        columns: cols(11, 19, 14, 24, 17, 32, 16, 40, 10, 14, 11, 14),
        stickyRowsCount: 1,
        data: [
          ["Pedido", "Feito em", "Situação", "Cliente", "Telefone", "Item", "Tamanho", "Sabores", "Quantidade", "Valor unitário", "Promoção %", "Subtotal"].map(head),
          ...sorted.flatMap((o) => o.items.map((i) => [orderNo(o.id), stamp(o.createdAt), statusLabel(o.status), o.name, o.phone, i.name, i.size, i.flavors.join(", "), int(i.qty), money(i.price), i.pct ? int(i.pct) : "", money(i.qty * i.price)])),
        ],
      },
      {
        sheet: "Clientes",
        columns: cols(26, 17, 10, 16, 16, 19, 19, 60),
        stickyRowsCount: 1,
        data: [
          ["Cliente", "Telefone", "Pedidos", "Total gasto", "Ticket médio", "Primeiro pedido", "Último pedido", "Itens mais pedidos"].map(head),
          ...customers.map((c) => [c.name, c.phone, int(c.orders), money(c.total), money(c.ticket), stamp(c.first), stamp(c.last), c.items.slice(0, 5).map((i) => `${i.qty}x ${i.name}`).join(" | ")]),
        ],
      },
      {
        sheet: "Itens vendidos",
        columns: cols(36, 18, 10, 16),
        stickyRowsCount: 1,
        data: [["Item", "Unidades vendidas", "Pedidos", "Faturamento"].map(head), ...items.map((i) => [i.name, int(i.qty), int(i.orders), money(i.revenue)])],
      },
    ],
  ).toFile(`relatorio-sabores-do-sul-${from}_a_${to}.xlsx`);
}

/* ---------------------------------------------------------------------- PDF */

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const CSS = `
@page{size:A4;margin:14mm}
*{box-sizing:border-box}
body{font:12px/1.4 Arial,Helvetica,sans-serif;color:#1b1311;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:22px;margin:0 0 2px;color:#7a5a12}
h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #E0B650;color:#3a1612}
p{margin:2px 0;color:#555}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}
.kpi{border:1px solid #d9c48a;border-radius:6px;padding:8px}
.kpi small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#777}
.kpi b{font-size:15px;color:#3a1612}
table{width:100%;border-collapse:collapse}
th{background:#E0B650;color:#150D0C;text-align:left;font-size:10px;padding:5px 6px}
td{padding:5px 6px;border-bottom:1px solid #e6dcc3;vertical-align:top}
tr{page-break-inside:avoid}
td.n,th.n{text-align:right;white-space:nowrap}
.bar{height:9px;background:#E0B650;border-radius:2px}
.note{font-size:10px;color:#777;margin-top:18px}
.tools{position:sticky;top:0;background:#fff7e0;border-bottom:1px solid #E0B650;padding:8px 14px;font:13px Arial;display:flex;gap:12px;align-items:center}
.tools button{padding:7px 14px;border:0;border-radius:6px;background:#E0B650;font-weight:bold;cursor:pointer}
@media print{.tools{display:none}}
`;

const table = (heads: string[], rows: string[][], right: number[] = []) =>
  `<table><thead><tr>${heads.map((h, i) => `<th class="${right.includes(i) ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td class="${right.includes(i) ? "n" : ""}">${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

export function reportHtml(orders: Order[], from: string, to: string) {
  const s = summary(orders);
  const days = byDay(orders, from, to).filter((d) => d.orders > 0);
  const maxDay = Math.max(1, ...days.map((d) => d.revenue));
  const items = byItem(orders);
  const customers = byCustomer(orders).slice(0, 15);
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de vendas — Sabores do Sul</title><style>${CSS}</style></head><body>
<div class="tools"><span>Para salvar em PDF, escolha <b>Salvar como PDF</b> como destino da impressão.</span><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<h1>Relatório de vendas — Sabores do Sul</h1>
<p>Período: ${esc(fmtDate(from))} até ${esc(fmtDate(to))} · gerado em ${esc(new Date().toLocaleString("pt-BR"))}</p>
<div class="kpis">
  <div class="kpi"><small>Faturamento</small><b>${esc(fmt(s.revenue))}</b></div>
  <div class="kpi"><small>Pedidos</small><b>${s.orders}</b></div>
  <div class="kpi"><small>Ticket médio</small><b>${esc(fmt(s.ticket))}</b></div>
  <div class="kpi"><small>Clientes</small><b>${s.customers}</b></div>
  <div class="kpi"><small>Unidades</small><b>${s.units}</b></div>
</div>
${s.cancelled ? `<p>${s.cancelled} pedido(s) cancelado(s) não entram nos valores acima.</p>` : ""}
<h2>Vendas por dia</h2>
${days.length ? table(["Data", "Pedidos", "Faturamento", ""], days.map((d) => [esc(fmtDate(d.day)), String(d.orders), esc(fmt(d.revenue)), `<div class="bar" style="width:${Math.max(2, (d.revenue / maxDay) * 100)}%"></div>`]), [1, 2]) : "<p>Sem vendas no período.</p>"}
<h2>Itens mais vendidos</h2>
${items.length ? table(["Item", "Unidades", "Pedidos", "Faturamento"], items.map((i) => [esc(i.name), String(i.qty), String(i.orders), esc(fmt(i.revenue))]), [1, 2, 3]) : "<p>Sem vendas no período.</p>"}
<h2>Melhores clientes</h2>
${customers.length ? table(["Cliente", "Telefone", "Pedidos", "Ticket médio", "Total gasto"], customers.map((c) => [esc(c.name), esc(c.phone), String(c.orders), esc(fmt(c.ticket)), esc(fmt(c.total))]), [2, 3, 4]) : "<p>Sem clientes no período.</p>"}
<h2>Pedidos do período (${sorted.length})</h2>
${sorted.length ? table(["Pedido", "Data", "Cliente", "Itens", "Pagamento", "Situação", "Total"], sorted.map((o) => [esc(orderNo(o.id)), esc(new Date(o.createdAt).toLocaleDateString("pt-BR")), esc(o.name), esc(itemText(o)), esc(payLabel(o.pay)), esc(statusLabel(o.status)), esc(fmt(o.total))]), [6]) : "<p>Sem pedidos no período.</p>"}
<p class="note">Relatório com dados de clientes. Guarde e compartilhe com cuidado.</p>
</body></html>`;
}

/** Opens the report in a clean window and starts the print dialog. Returns false if the browser blocked the window. */
export function printReport(orders: Order[], from: string, to: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(reportHtml(orders, from, to));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
}
