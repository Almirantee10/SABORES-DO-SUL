"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, MapPin, MessageCircle, RefreshCw, Search } from "lucide-react";
import { downloadXlsx, printReport } from "@/lib/report";
import { fmt, fmtDate } from "@/lib/data";
import { api, ApiError } from "@/lib/admin-client";
import { todayStr } from "@/lib/promo";
import { STATUS, byCustomer, byDay, byItem, counts, CSV, downloadCsv, orderDay, payLabel, statusLabel, summary, tally, type Order, type OrderStatus } from "@/lib/orders";
import { BarChart, Donut, HBars } from "./charts";

type View = "resumo" | "pedidos" | "clientes" | "itens";
const VIEWS: { id: View; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "pedidos", label: "Pedidos" },
  { id: "clientes", label: "Clientes" },
  { id: "itens", label: "Itens" },
];
const PERIODS = [
  { id: "hoje", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "tudo", label: "Tudo" },
] as const;

const dayBack = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return orderDay(d.toISOString());
};
const short = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const stamp = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const num = (id: string) => "#" + id.slice(8).toUpperCase();
const digits = (s: string) => s.replace(/\D/g, "");

export function CrmTab({ onSignedOut }: { onSignedOut: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("resumo");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("30");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const d = await api<{ configured: boolean; orders: Order[] }>("/api/admin/orders", "GET");
      setConfigured(d.configured);
      setOrders(d.orders);
      setErr("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setErr(e instanceof Error ? e.message : "Não foi possível carregar os pedidos.");
    } finally {
      setBusy(false);
    }
  }, [onSignedOut]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the orders when the screen opens
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const [from, to] = useMemo(() => {
    const today = todayStr();
    if (period === "hoje") return [today, today];
    if (period === "7") return [dayBack(6), today];
    if (period === "30") return [dayBack(29), today];
    if (period === "mes") return [today.slice(0, 8) + "01", today];
    const first = (orders ?? []).reduce((m, o) => (orderDay(o.createdAt) < m ? orderDay(o.createdAt) : m), today);
    return [first, today];
  }, [period, orders]);

  const inPeriod = useMemo(() => (orders ?? []).filter((o) => orderDay(o.createdAt) >= from && orderDay(o.createdAt) <= to), [orders, from, to]);

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    setErr("");
    try {
      await downloadXlsx(inPeriod, from, to);
    } catch {
      setErr("Não foi possível gerar o Excel. Tente de novo.");
    } finally {
      setExporting(false);
    }
  };
  const exportPdf = () => {
    if (!printReport(inPeriod, from, to)) setErr("O navegador bloqueou a janela do PDF. Permita pop-ups para este site e tente de novo.");
    else setErr("");
  };

  const setStatus = async (id: string, status: OrderStatus) => {
    const before = orders;
    setOrders((cur) => (cur ? cur.map((o) => (o.id === id ? { ...o, status } : o)) : cur));
    try {
      await api("/api/admin/orders", "PUT", { id, status });
    } catch (e) {
      setOrders(before);
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setErr(e instanceof Error ? e.message : "Não foi possível mudar a situação.");
    }
  };

  if (!configured)
    return (
      <div className="adm-pane">
        <div className="adm-card">
          <h2>Registro de pedidos ainda não ativado</h2>
          <p className="adm-note">Falta cadastrar a variável <b>ORDERS_KEY</b> na Vercel (uma senha longa que protege os dados dos clientes) e publicar de novo. Depois disso, cada pedido enviado pelo site aparece aqui.</p>
        </div>
      </div>
    );

  const s = summary(inPeriod);
  const newCount = (orders ?? []).filter((o) => o.status === "novo").length;

  return (
    <div className="adm-pane">
      <div className="crm-bar">
        <div className="adm-seg4" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? "on" : ""} onClick={() => setView(v.id)}>
              {v.label}{v.id === "pedidos" && newCount > 0 ? <em className="dot">{newCount}</em> : null}
            </button>
          ))}
        </div>
        <div className="crm-period">
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} aria-label="Período">
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={busy} aria-label="Atualizar"><RefreshCw size={15} className={busy ? "spin" : ""} /> <span>Atualizar</span></button>
        </div>
      </div>
      <p className="adm-note">{period === "tudo" ? "Todo o histórico" : `${fmtDate(from)} até ${fmtDate(to)}`} · {inPeriod.length} pedido(s) no período</p>
      {err && <p className="adm-err" role="alert">{err}</p>}
      {orders === null ? <p className="adm-note">Carregando pedidos…</p> : null}

      {orders !== null && (
        <section className="adm-card export" aria-label="Exportar relatório">
          <div>
            <h2>Exportar relatório</h2>
            <p className="adm-note">Leva o período escolhido acima: resumo, vendas por dia, pedidos, clientes e itens.</p>
          </div>
          <div className="crm-actions">
            <button className="btn btn-primary btn-sm" disabled={exporting || inPeriod.length === 0} onClick={exportExcel}><FileSpreadsheet size={16} /> <span>{exporting ? "Gerando…" : "Excel (.xlsx)"}</span></button>
            <button className="btn btn-outline btn-sm" disabled={inPeriod.length === 0} onClick={exportPdf}><FileText size={16} /> <span>PDF</span></button>
            <button className="btn btn-ghost btn-sm" disabled={inPeriod.length === 0} onClick={() => downloadCsv("pedidos", CSV.pedidos(inPeriod))}><Download size={16} /> <span>CSV</span></button>
          </div>
          {inPeriod.length === 0 && <p className="adm-note">Sem pedidos no período escolhido.</p>}
        </section>
      )}

      {orders !== null && view === "resumo" && <Resumo orders={inPeriod} from={from} to={to} s={s} />}
      {orders !== null && view === "pedidos" && <Pedidos orders={inPeriod} onStatus={setStatus} />}
      {orders !== null && view === "clientes" && <Clientes orders={inPeriod} />}
      {orders !== null && view === "itens" && <Itens orders={inPeriod} />}
    </div>
  );
}

