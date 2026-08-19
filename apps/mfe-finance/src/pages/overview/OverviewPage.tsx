import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OverviewPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    period: "month",
    grain: "day",
    currency: "default",
    location: "all",
    features: ["all"],
    includeTest: false,
    view: "live",
    drill: null as any,
  });

  const s = state;

  const inr = (n: number) => {
    const sStr = Math.round(Math.abs(n)).toString();
    let out = sStr;
    if (sStr.length > 3) {
      const last3 = sStr.substring(sStr.length - 3);
      const other = sStr.substring(0, sStr.length - 3);
      out = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return (n < 0 ? "-₹" : "₹") + out;
  };

  const drillFor = (title: string, subtitle: string, filters: string[], countLabel: string, total: string, rows: any[], payloadStr: string) => {
    return () => setState({
      ...s,
      drill: {
        title, subtitle, countLabel, total, rows, payload: payloadStr,
        chips: [
          { text: s.location === "all" ? "All locations" : (s.location === "kaloor" ? "Kaloor Main" : (s.location === "edapally" ? "Edappally" : "Thrissur")) },
          { text: s.currency === "default" ? "Base currency (INR)" : s.currency },
          ...filters.map((f) => ({ text: f })),
        ],
      },
    });
  };

  const payload = (filters: string, sorts: string) => {
    return "{\n  \"filters\": " + filters + ",\n  \"sorts\": " + sorts + ",\n  \"size\": 100\n}";
  };

  const V = s.view;
  const money = (n: number) => inr(n);

  const periods = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "month", label: "This month" },
    { key: "lastmonth", label: "Last month" },
    { key: "ytd", label: "YTD" },
  ].map((p) => ({
    label: p.label,
    bg: s.period === p.key ? "#55349A" : "transparent",
    fg: s.period === p.key ? "#ffffff" : "#64748b",
    pick: () => setState({ ...s, period: p.key }),
  }));

  const grains = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ].map((g) => ({
    label: g.label,
    bg: s.grain === g.key ? "#f1f5f9" : "transparent",
    fg: s.grain === g.key ? "#0f172a" : "#94a3b8",
    pick: () => setState({ ...s, grain: g.key }),
  }));

  const featureDefs = [
    { key: "all", label: "All domains" },
    { key: "HEALTHCARE", label: "Healthcare" },
    { key: "E_COMMERCE", label: "E-commerce" },
    { key: "BOOKING", label: "Booking" },
    { key: "FINANCE", label: "Direct finance" },
  ];
  const features = featureDefs.map((f) => {
    const on = s.features.indexOf(f.key) >= 0;
    return {
      label: f.label,
      bg: on ? "rgba(5,150,105,.08)" : "#fff",
      bd: on ? "#059669" : "#e2e8f0",
      fg: on ? "#047857" : "#64748b",
      toggle: () => {
        if (f.key === "all") return setState({ ...s, features: ["all"] });
        let next = s.features.filter((k) => k !== "all");
        next = on ? next.filter((k) => k !== f.key) : next.concat([f.key]);
        setState({ ...s, features: next.length ? next : ["all"] });
      },
    };
  });

  const states = [
    { key: "live", label: "Live data" },
    { key: "loading", label: "Loading" },
    { key: "empty", label: "Empty (new tenant)" },
    { key: "partial", label: "Partial" },
    { key: "error", label: "Error" },
  ].map((st) => ({
    label: st.label,
    bg: V === st.key ? "#0f172a" : "#fff",
    bd: V === st.key ? "#0f172a" : "#e2e8f0",
    fg: V === st.key ? "#fff" : "#64748b",
    pick: () => setState({ ...s, view: st.key }),
  }));

  const spark = (vals: number[]) => {
    const max = Math.max.apply(null, vals);
    const min = Math.min.apply(null, vals);
    const span = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 120;
      const y = 24 - ((v - min) / span) * 20;
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    return { line: pts.join(" "), area: "M0,26 L" + pts.join(" L") + " L120,26 Z" };
  };

  const kpiDefs = [
    {
      label: "Invoiced", value: money(1842360), delta: "▲ 12.4%", up: true, deltaNote: "vs prior 31d", note: "SUM(net_rate) · masters only, excl. drafts & cancelled", vals: [8, 11, 9, 14, 13, 17, 16, 21, 19, 24, 26],
      drill: ["Invoiced this month", "₹18,42,360 across 703 invoices", ["invoiceDate BETWEEN 2026-08-01..2026-08-31", "invoiceStatus IN [New, Settled]", "internalInvoiceType IN [INDIVIDUAL_INVOICE, MASTER_INVOICE]"], "Invoices", "₹18,42,360"],
    },
    {
      label: "Collected", value: money(1508940), delta: "▲ 8.1%", up: true, deltaNote: "vs prior 31d", note: "SUM(payment.amount) WHERE is_payments_in · excl. test", vals: [6, 9, 8, 12, 11, 14, 15, 18, 17, 21, 22],
      drill: ["Collected this month", "₹15,08,940 across 486 payments in", ["paymentOn BETWEEN 2026-08-01..2026-08-31", "isPaymentsIn = true", "isTestTransaction = false", "isReverseTxn = false"], "Payments in", "₹15,08,940"],
    },
    {
      label: "Outstanding", value: money(486210), delta: "▼ 4.2%", up: true, deltaNote: "vs last month end", note: "Level, not a flow — as of now, not summed over the period", vals: [22, 21, 23, 20, 19, 20, 18, 17, 18, 16, 15],
      drill: ["Total outstanding", "₹4,86,210 across 191 invoices with a balance", ["amountDue > 0", "invoiceStatus IN [New, Settled]", "as of now — no date window"], "Invoices", "₹4,86,210"],
    },
    {
      label: "Expenses", value: money(612480), delta: "▲ 3.2%", up: false, deltaNote: "vs prior 31d", note: "SUM(amount) on expense_tbl · all categories", vals: [10, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18],
      drill: ["Expenses this month", "₹6,12,480 across 121 expenses", ["expenseDate BETWEEN 2026-08-01..2026-08-31"], "Expenses", "₹6,12,480"],
    },
    {
      label: "Cash in hand", value: money(84750), delta: "▲ ₹6,200", up: true, deltaNote: "since yesterday", note: "cash_balance_tbl · one row per location, no history", vals: [12, 13, 12, 14, 15, 14, 16, 15, 17, 18, 19],
      drill: ["Cash in hand", "₹84,750 across 3 locations", ["direct read of cash_balance_tbl", "UNIQUE (tenant_uid, location_uid)"], "Locations", "₹84,750"],
    },
  ];

  const kpis = kpiDefs.map((k) => ({
    label: k.label,
    value: k.value,
    delta: k.delta,
    deltaFg: k.up ? "#059669" : "#e11d48",
    deltaBg: k.up ? "#ecfdf5" : "#fff1f2",
    deltaNote: k.deltaNote,
    note: k.note,
    spark: spark(k.vals),
    open: drillFor(
      k.drill[0] as string,
      k.drill[1] as string,
      k.drill[2] as string[],
      k.drill[3] as string,
      k.drill[4] as string,
      [
        { primary: "INV-2026-0847", secondary: "Anjali Menon · Kaloor Main · Healthcare", amount: "₹24,800", meta: "Fully paid" },
        { primary: "INV-2026-0846", secondary: "Cochin Traders LLP · Edappally · E-commerce", amount: "₹1,12,400", meta: "Partially paid" },
        { primary: "INV-2026-0845", secondary: "Rahul Varma · Kaloor Main · Booking", amount: "₹3,200", meta: "Fully paid" },
        { primary: "INV-2026-0844", secondary: "Sreelakshmi P · Thrissur · Healthcare", amount: "₹18,650", meta: "Not paid" },
        { primary: "INV-2026-0843", secondary: "Deepa Nair · Kaloor Main · Direct finance", amount: "₹9,400", meta: "Fully paid" },
        { primary: "INV-2026-0842", secondary: "Kerala Agencies · Edappally · E-commerce", amount: "₹67,300", meta: "Not paid" },
      ],
      payload(
        '[\n  { "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] },\n  { "field": "invoiceStatus", "op": "IN", "value": ["New", "Settled"] }\n]',
        '[\n  { "field": "invoiceDate", "dir": "DESC" }\n]'
      )
    ),
  }));

  const attention = [
    { count: 17, label: "Prepayment failures — stuck transactions", tone: "red", drill: ["Prepayment failures", "17 invoices in a failed or pending prepayment state", ["invoiceStatus IN [FAILED_INVOICE, PREPAYMENT_PENDING_INVOICE]"], "Invoices", "₹1,04,300"] },
    { count: 87, label: "Invoices overdue with a balance", tone: "amber", drill: ["Overdue invoices", "87 invoices past due date with amount_due > 0", ["dueDate LT now", "amountDue > 0"], "Invoices", "₹2,44,310"] },
    { count: 34, label: "Drafts not yet issued", tone: "amber", drill: ["Draft backlog", "34 drafts worth ₹2,94,600 — not counted as revenue", ["invoiceStatus EQ Draft"], "Drafts", "₹2,94,600"] },
    { count: 25, label: "Expenses awaiting payout", tone: "blue", drill: ["Expenses awaiting payout", "25 expenses with an outstanding payout", ["payoutStatus IN [NO_PAYOUT, PARTIALLY_PAYOUT]"], "Expenses", "₹2,07,100"] },
  ].map((a) => {
    const t = a.tone === "red" ? { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c", lfg: "#7f1d1d" }
      : a.tone === "amber" ? { bg: "#fdf3e1", bd: "#f0dcb2", fg: "#b45309", lfg: "#6e5000" }
      : { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", lfg: "#1e3a8a" };
    return {
      count: a.count, label: a.label, bg: t.bg, bd: t.bd, fg: t.fg, lfg: t.lfg,
      open: drillFor(
        a.drill[0] as string,
        a.drill[1] as string,
        a.drill[2] as string[],
        a.drill[3] as string,
        a.drill[4] as string,
        [
          { primary: "INV-2026-0812", secondary: "Anjali Menon · +91 98470 21188", amount: "₹18,400", meta: "42 days" },
          { primary: "INV-2026-0798", secondary: "Cochin Traders LLP · +91 99610 40021", amount: "₹64,200", meta: "58 days" },
          { primary: "INV-2026-0771", secondary: "Rahul Varma · +91 97440 11002", amount: "₹7,900", meta: "71 days" },
        ],
        payload(
          '[\n  { "field": "invoiceStatus", "op": "IN", "value": ["New"] }\n]',
          '[\n  { "field": "dueDate", "dir": "ASC" }\n]'
        )
      ),
    };
  });

  /* revenue trend */
  const invoiced = [42, 58, 51, 74, 66, 88, 61, 95, 79, 108, 92, 121, 104, 133];
  const collected = [31, 47, 44, 61, 55, 72, 52, 80, 66, 88, 78, 99, 87, 112];
  const maxV = 140;
  const stepW = 760 / invoiced.length;
  const barW = stepW * 0.34;
  const y = (v: number) => 222 - (v / maxV) * 176;
  const bars = collected.map((v, i) => {
    const top = y(v);
    return { x: (i * stepW + stepW / 2 - barW / 2).toFixed(1), y: top.toFixed(1), w: barW.toFixed(1), h: (222 - top).toFixed(1) };
  });
  const linePts = invoiced.map((v, i) => (i * stepW + stepW / 2).toFixed(1) + "," + y(v).toFixed(1));
  const trend = {
    bars,
    line: linePts.join(" "),
    area: "M" + (stepW / 2).toFixed(1) + ",222 L" + linePts.join(" L") + " L" + (760 - stepW / 2).toFixed(1) + ",222 Z",
    labels: ["1 Aug", "4 Aug", "7 Aug", "9 Aug", "11 Aug"].map((t) => ({ text: t })),
  };

  const modeRaw = [
    { label: "UPI", v: 512300, c: "#55349A", raw: "UPI" },
    { label: "Cash", v: 442100, c: "#f59e0b", raw: "Cash, Offline" },
    { label: "Card", v: 386400, c: "#10b981", raw: "CC, DC, EMI" },
    { label: "Bank / net-banking", v: 108900, c: "#8b5cf6", raw: "NB, BANK_TRANSFER" },
    { label: "Credit & wallet", v: 59240, c: "#94a3b8", raw: "CREDIT, STORE_CREDIT, PAYLATER, WALLET, PAYTM_PostPaid" },
  ];
  const modeTotal = modeRaw.reduce((a, m) => a + m.v, 0);
  const circ = 2 * Math.PI * 54;
  let acc = 0;
  const modes = modeRaw.map((m) => {
    const frac = m.v / modeTotal;
    const dash = (frac * circ - 2).toFixed(1) + " " + circ.toFixed(1);
    const off = (-acc * circ).toFixed(1);
    acc += frac;
    return {
      label: m.label, c: m.c, value: money(m.v), pct: (frac * 100).toFixed(1) + "%",
      dash, off,
      open: drillFor("Payment mode · " + m.label, money(m.v) + " collected · raw modes: " + m.raw,
        ["paymentMode IN [" + m.raw + "]", "isPaymentsIn = true", "isTestTransaction = false"], "Payments", money(m.v),
        [
          { primary: "RCPT-2026-3391", secondary: "Anjali Menon · Kaloor Main", amount: "₹24,800", meta: "SUCCESS" },
          { primary: "RCPT-2026-3388", secondary: "Rahul Varma · Kaloor Main", amount: "₹3,200", meta: "SETTLED" },
        ],
        payload('[\n  { "field": "paymentMode", "op": "IN", "value": ["' + m.raw.split(", ").join('", "') + '"] }\n]', '[\n  { "field": "paymentOn", "dir": "DESC" }\n]')),
    };
  });

  const provRaw = [
    { label: "Healthcare", v: 984200, c: "#0D9488", n: 318, key: "HEALTHCARE", mod: "HEALTHCARE_IP, HEALTHCARE_LAB" },
    { label: "E-commerce", v: 512660, c: "#EA580C", n: 214, key: "E_COMMERCE", mod: "E_COMMERCE_ORDER" },
    { label: "Booking", v: 204300, c: "#2563EB", n: 128, key: "BOOKING", mod: "BOOKING_APPOINTMENT" },
    { label: "Direct finance", v: 141200, c: "#059669", n: 43, key: "FINANCE", mod: "FINANCE_INVOICE" },
  ];
  const provTotal = provRaw.reduce((a, p) => a + p.v, 0);
  const provenance = provRaw.map((p) => ({
    label: p.label, c: p.c, value: money(p.v),
    pctStr: ((p.v / provTotal) * 100).toFixed(1) + "%",
    meta: p.n + " invoices · " + ((p.v / provTotal) * 100).toFixed(1) + "% of revenue · feature_module " + p.mod,
    open: drillFor("Revenue from " + p.label, money(p.v) + " across " + p.n + " invoices",
      ["feature EQ " + p.key, "invoiceDate BETWEEN 2026-08-01..2026-08-31", "invoiceStatus IN [New, Settled]"], "Invoices", money(p.v),
      [
        { primary: "INV-2026-0847", secondary: "Anjali Menon · " + p.label + " · Kaloor Main", amount: "₹24,800", meta: "Fully paid" },
        { primary: "INV-2026-0841", secondary: "Sreelakshmi P · " + p.label + " · Thrissur", amount: "₹18,650", meta: "Not paid" },
      ],
      payload('[\n  { "field": "feature", "op": "EQ", "value": "' + p.key + '" }\n]', '[\n  { "field": "netRate", "dir": "DESC" }\n]')),
  }));

  const locRaw = [
    { name: "Kaloor Main", v: 892400, n: 341, key: "kaloor" },
    { name: "Edappally", v: 618700, n: 236, key: "edapally" },
    { name: "Thrissur", v: 331260, n: 126, key: "thrissur" },
  ];
  const locMax = 892400;
  const locations = locRaw.map((l) => ({
    name: l.name, value: money(l.v),
    pctStr: ((l.v / locMax) * 100).toFixed(1) + "%",
    meta: l.n + " invoices · AOV " + money(Math.round(l.v / l.n)) + " · " + ((l.v / provTotal) * 100).toFixed(1) + "% of revenue",
    open: drillFor(l.name, money(l.v) + " invoiced across " + l.n + " invoices",
      ["locationUid EQ " + l.key, "invoiceDate BETWEEN 2026-08-01..2026-08-31"], "Invoices", money(l.v),
      [
        { primary: "INV-2026-0847", secondary: "Anjali Menon · Healthcare", amount: "₹24,800", meta: "Fully paid" },
      ],
      payload('[\n  { "field": "locationUid", "op": "EQ", "value": "' + l.key + '" }\n]', '[\n  { "field": "invoiceDate", "dir": "DESC" }\n]')),
  }));

  const gwRaw = [
    { label: "Success", n: 412, c: "#059669", key: "SUCCESS" },
    { label: "Settled", n: 388, c: "#0D9488", key: "SETTLED" },
    { label: "Failed", n: 27, c: "#DC2626", key: "FAILED" },
    { label: "Pending", n: 9, c: "#D97706", key: "PENDING" },
    { label: "Not found", n: 2, c: "#94a3b8", key: "NOT_FOUND" },
  ];
  const gwTotal = gwRaw.reduce((a, g) => a + g.n, 0);
  const gateway = gwRaw.map((g) => ({
    label: g.label, c: g.c, count: g.n, pct: ((g.n / gwTotal) * 100).toFixed(1) + "%",
    open: drillFor("Gateway status · " + g.label, g.n + " gateway payments",
      ["gatewayStatus EQ " + g.key, "paymentGateway IN [PAYTM, RAZORPAY]"], "Payments", g.n + " rows",
      [
        { primary: "RCPT-2026-3391", secondary: "Razorpay · pay_Nx82kQ · Anjali Menon", amount: "₹24,800", meta: g.label },
      ],
      payload('[\n  { "field": "gatewayStatus", "op": "EQ", "value": "' + g.key + '" }\n]', '[\n  { "field": "paymentOn", "dir": "DESC" }\n]')),
  }));

  const ageRaw = [
    { bucket: "0–30 d", v: 241900, c: "#10b981" },
    { bucket: "31–60 d", v: 132400, c: "#f59e0b" },
    { bucket: "61–90 d", v: 68700, c: "#EA580C" },
    { bucket: "90+ d", v: 43210, c: "#DC2626" },
  ];
  const ageing = ageRaw.map((a) => ({
    bucket: a.bucket, c: a.c, value: money(a.v),
    pctStr: ((a.v / 241900) * 100).toFixed(1) + "%",
    open: drillFor("AR ageing · " + a.bucket, money(a.v) + " outstanding in this bucket",
      ["amountDue > 0", "dueDate within " + a.bucket, "dueDate IS NOT NULL"], "Invoices", money(a.v),
      [
        { primary: "INV-2026-0812", secondary: "Anjali Menon · Kaloor Main", amount: "₹18,400", meta: "due 12 Jul" },
      ],
      payload('[\n  { "field": "amountDue", "op": "GT", "value": 0 }\n]', '[\n  { "field": "dueDate", "dir": "ASC" }\n]')),
  }));

  const debtorRaw = [
    { name: "Cochin Traders LLP", phone: "+91 99610 40021", v: 96400, age: "58 d oldest" },
    { name: "Kerala Agencies", phone: "+91 94470 88123", v: 71300, age: "96 d oldest" },
    { name: "Nidiya Textiles", phone: "+91 98460 12907", v: 54800, age: "41 d oldest" },
    { name: "Sreelakshmi P", phone: "+91 98950 33417", v: 38200, age: "104 d oldest" },
    { name: "Anjali Menon", phone: "+91 98470 21188", v: 29600, age: "42 d oldest" },
    { name: "Kemtex Industries", phone: "+91 90740 55210", v: 24100, age: "19 d oldest" },
    { name: "Rahul Varma", phone: "+91 97440 11002", v: 18900, age: "71 d oldest" },
    { name: "Deepa Nair", phone: "+91 99950 71234", v: 14700, age: "11 d oldest" },
  ];
  const debtors = debtorRaw.map((d, i) => ({
    rank: i + 1, name: d.name, meta: d.phone, value: money(d.v), age: d.age,
    ageFg: parseInt(d.age, 10) > 60 ? "#b91c1c" : "#94a3b8",
    open: drillFor(d.name, money(d.v) + " outstanding · " + d.phone,
      ["consumerUid EQ " + d.name.toLowerCase().split(" ").join("-"), "amountDue > 0"], "Open invoices", money(d.v),
      [
        { primary: "INV-2026-0798", secondary: "Edappally · E-commerce · due 28 Jun", amount: "₹64,200", meta: "Partially paid" },
      ],
      payload('[\n  { "field": "amountDue", "op": "GT", "value": 0 }\n]', '[\n  { "field": "dueDate", "dir": "ASC" }\n]')),
  }));

  const mixRaw = [
    { label: "Fully paid", n: 486, v: 1508940, c: "#059669" },
    { label: "Not paid", n: 63, v: 218400, c: "#DC2626" },
    { label: "Partially paid", n: 41, v: 184600, c: "#f59e0b" },
    { label: "Refund", n: 7, v: 18200, c: "#8b5cf6" },
    { label: "Partially refunded", n: 3, v: 6400, c: "#a78bfa" },
    { label: "Fully refunded", n: 2, v: 3100, c: "#c4b5fd" },
  ];
  const mixMax = 486;
  const statusMix = mixRaw.map((m) => ({
    label: m.label, count: m.n + " inv", value: money(m.v), c: m.c,
    pctStr: ((m.n / mixMax) * 100).toFixed(1) + "%",
    open: drillFor("Payment status · " + m.label, m.n + " invoices worth " + money(m.v),
      ['invoicePaymentStatus display "' + m.label + '"'], "Invoices", money(m.v),
      [
        { primary: "INV-2026-0847", secondary: "Anjali Menon · Kaloor Main", amount: "₹24,800", meta: m.label },
      ],
      payload('[\n  { "field": "invoicePaymentStatus", "op": "EQ", "value": "' + m.label.split(" ").join("") + '" }\n]', '[\n  { "field": "invoiceDate", "dir": "DESC" }\n]')),
  }));

  const originStyle = (o: string) => o === "Healthcare" ? { bg: "rgba(13,148,136,.1)", fg: "#0f766e" }
    : o === "E-commerce" ? { bg: "rgba(234,88,12,.1)", fg: "#c2410c" }
    : o === "Booking" ? { bg: "rgba(37,99,235,.1)", fg: "#1d4ed8" }
    : { bg: "rgba(5,150,105,.1)", fg: "#047857" };
  const dueSoonRaw = [
    { num: "INV-2026-0839", name: "Nidiya Textiles", due: "12 Aug", v: 54800, origin: "E-commerce" },
    { num: "INV-2026-0841", name: "Sreelakshmi P", due: "13 Aug", v: 18650, origin: "Healthcare" },
    { num: "INV-2026-0836", name: "Kemtex Industries", due: "14 Aug", v: 24100, origin: "E-commerce" },
    { num: "INV-2026-0844", name: "Anjali Menon", due: "15 Aug", v: 11200, origin: "Healthcare" },
    { num: "INV-2026-0846", name: "Cochin Traders LLP", due: "16 Aug", v: 32200, origin: "E-commerce" },
    { num: "INV-2026-0848", name: "Rahul Varma", due: "18 Aug", v: 4600, origin: "Booking" },
  ];
  const dueSoon = dueSoonRaw.map((d) => {
    const st = originStyle(d.origin);
    return {
      num: d.num, name: d.name, due: d.due, value: money(d.v), origin: d.origin,
      originBg: st.bg, originFg: st.fg,
      open: drillFor(d.num, d.name + " · due " + d.due + " · " + money(d.v) + " outstanding",
        ["uid EQ " + d.num, "amountDue > 0"], "Payments against this invoice", money(d.v),
        [
          { primary: "RCPT-2026-3288", secondary: "UPI · 8 Aug · self pay", amount: "₹12,000", meta: "SUCCESS" },
        ],
        payload('[\n  { "field": "paymentFor", "op": "EQ", "value": "INVOICE" }\n]', '[\n  { "field": "paymentOn", "dir": "DESC" }\n]')),
    };
  });

  const catRaw = [
    { label: "Salaries", v: 242000, c: "#55349A" },
    { label: "Rent", v: 180000, c: "#8b5cf6" },
    { label: "Consumables", v: 74300, c: "#f59e0b" },
    { label: "Marketing", v: 41200, c: "#10b981" },
    { label: "Utilities", v: 38900, c: "#0D9488" },
    { label: "Other (9 categories)", v: 36080, c: "#94a3b8" },
  ];
  const categories = catRaw.map((c) => ({
    label: c.label, c: c.c, value: money(c.v),
    pctStr: ((c.v / 242000) * 100).toFixed(1) + "%",
    open: drillFor("Expenses · " + c.label, money(c.v) + " this month",
      ['categoryName EQ "' + c.label + '"', "expenseDate BETWEEN 2026-08-01..2026-08-31"], "Expenses", money(c.v),
      [
        { primary: "EXP-2026-0412", secondary: "August payroll · Kaloor Main", amount: "₹1,82,000", meta: "Fully payout" },
      ],
      payload('[\n  { "field": "categoryName", "op": "EQ", "value": "' + c.label + '" }\n]', '[\n  { "field": "expenseDate", "dir": "DESC" }\n]')),
  }));

  const payoutStatus = [
    { label: "No payout", n: 18, v: 142300, c: "#DC2626" },
    { label: "Partially payout", n: 7, v: 64800, c: "#f59e0b" },
    { label: "Fully payout", n: 96, v: 0, c: "#059669" },
  ].map((p) => ({
    label: p.label, c: p.c, meta: p.n + " expenses",
    value: p.v ? money(p.v) + " due" : "₹0 due",
    open: drillFor("Payout status · " + p.label, p.n + " expenses · " + money(p.v) + " still owed",
      ["payoutStatus EQ " + p.label.toUpperCase().split(" ").join("_")], "Expenses", money(p.v),
      [
        { primary: "EXP-2026-0399", secondary: "Medical consumables · Bharat Surgicals", amount: "₹64,200", meta: p.label },
      ],
      payload('[\n  { "field": "payoutStatus", "op": "EQ", "value": "NO_PAYOUT" }\n]', '[\n  { "field": "expenseDate", "dir": "DESC" }\n]')),
  }));

  const cash = [
    { name: "Kaloor Main", v: 48300 },
    { name: "Edappally", v: 24150 },
    { name: "Thrissur", v: 12300 },
  ].map((c) => ({
    name: c.name, value: money(c.v),
    open: drillFor("Cash in hand · " + c.name, money(c.v) + " as of now — no history is stored",
      ["cash_balance_tbl", "locationUid EQ " + c.name], "Cash register movements today", money(c.v),
      [
        { primary: "Opening float", secondary: "11 Aug · 09:00", amount: "₹20,000", meta: "set by Rekha" },
      ],
      payload('[\n  { "field": "locationUid", "op": "EQ", "value": "kaloor" }\n]', '[\n  { "field": "paymentOn", "dir": "DESC" }\n]')),
  }));

  const invoiceStatus = [
    { label: "New", n: 128, tone: "ink" },
    { label: "Settled", n: 486, tone: "green" },
    { label: "Draft", n: 34, tone: "amber" },
    { label: "Cancelled", n: 19, tone: "red" },
    { label: "Prepayment Failed Invoice", n: 11, tone: "red" },
    { label: "Prepayment Pending Invoice", n: 6, tone: "amber" },
  ].map((st) => {
    const t = st.tone === "green" ? { bg: "#ecfdf5", bd: "#a7f3d0", fg: "#059669", lfg: "#065f46" }
      : st.tone === "amber" ? { bg: "#fef3c7", bd: "#fde68a", fg: "#b45309", lfg: "#92400e" }
      : st.tone === "red" ? { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c", lfg: "#991b1b" }
      : { bg: "#f8fafc", bd: "#e2e8f0", fg: "#0f172a", lfg: "#475569" };
    return {
      label: st.label, count: st.n, bg: t.bg, bd: t.bd, fg: t.fg, lfg: t.lfg,
      open: drillFor("Invoices · " + st.label, st.n + " invoices in state " + st.label,
        ["invoiceStatus EQ " + st.label], "Invoices", st.n + " rows",
        [
          { primary: "INV-2026-0847", secondary: "Anjali Menon · Kaloor Main", amount: "₹24,800", meta: st.label },
        ],
        payload('[\n  { "field": "invoiceStatus", "op": "EQ", "value": "' + st.label + '" }\n]', '[\n  { "field": "invoiceDate", "dir": "DESC" }\n]')),
    };
  });

  const cancelVals = [14, 16, 12, 19, 15, 22, 18, 19];
  const maxCancel = Math.max.apply(null, cancelVals);
  const cancelTrend = cancelVals.map((v, i) => ({
    hStr: ((v / maxCancel) * 100).toFixed(1) + "%",
    c: i === cancelVals.length - 1 ? "#55349A" : "#ddd6fe",
  }));

  const tax = [
    { label: "CGST", v: 62340 },
    { label: "SGST", v: 62340 },
    { label: "IGST", v: 18900 },
    { label: "Cess", v: 2140 },
  ].map((t) => ({
    label: t.label, value: money(t.v),
    open: drillFor("GST · " + t.label, money(t.v) + " this period",
      ["SUM(" + t.label.toLowerCase() + ")", "invoiceDate BETWEEN 2026-08-01..2026-08-31"], "Invoices contributing", money(t.v),
      [
        { primary: "INV-2026-0846", secondary: "Cochin Traders LLP · GSTIN 32AABCU9603R1ZM", amount: "₹8,420", meta: "18% slab" },
      ],
      payload('[\n  { "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }\n]', '[\n  { "field": "taxTotal", "dir": "DESC" }\n]')),
  }));

  const activityRaw = [
    { kind: "pay", ref: "RCPT-2026-3391", who: "Anjali Menon · UPI", amount: "+₹24,800", when: "4 min ago" },
    { kind: "inv", ref: "INV-2026-0848", who: "Rahul Varma · Booking", amount: "₹4,600", when: "22 min ago" },
    { kind: "pay", ref: "RCPT-2026-3390", who: "Deepa Nair · Cash", amount: "+₹9,400", when: "48 min ago" },
    { kind: "out", ref: "PAY-OUT-1182", who: "Bharat Surgicals · Bank transfer", amount: "-₹64,200", when: "1 h ago" },
    { kind: "inv", ref: "INV-2026-0847", who: "Cochin Traders LLP · E-commerce", amount: "₹1,12,400", when: "2 h ago" },
    { kind: "pay", ref: "RCPT-2026-3388", who: "Kerala Agencies · Razorpay", amount: "+₹41,900", when: "3 h ago" },
    { kind: "inv", ref: "INV-2026-0846", who: "Sreelakshmi P · Healthcare", amount: "₹18,650", when: "5 h ago" },
  ];
  const activity = activityRaw.map((a) => {
    const st = a.kind === "pay" ? { icon: "↓", iconBg: "#ecfdf5", iconFg: "#059669", amtFg: "#059669" }
      : a.kind === "out" ? { icon: "↑", iconBg: "#fef2f2", iconFg: "#b91c1c", amtFg: "#b91c1c" }
      : { icon: "🧾", iconBg: "#f1f5f9", iconFg: "#475569", amtFg: "#0f172a" };
    return {
      ref: a.ref, who: a.who, amount: a.amount, when: a.when,
      icon: st.icon, iconBg: st.iconBg, iconFg: st.iconFg, amtFg: st.amtFg,
      open: drillFor(a.ref, a.who + " · " + a.amount + " · " + a.when,
        ["uid EQ " + a.ref, "isTestTransaction = false"], "Related rows", a.amount,
        [
          { primary: "INV-2026-0847", secondary: "Linked invoice · Kaloor Main", amount: "₹24,800", meta: "Fully paid" },
        ],
        payload('[\n  { "field": "uid", "op": "EQ", "value": "' + a.ref + '" }\n]', '[\n  { "field": "createdAt", "dir": "DESC" }\n]')),
    };
  });

  const currency = s.currency;
  const location = s.location;
  const includeTest = s.includeTest;
  const testBg = s.includeTest ? "#55349A" : "#cbd5e1";
  const testX = s.includeTest ? "17px" : "2px";
  const onCurrency = (e: any) => setState({ ...s, currency: e.target.value });
  const onLocation = (e: any) => setState({ ...s, location: e.target.value });
  const onTest = () => setState({ ...s, includeTest: !s.includeTest });

  const kpiLoading = V === "loading";
  const kpiError = V === "error";
  const kpiEmpty = V === "empty";
  const kpiLive = V === "live" || V === "partial";
  const chartLoading = V === "loading";
  const chartError = V === "error";
  const chartEmpty = V === "empty";
  const chartLive = V === "live" || V === "partial";
  const chartPartial = V === "partial";
  const activityLive = V !== "loading";

  const openSettled = drillFor("Unsettled gateway money", "₹1,56,800 awaiting settlement across 41 payments",
    ["isSettled = false", "paymentGateway IN [PAYTM, RAZORPAY]"], "Payments", "₹1,56,800",
    [
      { primary: "RCPT-2026-3391", secondary: "Razorpay · UTR pending", amount: "₹24,800", meta: "SUCCESS" },
    ],
    payload('[\n  { "field": "isSettled", "op": "EQ", "value": false }\n]', '[\n  { "field": "paymentOn", "dir": "DESC" }\n]'));

  const openDueSoon = drillFor("Due in the next 7 days", "11 invoices worth ₹1,68,900 falling due",
    ["amountDue > 0", "dueDate BETWEEN now..now+7d"], "Invoices", "₹1,68,900",
    dueSoonRaw.map((d) => ({ primary: d.num, secondary: d.name + " · " + d.origin, amount: money(d.v), meta: "due " + d.due })),
    payload('[\n  { "field": "amountDue", "op": "GT", "value": 0 }\n]', '[\n  { "field": "dueDate", "dir": "ASC" }\n]'));

  const openDrafts = drillFor("Draft backlog", "34 drafts worth ₹2,94,600 — never counted as revenue",
    ["invoiceStatus EQ Draft"], "Drafts", "₹2,94,600",
    [
      { primary: "INV-2026-0849", secondary: "Started by Rekha · Kaloor Main", amount: "₹42,000", meta: "2 days old" },
    ],
    payload('[\n  { "field": "invoiceStatus", "op": "EQ", "value": "Draft" }\n]', '[\n  { "field": "createdAt", "dir": "ASC" }\n]'));

  const openLeakage = drillFor("Discount & coupon leakage", "₹1,15,800 given away — 5.9% of gross",
    ["discountTotal + couponTotal", "shared amounts counted on the master invoice only"], "Invoices", "₹1,15,800",
    [
      { primary: "INV-2026-0846", secondary: "Cochin Traders LLP · volume discount", amount: "₹14,200", meta: "12.6% of invoice" },
    ],
    payload('[\n  { "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }\n]', '[\n  { "field": "discountTotal", "dir": "DESC" }\n]'));

  const drill = s.drill;
  const closeDrill = () => setState({ ...s, drill: null });

  return (
    <div className="bg-[#f8fafc] text-[#0f172a] font-sans min-h-screen text-[13px] leading-normal p-4 sm:p-6 lg:p-8">
      <div className="relative w-full">
        {/* Header section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5 flex-wrap">
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Finance</span>
              <span className="text-xs text-slate-500">Tenant-wide · 3 locations · location is a filter, not a dimension</span>
            </div>
            <h1 className="m-0 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
            <p className="mt-1 text-sm text-slate-500">Where the money is this period — every number opens the rows behind it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select value={currency} onChange={onCurrency} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none">
              <option value="default">All → default currency (INR)</option>
              <option value="INR">INR only</option>
              <option value="USD">USD only</option>
              <option value="AED">AED only</option>
            </select>
            <select value={location} onChange={onLocation} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none">
              <option value="all">All locations</option>
              <option value="kaloor">Kaloor Main</option>
              <option value="edapally">Edappally</option>
              <option value="thrissur">Thrissur</option>
            </select>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto max-w-full">
              {periods.map((p, i) => (
                <button
                  key={i}
                  onClick={p.pick}
                  style={{ backgroundColor: p.bg, color: p.fg }}
                  className="cursor-pointer border-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Originating domain filter bar */}
        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Originating domain</span>
          <div className="flex flex-wrap gap-1.5">
            {features.map((f, i) => (
              <button
                key={i}
                onClick={f.toggle}
                style={{ backgroundColor: f.bg, borderColor: f.bd, color: f.fg }}
                className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="hidden lg:block flex-1" />
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 shrink-0 mt-1 md:mt-0">
            <span style={{ backgroundColor: testBg }} className="relative w-8 h-4 rounded-full transition-colors inline-block">
              <span style={{ left: testX }} className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all inline-block" />
            </span>
            <input type="checkbox" checked={includeTest} onChange={onTest} className="sr-only" />
            Include test transactions
          </label>
        </div>

        {/* Review state switcher */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-slate-300 rounded-xl p-3 bg-slate-500/5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Review states</span>
          <div className="flex flex-wrap gap-1.5">
            {states.map((st, i) => (
              <button
                key={i}
                onClick={st.pick}
                style={{ backgroundColor: st.bg, borderColor: st.bd, color: st.fg }}
                className="cursor-pointer text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all"
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {kpis.map((k, i) => (
            <div
              key={i}
              onClick={k.open}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm relative cursor-pointer hover:border-slate-300 transition-all"
            >
              <span className="absolute top-4 right-4 text-xs text-slate-300">↗</span>
              <div className="text-xs font-semibold text-slate-500 mb-2">{k.label}</div>
              {kpiLoading && (
                <>
                  <div className="h-6 rounded-lg bg-slate-100 animate-pulse mb-2" />
                  <div className="h-3 w-3/4 rounded-md bg-slate-100 animate-pulse" />
                </>
              )}
              {kpiError && (
                <>
                  <div className="text-xl font-bold text-slate-300">—</div>
                  <div className="text-xs text-rose-600 mt-1">Unavailable — aggregate query failed</div>
                </>
              )}
              {kpiEmpty && (
                <>
                  <div className="text-2xl font-bold text-slate-300">—</div>
                  <div className="text-xs text-slate-400 mt-1">No invoices yet</div>
                </>
              )}
              {kpiLive && (
                <>
                  <div className="text-2xl font-bold tracking-tight text-slate-900">{k.value}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 min-h-[20px]">
                    <span style={{ color: k.deltaFg, backgroundColor: k.deltaBg }} className="text-[11px] font-bold px-2 py-0.5 rounded-md">
                      {k.delta}
                    </span>
                    <span className="text-[11px] text-slate-400">{k.deltaNote}</span>
                  </div>
                  <svg viewBox="0 0 120 26" preserveAspectRatio="none" className="w-full h-6 block mt-2.5">
                    <path d={k.spark.area} fill="rgba(85,52,154,.08)" />
                    <polyline points={k.spark.line} fill="none" stroke="#55349A" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  <div className="text-[11px] text-slate-400 mt-1.5 leading-tight">{k.note}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Collection rate & Needs attention */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-2">Collection rate</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">81.9%</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">▲ 3.1 pts</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden my-3">
              <div className="w-[81.9%] h-full bg-[#55349A] rounded-full" />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>₹15,08,940 collected</span>
              <span>₹18,42,360 invoiced</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
              Collected ÷ invoiced for this period. Ratio can exceed 100% when payments land against older invoices.
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {attention.map((a, i) => (
                <button
                  key={i}
                  onClick={a.open}
                  style={{ backgroundColor: a.bg, borderColor: a.bd }}
                  className="flex items-center gap-3 text-left border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm"
                >
                  <span style={{ color: a.fg }} className="text-xl font-bold min-w-[24px]">
                    {a.count}
                  </span>
                  <span style={{ color: a.lfg }} className="text-xs font-semibold leading-tight">
                    {a.label}
                  </span>
                  <span style={{ color: a.fg }} className="ml-auto text-xs font-bold">
                    →
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
              <span className="text-amber-600 font-bold shrink-0">⚠</span>
              <span>
                14 invoices worth ₹57,340 have no <code className="font-mono text-[11px]">due_date</code> and are excluded from ageing buckets — they still count in Outstanding.
              </span>
            </div>
          </div>
        </div>

        {/* Section A: Revenue & collections */}
        <div className="flex items-center gap-3 my-6">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">A · Revenue &amp; collections</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Revenue trend */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Revenue trend</div>
                <div className="text-xs text-slate-500">Invoiced and collected, daily</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-1 bg-[#55349A] rounded mr-1.5 align-middle" />
                  Invoiced
                </span>
                <span className="text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 bg-amber-300 rounded mr-1.5 align-middle" />
                  Collected
                </span>
                <div className="flex gap-0.5 border border-slate-200 rounded-lg p-0.5">
                  {grains.map((g, i) => (
                    <button
                      key={i}
                      onClick={g.pick}
                      style={{ backgroundColor: g.bg, color: g.fg }}
                      className="cursor-pointer border-0 rounded px-2 py-1 text-[11px] font-semibold"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {chartLive && (
              <div className="overflow-x-auto">
                <svg viewBox="0 0 760 250" className="w-full min-w-[500px] block mt-2">
                  <line x1="0" y1="60" x2="760" y2="60" stroke="#f1f5f9" />
                  <line x1="0" y1="115" x2="760" y2="115" stroke="#f1f5f9" />
                  <line x1="0" y1="170" x2="760" y2="170" stroke="#f1f5f9" />
                  <line x1="0" y1="222" x2="760" y2="222" stroke="#e2e8f0" />
                  {trend.bars.map((b, i) => (
                    <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill="#fcd34d" />
                  ))}
                  <path d={trend.area} fill="rgba(85,52,154,.07)" />
                  <polyline points={trend.line} fill="none" stroke="#55349A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  {trend.labels.map((l, i) => (
                    <span key={i}>{l.text}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment mode split */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Payment mode split</div>
            <div className="text-xs text-slate-500">15 raw modes grouped into 5 buckets</div>
            <div className="flex justify-center my-4">
              <svg viewBox="0 0 140 140" className="w-32 h-32">
                {modes.map((m, i) => (
                  <circle
                    key={i}
                    cx="70"
                    cy="70"
                    r="54"
                    fill="none"
                    stroke={m.c}
                    strokeWidth="20"
                    strokeDasharray={m.dash}
                    strokeDashoffset={m.off}
                    transform="rotate(-90 70 70)"
                  />
                ))}
                <text x="70" y="66" textAnchor="middle" className="font-bold text-sm fill-slate-900">
                  ₹15.1L
                </text>
                <text x="70" y="82" textAnchor="middle" className="font-medium text-[10px] fill-slate-400">
                  collected
                </text>
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              {modes.map((m, i) => (
                <div key={i} onClick={m.open} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <span style={{ backgroundColor: m.c }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
                  <span className="font-medium text-slate-700">{m.label}</span>
                  <span className="ml-auto font-bold text-slate-900">{m.value}</span>
                  <span className="text-slate-400 w-10 text-right">{m.pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by domain */}
          <div className="md:col-span-6 lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Revenue by domain</div>
                <div className="text-xs text-slate-500">Which product raised the invoice</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Shared ledger
              </span>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {provenance.map((p, i) => (
                <div key={i} onClick={p.open} className="cursor-pointer">
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-semibold text-slate-800">{p.label}</span>
                    <span className="font-bold text-slate-900">{p.value}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: p.pctStr, backgroundColor: p.c }} className="h-full rounded-full" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{p.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by location */}
          <div className="md:col-span-6 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Revenue by location</div>
            <div className="text-xs text-slate-500">Branch comparison</div>
            <div className="flex flex-col gap-4 mt-4">
              {locations.map((l, i) => (
                <div key={i} onClick={l.open} className="cursor-pointer">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{l.name}</span>
                    <span className="font-bold text-slate-900">{l.value}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: l.pctStr }} className="h-full bg-[#55349A] rounded-full" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{l.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gateway & Settlement */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-900">Gateway health</div>
              <div className="text-xs text-slate-500">PayTM &amp; Razorpay rows only</div>
              <div className="flex flex-col gap-2 mt-3">
                {gateway.map((g, i) => (
                  <div key={i} onClick={g.open} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                    <span style={{ backgroundColor: g.c }} className="w-2 h-2 rounded-full shrink-0" />
                    <span className="font-medium text-slate-700">{g.label}</span>
                    <span className="ml-auto font-bold text-slate-900">{g.count}</span>
                    <span className="text-slate-400 w-9 text-right">{g.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-900">Settlement status</div>
              <div className="text-xs text-slate-500">Gateway money reaching bank</div>
              <div className="flex h-5 rounded-md overflow-hidden gap-0.5 my-3">
                <div className="w-[82.6%] bg-emerald-600 rounded-l" />
                <div className="w-[17.4%] bg-amber-500 rounded-r" />
              </div>
              <div onClick={openSettled} className="flex justify-between text-xs text-slate-600 cursor-pointer">
                <span>
                  <strong className="text-slate-900">₹7,42,300</strong> settled
                </span>
                <span>
                  <strong className="text-slate-900">₹1,56,800</strong> pending
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Receivables & ageing */}
        <div className="flex items-center gap-3 my-6">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">B · Receivables &amp; ageing</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* AR Ageing */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">AR ageing</div>
                <div className="text-xs text-slate-500">Outstanding by days past due date</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                As of now
              </span>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {ageing.map((a, i) => (
                <div key={i} onClick={a.open} className="grid grid-cols-[70px_1fr_100px] items-center gap-3 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-600">{a.bucket}</span>
                  <div className="h-6 bg-slate-50 rounded-lg overflow-hidden">
                    <div style={{ width: a.pctStr, backgroundColor: a.c }} className="h-full rounded-lg" />
                  </div>
                  <span className="text-xs font-bold text-right text-slate-900">{a.value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-100">
              <div>
                <div className="text-[11px] text-slate-400">Total outstanding</div>
                <div className="text-base font-bold text-slate-900">₹4,86,210</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Overdue value</div>
                <div className="text-base font-bold text-amber-700">₹2,44,310</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Overdue invoices</div>
                <div className="text-base font-bold text-slate-900">87</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">No due date</div>
                <div className="text-base font-bold text-slate-400">14 · ₹57,340</div>
              </div>
            </div>
          </div>

          {/* Top debtors */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Top debtors</div>
                <div className="text-xs text-slate-500">Consumers owing the most</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Top 8 of 61
              </span>
            </div>
            <div className="flex flex-col mt-3 divide-y divide-slate-100">
              {debtors.map((d, i) => (
                <div key={i} onClick={d.open} className="grid grid-cols-[20px_1fr_auto] items-center gap-2.5 py-2 cursor-pointer hover:bg-slate-50 px-1 rounded">
                  <span className="text-xs font-semibold text-slate-400">{d.rank}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{d.meta}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{d.value}</div>
                    <div style={{ color: d.ageFg }} className="text-[10px] font-medium">{d.age}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section C: Expenses & cash position */}
        <div className="flex items-center gap-3 my-6">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">C · Expenses &amp; cash position</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Net position band */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">Net cash movement</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">+₹8,96,460</span>
                <span className="text-xs text-slate-400">this month</span>
              </div>
            </div>
            <div className="lg:border-l lg:border-slate-100 lg:pl-6">
              <div className="text-xs font-semibold text-slate-500 mb-1">Collected</div>
              <div className="text-xl font-bold text-slate-900">₹15,08,940</div>
            </div>
            <div className="lg:border-l lg:border-slate-100 lg:pl-6">
              <div className="text-xs font-semibold text-slate-500 mb-1">Expenses paid</div>
              <div className="text-xl font-bold text-slate-900">₹6,12,480</div>
            </div>
            <div className="lg:border-l lg:border-slate-100 lg:pl-6 text-xs text-slate-400 leading-relaxed">
              No COGS field on invoice. This figure is cash in minus cash out for the period — not profit.
            </div>
          </div>

          {/* Expenses by category */}
          <div className="md:col-span-6 lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Expenses by category</div>
            <div className="text-xs text-slate-500">Tenant-defined categories</div>
            <div className="flex flex-col gap-3 mt-4">
              {categories.map((c, i) => (
                <div key={i} onClick={c.open} className="cursor-pointer">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{c.label}</span>
                    <span className="font-bold text-slate-900">{c.value}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: c.pctStr, backgroundColor: c.c }} className="h-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense payout status */}
          <div className="md:col-span-6 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Expense payout status</div>
            <div className="text-xs text-slate-500">What you still owe out</div>
            <div className="flex flex-col gap-3 mt-4">
              {payoutStatus.map((p, i) => (
                <div key={i} onClick={p.open} className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                  <span style={{ backgroundColor: p.c }} className="w-2 h-2 rounded-full shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{p.label}</div>
                    <div className="text-[11px] text-slate-400">{p.meta}</div>
                  </div>
                  <span className="ml-auto font-bold text-slate-900">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cash in hand */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Cash in hand</div>
                <div className="text-xs text-slate-500">Per location, right now</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Point in time
              </span>
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              {cash.map((c, i) => (
                <div key={i} onClick={c.open} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                  <span className="text-base">💰</span>
                  <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                  <span className="ml-auto text-sm font-bold text-slate-900">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drill-down Drawer */}
        {drill ? (
          <>
            <div onClick={closeDrill} className="fixed inset-0 bg-slate-900/30 z-40" />
            <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] max-w-full bg-white z-50 shadow-2xl flex flex-col">
              <div className="p-5 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Drill-down</div>
                    <div className="text-lg font-bold text-slate-900 leading-snug">{drill.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{drill.subtitle}</div>
                  </div>
                  <button onClick={closeDrill} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100">
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {drill.chips.map((c: any, i: number) => (
                    <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {c.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{drill.countLabel}</span>
                  <span className="text-sm font-bold text-slate-900">{drill.total}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {drill.rows.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2.5">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-slate-900 truncate">{r.primary}</div>
                        <div className="text-[11px] text-slate-400 truncate">{r.secondary}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-900">{r.amount}</div>
                        <div className="text-[10px] text-slate-400">{r.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