/* ------------------------------------------------------------------ resumo */
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="kpi">
      <small>{label}</small>
      <b>{value}</b>
      {hint ? <em>{hint}</em> : null}
    </div>
  );
}

function Resumo({ orders, from, to, s }: { orders: Order[]; from: string; to: string; s: ReturnType<typeof summary> }) {
  const days = byDay(orders, from, to);
  return (
    <>
      <div className="kpis">
        <Kpi label="Faturamento" value={fmt(s.revenue)} />
        <Kpi label="Pedidos" value={String(s.orders)} hint={s.cancelled ? `${s.cancelled} cancelado(s)` : undefined} />
        <Kpi label="Ticket médio" value={fmt(s.ticket)} />
        <Kpi label="Clientes" value={String(s.customers)} />
        <Kpi label="Unidades" value={String(s.units)} />
      </div>
      <section className="adm-card">
        <h2>Faturamento por dia</h2>
        <BarChart data={days.map((d) => ({ label: short(d.day), value: d.revenue, sub: `${d.orders} pedido(s)` }))} />
      </section>
      <div className="adm-grid2">
        <section className="adm-card"><h2>Itens mais vendidos</h2><HBars data={byItem(orders).slice(0, 8).map((i) => ({ label: i.name, value: i.revenue, sub: `${i.qty} un.` }))} /></section>
        <section className="adm-card"><h2>Situação dos pedidos</h2><Donut data={tally(orders, (o) => statusLabel(o.status))} /></section>
        <section className="adm-card"><h2>Retirada ou entrega</h2><Donut data={tally(orders, (o) => (o.delivery === "entrega" ? "Entrega" : "Retirada"))} /></section>
        <section className="adm-card"><h2>Forma de pagamento</h2><Donut data={tally(orders, (o) => payLabel(o.pay))} /></section>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- pedidos */
function Pedidos({ orders, onStatus }: { orders: Order[]; onStatus: (id: string, s: OrderStatus) => void }) {
  const [status, setStatus] = useState<OrderStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const list = orders.filter((o) => (status === "todos" || o.status === status) && (!q.trim() || (o.name + " " + o.phone + " " + o.id).toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <>
      <div className="crm-filters">
        <div className="chips">
          <button className={status === "todos" ? "on" : ""} onClick={() => setStatus("todos")}>Todos <em>{orders.length}</em></button>
          {STATUS.map((st) => (
            <button key={st.id} className={status === st.id ? "on" : ""} onClick={() => setStatus(st.id)}>{st.label} <em>{orders.filter((o) => o.status === st.id).length}</em></button>
          ))}
        </div>
        <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, telefone ou nº" aria-label="Buscar pedido" /></label>
      </div>
      <div className="crm-actions">
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv("pedidos", CSV.pedidos(list))}><Download size={15} /> <span>Exportar pedidos</span></button>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv("pedidos-itens", CSV.linhas(list))}><Download size={15} /> <span>Exportar itens dos pedidos</span></button>
      </div>
      {list.length === 0 && <p className="adm-note">Nenhum pedido neste filtro.</p>}
      {list.map((o) => (
        <article key={o.id} className={`ord st-${o.status}`}>
          <header>
            <div><b>{num(o.id)}</b><small>{stamp(o.createdAt)}</small></div>
            <select value={o.status} onChange={(e) => onStatus(o.id, e.target.value as OrderStatus)} aria-label={`Situação do pedido ${num(o.id)}`}>
              {STATUS.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
            </select>
            <strong>{fmt(o.total)}</strong>
          </header>
          <div className="ord-who">
            <b>{o.name}</b>
            <a href={`https://wa.me/55${digits(o.phone)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> {o.phone}</a>
          </div>
          <p className="ord-when">{o.delivery === "entrega" ? "Entrega" : "Retirada"} em {fmtDate(o.date)} às {o.time} · {payLabel(o.pay)}{o.troco ? ` (troco ${o.troco})` : ""}</p>
          {(o.address || o.mapLink) && (
            <p className="ord-addr"><MapPin size={14} /> {o.address || "Localização no mapa"} {o.mapLink && <a href={o.mapLink} target="_blank" rel="noopener noreferrer">Abrir mapa</a>}</p>
          )}
          <ul>
            {o.items.map((i, k) => (
              <li key={k}><b>{i.qty}×</b> {i.name}{i.size ? ` · ${i.size}` : ""}{i.pct ? ` · promo -${i.pct}%` : ""}{i.flavors.length ? <small> — {i.flavors.join(", ")}</small> : null}{i.obs ? <small> — obs.: {i.obs}</small> : null}<span>{fmt(i.qty * i.price)}</span></li>
            ))}
          </ul>
          {o.notes && <p className="ord-note">Obs. do pedido: {o.notes}</p>}
        </article>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- clientes */
function Clientes({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const all = useMemo(() => byCustomer(orders), [orders]);
  const list = all.filter((c) => !q.trim() || (c.name + " " + c.phone).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="crm-filters">
        <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" /></label>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv("clientes", CSV.clientes(list))}><Download size={15} /> <span>Exportar clientes</span></button>
      </div>
      <p className="adm-note">{list.length} cliente(s). Toque em um cliente para ver o histórico.</p>
      {list.map((c) => {
        const mine = orders.filter((o) => digits(o.phone) === c.key).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return (
          <section key={c.key} className={`cust${open === c.key ? " open" : ""}`}>
            <button className="cust-head" onClick={() => setOpen(open === c.key ? null : c.key)} aria-expanded={open === c.key}>
              <div><b>{c.name}</b><small>{c.phone}</small></div>
              <div className="cust-nums"><span>{c.orders} pedido(s)</span><span>ticket {fmt(c.ticket)}</span><strong>{fmt(c.total)}</strong></div>
            </button>
            {open === c.key && (
              <div className="cust-body">
                <p className="adm-note">Cliente desde {stamp(c.first)} · último pedido {stamp(c.last)}</p>
                <div className="adm-grid2">
                  <div><h3>Mais pedidos</h3><HBars unit="count" data={c.items.slice(0, 6).map((i) => ({ label: i.name, value: i.qty }))} /></div>
                  <div>
                    <h3>Histórico</h3>
                    <ul className="hist">
                      {mine.map((o) => <li key={o.id}><span>{stamp(o.createdAt)} · {num(o.id)} · {statusLabel(o.status)}</span><b>{fmt(o.total)}</b><small>{o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</small></li>)}
                    </ul>
                  </div>
                </div>
                <a className="btn btn-outline btn-sm" href={`https://wa.me/55${c.key}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> <span>Chamar no WhatsApp</span></a>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------- itens */
function Itens({ orders }: { orders: Order[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const items = useMemo(() => byItem(orders), [orders]);
  const total = items.reduce((a, i) => a + i.revenue, 0);
  const hist = sel ? orders.filter((o) => counts(o) && o.items.some((i) => i.name === sel)) : [];
  return (
    <>
      <div className="crm-actions"><button className="btn btn-outline btn-sm" onClick={() => downloadCsv("itens-vendidos", CSV.itens(items))}><Download size={15} /> <span>Exportar itens vendidos</span></button></div>
      <section className="adm-card"><h2>Faturamento por item</h2><HBars data={items.slice(0, 12).map((i) => ({ label: i.name, value: i.revenue, sub: `${i.qty} un. em ${i.orders} pedido(s)` }))} /></section>
      <section className="adm-card">
        <h2>Todos os itens</h2>
        <p className="adm-note">Toque em um item para ver quem comprou.</p>
        <div className="tbl">
          {items.map((i) => (
            <button key={i.name} className={sel === i.name ? "on" : ""} onClick={() => setSel(sel === i.name ? null : i.name)}>
              <span>{i.name}</span><span>{i.qty} un.</span><span>{total ? Math.round((i.revenue / total) * 100) : 0}%</span><b>{fmt(i.revenue)}</b>
            </button>
          ))}
          {items.length === 0 && <p className="adm-note">Sem vendas no período.</p>}
        </div>
      </section>
      {sel && (
        <section className="adm-card">
          <h2>Histórico de “{sel}”</h2>
          <ul className="hist">
            {hist.map((o) => {
              const line = o.items.filter((i) => i.name === sel);
              return <li key={o.id}><span>{stamp(o.createdAt)} · {o.name}</span><b>{line.reduce((a, i) => a + i.qty, 0)} un.</b><small>{num(o.id)} · {statusLabel(o.status)}</small></li>;
            })}
          </ul>
        </section>
      )}
    </>
  );
}
