import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    period: 'month',
    grain: 'day',
    currency: 'default',
    location: 'all',
    features: ['all'],
    includeTest: false,
    view: 'live',
    drill: null,
  });

  const s = state;

  const inr = (n) => {
    const sStr = Math.round(Math.abs(n)).toString();
    let out = sStr;
    if (sStr.length > 3) {
      const last3 = sStr.substring(sStr.length - 3);
      const other = sStr.substring(0, sStr.length - 3);
      out = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return (n < 0 ? "-₹" : "₹") + out;
  };

  const l = (n) => {
    return (n / 100000).toFixed(1) + "L";
  };

  const drillFor = (title, subtitle, filters, countLabel, total, rows, payloadStr) => {
    return () => setState({
      ...s,
      drill: {
        title, subtitle, countLabel, total, rows, payload: payloadStr,
        chips: [
          { text: s.location === 'all' ? 'All locations' : (s.location === 'kaloor' ? 'Kaloor Main' : (s.location === 'edapally' ? 'Edappally' : 'Thrissur')) },
          { text: s.currency === 'default' ? 'Base currency (INR)' : s.currency },
          ...filters.map(f => ({ text: f }))
        ]
      }
    });
  };

  const payload = (filters, sorts) => {
    return "{\n  \"filters\": " + filters + ",\n  \"sorts\": " + sorts + ",\n  \"size\": 100\n}";
  };



  const V = s.view;
    const money = (n) => inr(n);

    const railIcon = (d) => ({ __html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px">' + d + '</svg>' });
    const rail = [
      { key: 'health', label: 'Health', icon: railIcon('<path d="M12 3 19 6v6c0 4.5-2.8 7.7-7 9-4.2-1.3-7-4.5-7-9V6l7-3Z"/><path d="M12 8v7"/><path d="M8.5 11.5h7"/>') },
      { key: 'bookings', label: 'Bookings', icon: railIcon('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/>') },
      { key: 'karty', label: 'Karty', icon: railIcon('<circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/><path d="M3 5h2l2.2 9.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7"/>') },
      { key: 'finance', label: 'Finance', icon: railIcon('<path d="M3 9 12 4l9 5"/><path d="M5 10v8"/><path d="M9.5 10v8"/><path d="M14.5 10v8"/><path d="M19 10v8"/><path d="M3 20h18"/>') },
      { key: 'lending', label: 'Lending', icon: railIcon('<path d="m4 16 5-5 4 4 7-7"/><path d="M14 8h6v6"/>') },
      { key: 'hr', label: 'HR', icon: railIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="3"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 4.13a3 3 0 0 1 0 5.74"/>') },
      { key: 'basecrm', label: 'Base CRM', icon: railIcon('<path d="M5 6h14"/><path d="M5 12h14"/><path d="M5 18h14"/><circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none"/>') },
    ].map((r) => {
      const active = r.key === 'finance';
      const returnView = {
        label: r.label,
        icon: r.icon,
        bg: active ? '#F3ECFF' : 'transparent',
        edge: active ? '3px solid #5F3DC4' : '3px solid transparent',
        radius: active ? '0px' : '14px',
        fg: active ? '#5F3DC4' : '#94A3B8',
        weight: active ? 600 : 500,
      };
    });

    const navItems = [
      { label: 'Overview', icon: '▦', active: true },
      { label: 'Receivables', icon: '💵' },
      { label: 'Payouts', icon: '💳' },
      { label: 'Expenses', icon: '💳' },
      { label: 'Invoices', icon: '🧾' },
      { label: 'Category', icon: '📁' },
      { label: 'Status', icon: '✅' },
      { label: 'Cash In Hand', icon: '💰' },
      { label: 'Cash Register', icon: '💰' },
      { label: 'Activity Log', icon: '📝' },
      { label: 'Settings', icon: '⚙' },
    ].map((n) => ({
      label: n.label,
      icon: n.icon,
      bg: n.active ? 'linear-gradient(180deg,#0d9488 0%,#0f766e 100%)' : 'transparent',
      fg: n.active ? '#ffffff' : '#6B7280',
      weight: n.active ? 700 : 600,
    }));

    const periods = [
      { key: 'today', label: 'Today' },
      { key: '7d', label: '7d' },
      { key: '30d', label: '30d' },
      { key: 'month', label: 'This month' },
      { key: 'lastmonth', label: 'Last month' },
      { key: 'ytd', label: 'YTD' },
    ].map((p) => ({
      label: p.label,
      bg: s.period === p.key ? '#55349A' : 'transparent',
      fg: s.period === p.key ? '#ffffff' : '#64748b',
      pick: () => setState({ ...s, period: p.key  }),
    }));

    const grains = [
      { key: 'day', label: 'Day' },
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
    ].map((g) => ({
      label: g.label,
      bg: s.grain === g.key ? '#f1f5f9' : 'transparent',
      fg: s.grain === g.key ? '#0f172a' : '#94a3b8',
      pick: () => setState({ ...s, grain: g.key  }),
    }));

    const featureDefs = [
      { key: 'all', label: 'All domains' },
      { key: 'HEALTHCARE', label: 'Healthcare' },
      { key: 'E_COMMERCE', label: 'E-commerce' },
      { key: 'BOOKING', label: 'Booking' },
      { key: 'FINANCE', label: 'Direct finance' },
    ];
    const features = featureDefs.map((f) => {
      const on = s.features.indexOf(f.key) >= 0;
      return {
        label: f.label,
        bg: on ? 'rgba(5,150,105,.08)' : '#fff',
        bd: on ? '#059669' : '#e2e8f0',
        fg: on ? '#047857' : '#64748b',
        toggle: () => {
          if (f.key === 'all') return setState({ ...s, features: ['all']  });
          let next = s.features.filter((k) => k !== 'all');
          next = on ? next.filter((k) => k !== f.key) : next.concat([f.key]);
          setState({ ...s, features: next.length ? next : ['all']  });
        },
      };
    });

    const states = [
      { key: 'live', label: 'Live data' },
      { key: 'loading', label: 'Loading' },
      { key: 'empty', label: 'Empty (new tenant)' },
      { key: 'partial', label: 'Partial' },
      { key: 'error', label: 'Error' },
    ].map((st) => ({
      label: st.label,
      bg: V === st.key ? '#0f172a' : '#fff',
      bd: V === st.key ? '#0f172a' : '#e2e8f0',
      fg: V === st.key ? '#fff' : '#64748b',
      pick: () => setState({ ...s, view: st.key  }),
    }));

    /* sparkline builder */
    const spark = (vals) => {
      const max = Math.max.apply(null, vals);
      const min = Math.min.apply(null, vals);
      const span = max - min || 1;
      const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * 120;
        const y = 24 - ((v - min) / span) * 20;
        return x.toFixed(1) + ',' + y.toFixed(1);
      });
      return { line: pts.join(' '), area: 'M0,26 L' + pts.join(' L') + ' L120,26 Z' };
    };

    const kpiDefs = [
      { label: 'Invoiced', value: money(1842360), delta: '▲ 12.4%', up: true, deltaNote: 'vs prior 31d', note: 'SUM(net_rate) · masters only, excl. drafts & cancelled', vals: [8, 11, 9, 14, 13, 17, 16, 21, 19, 24, 26],
        drill: ['Invoiced this month', '₹18,42,360 across 703 invoices', ['invoiceDate BETWEEN 2026-08-01..2026-08-31', 'invoiceStatus IN [New, Settled]', 'internalInvoiceType IN [INDIVIDUAL_INVOICE, MASTER_INVOICE]'], 'Invoices', '₹18,42,360'] },
      { label: 'Collected', value: money(1508940), delta: '▲ 8.1%', up: true, deltaNote: 'vs prior 31d', note: 'SUM(payment.amount) WHERE is_payments_in · excl. test', vals: [6, 9, 8, 12, 11, 14, 15, 18, 17, 21, 22],
        drill: ['Collected this month', '₹15,08,940 across 486 payments in', ['paymentOn BETWEEN 2026-08-01..2026-08-31', 'isPaymentsIn = true', 'isTestTransaction = false', 'isReverseTxn = false'], 'Payments in', '₹15,08,940'] },
      { label: 'Outstanding', value: money(486210), delta: '▼ 4.2%', up: true, deltaNote: 'vs last month end', note: 'Level, not a flow — as of now, not summed over the period', vals: [22, 21, 23, 20, 19, 20, 18, 17, 18, 16, 15],
        drill: ['Total outstanding', '₹4,86,210 across 191 invoices with a balance', ['amountDue > 0', 'invoiceStatus IN [New, Settled]', 'as of now — no date window'], 'Invoices', '₹4,86,210'] },
      { label: 'Expenses', value: money(612480), delta: '▲ 3.2%', up: false, deltaNote: 'vs prior 31d', note: 'SUM(amount) on expense_tbl · all categories', vals: [10, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18],
        drill: ['Expenses this month', '₹6,12,480 across 121 expenses', ['expenseDate BETWEEN 2026-08-01..2026-08-31'], 'Expenses', '₹6,12,480'] },
      { label: 'Cash in hand', value: money(84750), delta: '▲ ₹6,200', up: true, deltaNote: 'since yesterday', note: 'cash_balance_tbl · one row per location, no history', vals: [12, 13, 12, 14, 15, 14, 16, 15, 17, 18, 19],
        drill: ['Cash in hand', '₹84,750 across 3 locations', ['direct read of cash_balance_tbl', 'UNIQUE (tenant_uid, location_uid)'], 'Locations', '₹84,750'] },
    ];

    const kpis = kpiDefs.map((k) => ({
      label: k.label,
      value: k.value,
      delta: k.delta,
      deltaFg: k.up ? '#059669' : '#e11d48',
      deltaBg: k.up ? '#ecfdf5' : '#fff1f2',
      deltaNote: k.deltaNote,
      note: k.note,
      spark: spark(k.vals),
      open: drillFor(k.drill[0], k.drill[1], k.drill[2], k.drill[3], k.drill[4],
        [
          { primary: 'INV-2026-0847', secondary: 'Anjali Menon · Kaloor Main · Healthcare', amount: '₹24,800', meta: 'Fully paid' },
          { primary: 'INV-2026-0846', secondary: 'Cochin Traders LLP · Edappally · E-commerce', amount: '₹1,12,400', meta: 'Partially paid' },
          { primary: 'INV-2026-0845', secondary: 'Rahul Varma · Kaloor Main · Booking', amount: '₹3,200', meta: 'Fully paid' },
          { primary: 'INV-2026-0844', secondary: 'Sreelakshmi P · Thrissur · Healthcare', amount: '₹18,650', meta: 'Not paid' },
          { primary: 'INV-2026-0843', secondary: 'Deepa Nair · Kaloor Main · Direct finance', amount: '₹9,400', meta: 'Fully paid' },
          { primary: 'INV-2026-0842', secondary: 'Kerala Agencies · Edappally · E-commerce', amount: '₹67,300', meta: 'Not paid' },
        ],
        payload(['{ "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }', '{ "field": "invoiceStatus", "op": "IN", "value": ["New", "Settled"] }', '{ "field": "locationUid", "op": "IN", "value": ["kaloor", "edapally", "thrissur"] }'], '[{ "field": "invoiceDate", "dir": "DESC" }]')),
    }));

    const attention = [
      { count: 17, label: 'Prepayment failures — stuck transactions', tone: 'red',
        drill: ['Prepayment failures', '17 invoices in a failed or pending prepayment state', ['invoiceStatus IN [FAILED_INVOICE, PREPAYMENT_PENDING_INVOICE]'], 'Invoices', '₹1,04,300'] },
      { count: 87, label: 'Invoices overdue with a balance', tone: 'amber',
        drill: ['Overdue invoices', '87 invoices past due date with amount_due > 0', ['dueDate LT now', 'amountDue > 0'], 'Invoices', '₹2,44,310'] },
      { count: 34, label: 'Drafts not yet issued', tone: 'amber',
        drill: ['Draft backlog', '34 drafts worth ₹2,94,600 — not counted as revenue', ['invoiceStatus EQ Draft'], 'Drafts', '₹2,94,600'] },
      { count: 25, label: 'Expenses awaiting payout', tone: 'blue',
        drill: ['Expenses awaiting payout', '25 expenses with an outstanding payout', ['payoutStatus IN [NO_PAYOUT, PARTIALLY_PAYOUT]'], 'Expenses', '₹2,07,100'] },
    ].map((a) => {
      const t = a.tone === 'red' ? { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c', lfg: '#7f1d1d' }
        : a.tone === 'amber' ? { bg: '#fdf3e1', bd: '#f0dcb2', fg: '#b45309', lfg: '#6e5000' }
        : { bg: '#eff6ff', bd: '#bfdbfe', fg: '#1d4ed8', lfg: '#1e3a8a' };
      return {
        count: a.count, label: a.label, bg: t.bg, bd: t.bd, fg: t.fg, lfg: t.lfg,
        open: drillFor(a.drill[0], a.drill[1], a.drill[2], a.drill[3], a.drill[4],
          [
            { primary: 'INV-2026-0812', secondary: 'Anjali Menon · +91 98470 21188', amount: '₹18,400', meta: '42 days' },
            { primary: 'INV-2026-0798', secondary: 'Cochin Traders LLP · +91 99610 40021', amount: '₹64,200', meta: '58 days' },
            { primary: 'INV-2026-0771', secondary: 'Rahul Varma · +91 97440 11002', amount: '₹7,900', meta: '71 days' },
            { primary: 'INV-2026-0764', secondary: 'Kerala Agencies · +91 94470 88123', amount: '₹31,600', meta: '96 days' },
            { primary: 'INV-2026-0751', secondary: 'Sreelakshmi P · +91 98950 33417', amount: '₹12,300', meta: '104 days' },
          ],
          payload(['{ "field": "invoiceStatus", "op": "IN", "value": ["New"] }', '{ "field": "dueDate", "op": "LT", "value": "2026-08-11T00:00:00Z" }'], '[{ "field": "dueDate", "dir": "ASC" }]')),
      };
    });

    /* revenue trend */
    const invoiced = [42, 58, 51, 74, 66, 88, 61, 95, 79, 108, 92, 121, 104, 133];
    const collected = [31, 47, 44, 61, 55, 72, 52, 80, 66, 88, 78, 99, 87, 112];
    const maxV = 140;
    const stepW = 760 / invoiced.length;
    const barW = stepW * 0.34;
    const y = (v) => 222 - (v / maxV) * 176;
    const bars = collected.map((v, i) => {
      const top = y(v);
      return { x: (i * stepW + stepW / 2 - barW / 2).toFixed(1), y: top.toFixed(1), w: barW.toFixed(1), h: (222 - top).toFixed(1) };
    });
    const linePts = invoiced.map((v, i) => (i * stepW + stepW / 2).toFixed(1) + ',' + y(v).toFixed(1));
    const trend = {
      bars,
      line: linePts.join(' '),
      area: 'M' + (stepW / 2).toFixed(1) + ',222 L' + linePts.join(' L') + ' L' + (760 - stepW / 2).toFixed(1) + ',222 Z',
      labels: ['1 Aug', '4 Aug', '7 Aug', '9 Aug', '11 Aug'].map((t) => ({ text: t })),
    };

    const modeRaw = [
      { label: 'UPI', v: 512300, c: '#55349A', raw: 'UPI' },
      { label: 'Cash', v: 442100, c: '#f59e0b', raw: 'Cash, Offline' },
      { label: 'Card', v: 386400, c: '#10b981', raw: 'CC, DC, EMI' },
      { label: 'Bank / net-banking', v: 108900, c: '#8b5cf6', raw: 'NB, BANK_TRANSFER' },
      { label: 'Credit & wallet', v: 59240, c: '#94a3b8', raw: 'CREDIT, STORE_CREDIT, PAYLATER, WALLET, PAYTM_PostPaid' },
    ];
    const modeTotal = modeRaw.reduce((a, m) => a + m.v, 0);
    const circ = 2 * Math.PI * 54;
    let acc = 0;
    const modes = modeRaw.map((m) => {
      const frac = m.v / modeTotal;
      const dash = (frac * circ - 2).toFixed(1) + ' ' + circ.toFixed(1);
      const off = (-acc * circ).toFixed(1);
      acc += frac;
      return {
        label: m.label, c: m.c, value: money(m.v), pct: (frac * 100).toFixed(1) + '%',
        dash, off,
        open: drillFor('Payment mode · ' + m.label, money(m.v) + ' collected · raw modes: ' + m.raw,
          ['paymentMode IN [' + m.raw + ']', 'isPaymentsIn = true', 'isTestTransaction = false'], 'Payments', money(m.v),
          [
            { primary: 'RCPT-2026-3391', secondary: 'Anjali Menon · Kaloor Main', amount: '₹24,800', meta: 'SUCCESS' },
            { primary: 'RCPT-2026-3388', secondary: 'Rahul Varma · Kaloor Main', amount: '₹3,200', meta: 'SETTLED' },
            { primary: 'RCPT-2026-3384', secondary: 'Deepa Nair · Edappally', amount: '₹9,400', meta: 'SUCCESS' },
            { primary: 'RCPT-2026-3379', secondary: 'Kerala Agencies · Edappally', amount: '₹41,900', meta: 'SETTLED' },
          ],
          payload(['{ "field": "paymentMode", "op": "IN", "value": ["' + m.raw.split(', ').join('", "') + '"] }', '{ "field": "isPaymentsIn", "op": "EQ", "value": true }'], '[{ "field": "paymentOn", "dir": "DESC" }]')),
      };
    });

    const provRaw = [
      { label: 'Healthcare', v: 984200, c: '#0D9488', n: 318, key: 'HEALTHCARE', mod: 'HEALTHCARE_IP, HEALTHCARE_LAB' },
      { label: 'E-commerce', v: 512660, c: '#EA580C', n: 214, key: 'E_COMMERCE', mod: 'E_COMMERCE_ORDER' },
      { label: 'Booking', v: 204300, c: '#2563EB', n: 128, key: 'BOOKING', mod: 'BOOKING_APPOINTMENT' },
      { label: 'Direct finance', v: 141200, c: '#059669', n: 43, key: 'FINANCE', mod: 'FINANCE_INVOICE' },
    ];
    const provTotal = provRaw.reduce((a, p) => a + p.v, 0);
    const provenance = provRaw.map((p) => ({
      label: p.label, c: p.c, value: money(p.v),
      pctStr: ((p.v / provTotal) * 100).toFixed(1) + '%',
      meta: p.n + ' invoices · ' + ((p.v / provTotal) * 100).toFixed(1) + '% of revenue · feature_module ' + p.mod,
      open: drillFor('Revenue from ' + p.label, money(p.v) + ' across ' + p.n + ' invoices',
        ['feature EQ ' + p.key, 'invoiceDate BETWEEN 2026-08-01..2026-08-31', 'invoiceStatus IN [New, Settled]'], 'Invoices', money(p.v),
        [
          { primary: 'INV-2026-0847', secondary: 'Anjali Menon · ' + p.label + ' · Kaloor Main', amount: '₹24,800', meta: 'Fully paid' },
          { primary: 'INV-2026-0841', secondary: 'Sreelakshmi P · ' + p.label + ' · Thrissur', amount: '₹18,650', meta: 'Not paid' },
          { primary: 'INV-2026-0836', secondary: 'Rahul Varma · ' + p.label + ' · Kaloor Main', amount: '₹7,400', meta: 'Fully paid' },
          { primary: 'INV-2026-0829', secondary: 'Cochin Traders LLP · ' + p.label + ' · Edappally', amount: '₹1,12,400', meta: 'Partially paid' },
        ],
        payload(['{ "field": "feature", "op": "EQ", "value": "' + p.key + '" }', '{ "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }'], '[{ "field": "netRate", "dir": "DESC" }]')),
    }));

    const locRaw = [
      { name: 'Kaloor Main', v: 892400, n: 341, key: 'kaloor' },
      { name: 'Edappally', v: 618700, n: 236, key: 'edapally' },
      { name: 'Thrissur', v: 331260, n: 126, key: 'thrissur' },
    ];
    const locMax = 892400;
    const locations = locRaw.map((l) => ({
      name: l.name, value: money(l.v),
      pctStr: ((l.v / locMax) * 100).toFixed(1) + '%',
      meta: l.n + ' invoices · AOV ' + money(Math.round(l.v / l.n)) + ' · ' + ((l.v / provTotal) * 100).toFixed(1) + '% of revenue',
      open: drillFor(l.name, money(l.v) + ' invoiced across ' + l.n + ' invoices',
        ['locationUid EQ ' + l.key, 'invoiceDate BETWEEN 2026-08-01..2026-08-31'], 'Invoices', money(l.v),
        [
          { primary: 'INV-2026-0847', secondary: 'Anjali Menon · Healthcare', amount: '₹24,800', meta: 'Fully paid' },
          { primary: 'INV-2026-0840', secondary: 'Deepa Nair · Direct finance', amount: '₹9,400', meta: 'Fully paid' },
          { primary: 'INV-2026-0833', secondary: 'Rahul Varma · Booking', amount: '₹3,200', meta: 'Fully paid' },
        ],
        payload(['{ "field": "locationUid", "op": "EQ", "value": "' + l.key + '" }'], '[{ "field": "invoiceDate", "dir": "DESC" }]')),
    }));

    const gwRaw = [
      { label: 'Success', n: 412, c: '#059669', key: 'SUCCESS' },
      { label: 'Settled', n: 388, c: '#0D9488', key: 'SETTLED' },
      { label: 'Failed', n: 27, c: '#DC2626', key: 'FAILED' },
      { label: 'Pending', n: 9, c: '#D97706', key: 'PENDING' },
      { label: 'Not found', n: 2, c: '#94a3b8', key: 'NOT_FOUND' },
    ];
    const gwTotal = gwRaw.reduce((a, g) => a + g.n, 0);
    const gateway = gwRaw.map((g) => ({
      label: g.label, c: g.c, count: g.n, pct: ((g.n / gwTotal) * 100).toFixed(1) + '%',
      open: drillFor('Gateway status · ' + g.label, g.n + ' gateway payments',
        ['gatewayStatus EQ ' + g.key, 'paymentGateway IN [PAYTM, RAZORPAY]'], 'Payments', g.n + ' rows',
        [
          { primary: 'RCPT-2026-3391', secondary: 'Razorpay · pay_Nx82kQ · Anjali Menon', amount: '₹24,800', meta: g.label },
          { primary: 'RCPT-2026-3374', secondary: 'PayTM · txn_88134 · Deepa Nair', amount: '₹9,400', meta: g.label },
          { primary: 'RCPT-2026-3361', secondary: 'Razorpay · pay_Mx11pQ · Kerala Agencies', amount: '₹41,900', meta: g.label },
        ],
        payload(['{ "field": "gatewayStatus", "op": "EQ", "value": "' + g.key + '" }'], '[{ "field": "paymentOn", "dir": "DESC" }]')),
    }));

    const ageRaw = [
      { bucket: '0–30 d', v: 241900, c: '#10b981' },
      { bucket: '31–60 d', v: 132400, c: '#f59e0b' },
      { bucket: '61–90 d', v: 68700, c: '#EA580C' },
      { bucket: '90+ d', v: 43210, c: '#DC2626' },
    ];
    const ageing = ageRaw.map((a) => ({
      bucket: a.bucket, c: a.c, value: money(a.v),
      pctStr: ((a.v / 241900) * 100).toFixed(1) + '%',
      open: drillFor('AR ageing · ' + a.bucket, money(a.v) + ' outstanding in this bucket',
        ['amountDue > 0', 'dueDate within ' + a.bucket, 'dueDate IS NOT NULL'], 'Invoices', money(a.v),
        [
          { primary: 'INV-2026-0812', secondary: 'Anjali Menon · Kaloor Main', amount: '₹18,400', meta: 'due 12 Jul' },
          { primary: 'INV-2026-0798', secondary: 'Cochin Traders LLP · Edappally', amount: '₹64,200', meta: 'due 28 Jun' },
          { primary: 'INV-2026-0771', secondary: 'Rahul Varma · Kaloor Main', amount: '₹7,900', meta: 'due 15 Jun' },
          { primary: 'INV-2026-0764', secondary: 'Kerala Agencies · Edappally', amount: '₹31,600', meta: 'due 2 Jun' },
        ],
        payload(['{ "field": "amountDue", "op": "GT", "value": 0 }', '{ "field": "dueDate", "op": "BETWEEN", "value": ["2026-05-13", "2026-06-12"] }'], '[{ "field": "dueDate", "dir": "ASC" }]')),
    }));

    const debtorRaw = [
      { name: 'Cochin Traders LLP', phone: '+91 99610 40021', v: 96400, age: '58 d oldest' },
      { name: 'Kerala Agencies', phone: '+91 94470 88123', v: 71300, age: '96 d oldest' },
      { name: 'Nidiya Textiles', phone: '+91 98460 12907', v: 54800, age: '41 d oldest' },
      { name: 'Sreelakshmi P', phone: '+91 98950 33417', v: 38200, age: '104 d oldest' },
      { name: 'Anjali Menon', phone: '+91 98470 21188', v: 29600, age: '42 d oldest' },
      { name: 'Kemtex Industries', phone: '+91 90740 55210', v: 24100, age: '19 d oldest' },
      { name: 'Rahul Varma', phone: '+91 97440 11002', v: 18900, age: '71 d oldest' },
      { name: 'Deepa Nair', phone: '+91 99950 71234', v: 14700, age: '11 d oldest' },
    ];
    const debtors = debtorRaw.map((d, i) => ({
      rank: i + 1, name: d.name, meta: d.phone, value: money(d.v), age: d.age,
      ageFg: parseInt(d.age, 10) > 60 ? '#b91c1c' : '#94a3b8',
      open: drillFor(d.name, money(d.v) + ' outstanding · ' + d.phone,
        ['consumerUid EQ ' + d.name.toLowerCase().split(' ').join('-'), 'amountDue > 0'], 'Open invoices', money(d.v),
        [
          { primary: 'INV-2026-0798', secondary: 'Edappally · E-commerce · due 28 Jun', amount: '₹64,200', meta: 'Partially paid' },
          { primary: 'INV-2026-0733', secondary: 'Edappally · E-commerce · due 14 Jun', amount: '₹22,100', meta: 'Not paid' },
          { primary: 'INV-2026-0701', secondary: 'Kaloor Main · Direct finance · due 2 Jun', amount: '₹10,100', meta: 'Not paid' },
        ],
        payload(['{ "field": "consumerUid", "op": "EQ", "value": "c-8814" }', '{ "field": "amountDue", "op": "GT", "value": 0 }'], '[{ "field": "dueDate", "dir": "ASC" }]')),
    }));

    const mixRaw = [
      { label: 'Fully paid', n: 486, v: 1508940, c: '#059669' },
      { label: 'Not paid', n: 63, v: 218400, c: '#DC2626' },
      { label: 'Partially paid', n: 41, v: 184600, c: '#f59e0b' },
      { label: 'Refund', n: 7, v: 18200, c: '#8b5cf6' },
      { label: 'Partially refunded', n: 3, v: 6400, c: '#a78bfa' },
      { label: 'Fully refunded', n: 2, v: 3100, c: '#c4b5fd' },
    ];
    const mixMax = 486;
    const statusMix = mixRaw.map((m) => ({
      label: m.label, count: m.n + ' inv', value: money(m.v), c: m.c,
      pctStr: ((m.n / mixMax) * 100).toFixed(1) + '%',
      open: drillFor('Payment status · ' + m.label, m.n + ' invoices worth ' + money(m.v),
        ['invoicePaymentStatus display "' + m.label + '"'], 'Invoices', money(m.v),
        [
          { primary: 'INV-2026-0847', secondary: 'Anjali Menon · Kaloor Main', amount: '₹24,800', meta: m.label },
          { primary: 'INV-2026-0844', secondary: 'Sreelakshmi P · Thrissur', amount: '₹18,650', meta: m.label },
          { primary: 'INV-2026-0842', secondary: 'Kerala Agencies · Edappally', amount: '₹67,300', meta: m.label },
        ],
        payload(['{ "field": "invoicePaymentStatus", "op": "EQ", "value": "' + m.label.split(' ').join('') + '" }'], '[{ "field": "invoiceDate", "dir": "DESC" }]')),
    }));

    const originStyle = (o) => o === 'Healthcare' ? { bg: 'rgba(13,148,136,.1)', fg: '#0f766e' }
      : o === 'E-commerce' ? { bg: 'rgba(234,88,12,.1)', fg: '#c2410c' }
      : o === 'Booking' ? { bg: 'rgba(37,99,235,.1)', fg: '#1d4ed8' }
      : { bg: 'rgba(5,150,105,.1)', fg: '#047857' };
    const dueSoonRaw = [
      { num: 'INV-2026-0839', name: 'Nidiya Textiles', due: '12 Aug', v: 54800, origin: 'E-commerce' },
      { num: 'INV-2026-0841', name: 'Sreelakshmi P', due: '13 Aug', v: 18650, origin: 'Healthcare' },
      { num: 'INV-2026-0836', name: 'Kemtex Industries', due: '14 Aug', v: 24100, origin: 'E-commerce' },
      { num: 'INV-2026-0844', name: 'Anjali Menon', due: '15 Aug', v: 11200, origin: 'Healthcare' },
      { num: 'INV-2026-0846', name: 'Cochin Traders LLP', due: '16 Aug', v: 32200, origin: 'E-commerce' },
      { num: 'INV-2026-0848', name: 'Rahul Varma', due: '18 Aug', v: 4600, origin: 'Booking' },
    ];
    const dueSoon = dueSoonRaw.map((d) => {
      const st = originStyle(d.origin);
      return {
        num: d.num, name: d.name, due: d.due, value: money(d.v), origin: d.origin,
        originBg: st.bg, originFg: st.fg,
        open: drillFor(d.num, d.name + ' · due ' + d.due + ' · ' + money(d.v) + ' outstanding',
          ['uid EQ ' + d.num, 'amountDue > 0'], 'Payments against this invoice', money(d.v),
          [
            { primary: 'RCPT-2026-3288', secondary: 'UPI · 8 Aug · self pay', amount: '₹12,000', meta: 'SUCCESS' },
            { primary: 'RCPT-2026-3201', secondary: 'Cash · 2 Aug · counter', amount: '₹8,000', meta: 'Offline' },
          ],
          payload(['{ "field": "paymentFor", "op": "EQ", "value": "INVOICE" }', '{ "field": "paymentForUid", "op": "EQ", "value": "' + d.num + '" }'], '[{ "field": "paymentOn", "dir": "DESC" }]')),
      };
    });

    const catRaw = [
      { label: 'Salaries', v: 242000, c: '#55349A' },
      { label: 'Rent', v: 180000, c: '#8b5cf6' },
      { label: 'Consumables', v: 74300, c: '#f59e0b' },
      { label: 'Marketing', v: 41200, c: '#10b981' },
      { label: 'Utilities', v: 38900, c: '#0D9488' },
      { label: 'Other (9 categories)', v: 36080, c: '#94a3b8' },
    ];
    const categories = catRaw.map((c) => ({
      label: c.label, c: c.c, value: money(c.v),
      pctStr: ((c.v / 242000) * 100).toFixed(1) + '%',
      open: drillFor('Expenses · ' + c.label, money(c.v) + ' this month',
        ['categoryName EQ "' + c.label + '"', 'expenseDate BETWEEN 2026-08-01..2026-08-31'], 'Expenses', money(c.v),
        [
          { primary: 'EXP-2026-0412', secondary: 'August payroll · Kaloor Main', amount: '₹1,82,000', meta: 'Fully payout' },
          { primary: 'EXP-2026-0401', secondary: 'August payroll · Edappally', amount: '₹48,000', meta: 'Partially payout' },
          { primary: 'EXP-2026-0388', secondary: 'Contract staff · Thrissur', amount: '₹12,000', meta: 'No payout' },
        ],
        payload(['{ "field": "categoryName", "op": "EQ", "value": "' + c.label + '" }'], '[{ "field": "expenseDate", "dir": "DESC" }]')),
    }));

    const payoutStatus = [
      { label: 'No payout', n: 18, v: 142300, c: '#DC2626' },
      { label: 'Partially payout', n: 7, v: 64800, c: '#f59e0b' },
      { label: 'Fully payout', n: 96, v: 0, c: '#059669' },
    ].map((p) => ({
      label: p.label, c: p.c, meta: p.n + ' expenses',
      value: p.v ? money(p.v) + ' due' : '₹0 due',
      open: drillFor('Payout status · ' + p.label, p.n + ' expenses · ' + money(p.v) + ' still owed',
        ['payoutStatus EQ ' + p.label.toUpperCase().split(' ').join('_')], 'Expenses', money(p.v),
        [
          { primary: 'EXP-2026-0399', secondary: 'Medical consumables · Bharat Surgicals', amount: '₹64,200', meta: p.label },
          { primary: 'EXP-2026-0381', secondary: 'Housekeeping · Clean Co', amount: '₹18,400', meta: p.label },
          { primary: 'EXP-2026-0374', secondary: 'Courier · Fastway Logistics', amount: '₹9,100', meta: p.label },
        ],
        payload(['{ "field": "payoutStatus", "op": "EQ", "value": "NO_PAYOUT" }'], '[{ "field": "expenseDate", "dir": "DESC" }]')),
    }));

    const cash = [
      { name: 'Kaloor Main', v: 48300 },
      { name: 'Edappally', v: 24150 },
      { name: 'Thrissur', v: 12300 },
    ].map((c) => ({
      name: c.name, value: money(c.v),
      open: drillFor('Cash in hand · ' + c.name, money(c.v) + ' as of now — no history is stored',
        ['cash_balance_tbl', 'locationUid EQ ' + c.name], 'Cash register movements today', money(c.v),
        [
          { primary: 'Opening float', secondary: '11 Aug · 09:00', amount: '₹20,000', meta: 'set by Rekha' },
          { primary: 'Counter collections', secondary: '11 Aug · 42 cash payments', amount: '₹34,800', meta: 'Cash + Offline' },
          { primary: 'Cash payout', secondary: '11 Aug · courier charges', amount: '-₹6,500', meta: 'EXP-2026-0374' },
        ],
        payload(['{ "field": "locationUid", "op": "EQ", "value": "kaloor" }', '{ "field": "paymentMode", "op": "IN", "value": ["Cash", "Offline"] }'], '[{ "field": "paymentOn", "dir": "DESC" }]')),
    }));

    const invoiceStatus = [
      { label: 'New', n: 128, tone: 'ink' },
      { label: 'Settled', n: 486, tone: 'green' },
      { label: 'Draft', n: 34, tone: 'amber' },
      { label: 'Cancelled', n: 19, tone: 'red' },
      { label: 'Prepayment Failed Invoice', n: 11, tone: 'red' },
      { label: 'Prepayment Pending Invoice', n: 6, tone: 'amber' },
    ].map((st) => {
      const t = st.tone === 'green' ? { bg: '#ecfdf5', bd: '#a7f3d0', fg: '#059669', lfg: '#065f46' }
        : st.tone === 'amber' ? { bg: '#fffbeb', bd: '#fde68a', fg: '#b45309', lfg: '#92400e' }
        : st.tone === 'red' ? { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c', lfg: '#7f1d1d' }
        : { bg: '#f8fafc', bd: '#e2e8f0', fg: '#0f172a', lfg: '#475569' };
      return {
        label: st.label, count: st.n, bg: t.bg, bd: t.bd, fg: t.fg, lfg: t.lfg,
        open: drillFor('Invoice status · ' + st.label, st.n + ' invoices in this state',
          ['invoiceStatus display "' + st.label + '"'], 'Invoices', st.n + ' rows',
          [
            { primary: 'INV-2026-0847', secondary: 'Anjali Menon · Kaloor Main', amount: '₹24,800', meta: st.label },
            { primary: 'INV-2026-0843', secondary: 'Deepa Nair · Kaloor Main', amount: '₹9,400', meta: st.label },
            { primary: 'INV-2026-0838', secondary: 'Nidiya Textiles · Edappally', amount: '₹54,800', meta: st.label },
          ],
          payload(['{ "field": "invoiceStatus", "op": "EQ", "value": "New" }'], '[{ "field": "invoiceDate", "dir": "DESC" }]')),
      };
    });

    const cancelVals = [38, 44, 31, 52, 47, 36, 41, 29];
    const cancelTrend = cancelVals.map((v, i) => ({
      hStr: ((v / 52) * 100).toFixed(0) + '%',
      c: i === cancelVals.length - 1 ? '#55349A' : '#ddd6fe',
    }));

    const tax = [
      { label: 'CGST', v: 62340 },
      { label: 'SGST', v: 62340 },
      { label: 'IGST', v: 18900 },
      { label: 'Cess', v: 2140 },
    ].map((t) => ({
      label: t.label, value: money(t.v),
      open: drillFor('GST · ' + t.label, money(t.v) + ' this period',
        ['SUM(' + t.label.toLowerCase() + ')', 'invoiceDate BETWEEN 2026-08-01..2026-08-31'], 'Invoices contributing', money(t.v),
        [
          { primary: 'INV-2026-0846', secondary: 'Cochin Traders LLP · GSTIN 32AABCU9603R1ZM', amount: '₹8,420', meta: '18% slab' },
          { primary: 'INV-2026-0839', secondary: 'Nidiya Textiles · GSTIN 32AACCN1234M1Z8', amount: '₹4,110', meta: '12% slab' },
          { primary: 'INV-2026-0836', secondary: 'Kemtex Industries · GSTIN 32AAFCK5678P1Z4', amount: '₹1,808', meta: '18% slab' },
        ],
        payload(['{ "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }', '{ "field": "invoiceStatus", "op": "IN", "value": ["New", "Settled"] }'], '[{ "field": "taxTotal", "dir": "DESC" }]')),
    }));

    const activityRaw = [
      { kind: 'pay', ref: 'RCPT-2026-3391', who: 'Anjali Menon · UPI', amount: '+₹24,800', when: '4 min ago' },
      { kind: 'inv', ref: 'INV-2026-0848', who: 'Rahul Varma · Booking', amount: '₹4,600', when: '22 min ago' },
      { kind: 'pay', ref: 'RCPT-2026-3390', who: 'Deepa Nair · Cash', amount: '+₹9,400', when: '48 min ago' },
      { kind: 'out', ref: 'PAY-OUT-1182', who: 'Bharat Surgicals · Bank transfer', amount: '-₹64,200', when: '1 h ago' },
      { kind: 'inv', ref: 'INV-2026-0847', who: 'Cochin Traders LLP · E-commerce', amount: '₹1,12,400', when: '2 h ago' },
      { kind: 'pay', ref: 'RCPT-2026-3388', who: 'Kerala Agencies · Razorpay', amount: '+₹41,900', when: '3 h ago' },
      { kind: 'inv', ref: 'INV-2026-0846', who: 'Sreelakshmi P · Healthcare', amount: '₹18,650', when: '5 h ago' },
    ];
    const activity = activityRaw.map((a) => {
      const st = a.kind === 'pay' ? { icon: '↓', iconBg: '#ecfdf5', iconFg: '#059669', amtFg: '#059669' }
        : a.kind === 'out' ? { icon: '↑', iconBg: '#fef2f2', iconFg: '#b91c1c', amtFg: '#b91c1c' }
        : { icon: '🧾', iconBg: '#f1f5f9', iconFg: '#475569', amtFg: '#0f172a' };
      return {
        ref: a.ref, who: a.who, amount: a.amount, when: a.when,
        icon: st.icon, iconBg: st.iconBg, iconFg: st.iconFg, amtFg: st.amtFg,
        open: drillFor(a.ref, a.who + ' · ' + a.amount + ' · ' + a.when,
          ['uid EQ ' + a.ref, 'isTestTransaction = false'], 'Related rows', a.amount,
          [
            { primary: 'INV-2026-0847', secondary: 'Linked invoice · Kaloor Main', amount: '₹24,800', meta: 'Fully paid' },
            { primary: 'Gateway record', secondary: 'Razorpay · pay_Nx82kQ · UTR 331882194', amount: '₹24,800', meta: 'SETTLED' },
          ],
          payload(['{ "field": "uid", "op": "EQ", "value": "' + a.ref + '" }'], '[{ "field": "createdAt", "dir": "DESC" }]')),
      };
    });

    const returnView = {
      rail, navItems, periods, grains, features, states,
      currency: s.currency,
      location: s.location,
      includeTest: s.includeTest,
      testBg: s.includeTest ? '#55349A' : '#cbd5e1',
      testX: s.includeTest ? '17px' : '2px',
      onCurrency: (e) => setState({ ...s, currency: e.target.value  }),
      onLocation: (e) => setState({ ...s, location: e.target.value  }),
      onTest: () => setState({ ...s, includeTest: !s.includeTest  }),

      kpis, attention, trend, modes, provenance, locations, gateway,
      ageing, debtors, statusMix, dueSoon, categories, payoutStatus, cash,
      invoiceStatus, cancelTrend, tax, activity,
      skeletonRows: [1, 2, 3, 4, 5, 6].map((i) => ({ i })),

      kpiLoading: V === 'loading',
      kpiError: V === 'error',
      kpiEmpty: V === 'empty',
      kpiLive: V === 'live' || V === 'partial',
      chartLoading: V === 'loading',
      chartError: V === 'error',
      chartEmpty: V === 'empty',
      chartLive: V === 'live' || V === 'partial',
      chartPartial: V === 'partial',
      activityLive: V !== 'loading',

      openSettled: drillFor('Unsettled gateway money', '₹1,56,800 awaiting settlement across 41 payments',
        ['isSettled = false', 'paymentGateway IN [PAYTM, RAZORPAY]'], 'Payments', '₹1,56,800',
        [
          { primary: 'RCPT-2026-3391', secondary: 'Razorpay · UTR pending', amount: '₹24,800', meta: 'SUCCESS' },
          { primary: 'RCPT-2026-3384', secondary: 'PayTM · UTR pending', amount: '₹9,400', meta: 'SUCCESS' },
          { primary: 'RCPT-2026-3379', secondary: 'Razorpay · UTR 331882194', amount: '₹41,900', meta: 'SETTLED' },
        ],
        payload(['{ "field": "isSettled", "op": "EQ", "value": false }'], '[{ "field": "paymentOn", "dir": "DESC" }]')),
      openDueSoon: drillFor('Due in the next 7 days', '11 invoices worth ₹1,68,900 falling due',
        ['amountDue > 0', 'dueDate BETWEEN now..now+7d'], 'Invoices', '₹1,68,900',
        dueSoonRaw.map((d) => ({ primary: d.num, secondary: d.name + ' · ' + d.origin, amount: money(d.v), meta: 'due ' + d.due })),
        payload(['{ "field": "amountDue", "op": "GT", "value": 0 }', '{ "field": "dueDate", "op": "BETWEEN", "value": ["2026-08-11", "2026-08-18"] }'], '[{ "field": "dueDate", "dir": "ASC" }]')),
      openDrafts: drillFor('Draft backlog', '34 drafts worth ₹2,94,600 — never counted as revenue',
        ['invoiceStatus EQ Draft'], 'Drafts', '₹2,94,600',
        [
          { primary: 'INV-2026-0849', secondary: 'Started by Rekha · Kaloor Main', amount: '₹42,000', meta: '2 days old' },
          { primary: 'INV-2026-0845', secondary: 'Started by Manu · Edappally', amount: '₹18,400', meta: '4 days old' },
          { primary: 'INV-2026-0831', secondary: 'Started by Rekha · Thrissur', amount: '₹9,900', meta: '9 days old' },
        ],
        payload(['{ "field": "invoiceStatus", "op": "EQ", "value": "Draft" }'], '[{ "field": "createdAt", "dir": "ASC" }]')),
      openLeakage: drillFor('Discount & coupon leakage', '₹1,15,800 given away — 5.9% of gross',
        ['discountTotal + couponTotal', 'shared amounts counted on the master invoice only'], 'Invoices', '₹1,15,800',
        [
          { primary: 'INV-2026-0846', secondary: 'Cochin Traders LLP · volume discount', amount: '₹14,200', meta: '12.6% of invoice' },
          { primary: 'INV-2026-0839', secondary: 'Nidiya Textiles · ONAM20 coupon', amount: '₹8,400', meta: 'coupon' },
          { primary: 'INV-2026-0812', secondary: 'Anjali Menon · staff discount', amount: '₹2,100', meta: '11.4% of invoice' },
        ],
        payload(['{ "field": "invoiceDate", "op": "BETWEEN", "value": ["2026-08-01", "2026-08-31"] }'], '[{ "field": "discountTotal", "dir": "DESC" }]')),

      drill: s.drill,
      closeDrill: () => setState({ ...s, drill: null  }),
    };

  // Destructure ONLY the inline properties from the view object
  const { 
    currency, location, includeTest, testBg, testX, onCurrency, onLocation, onTest,
    skeletonRows, kpiLoading, kpiError, kpiEmpty, kpiLive, chartLoading, chartError, chartEmpty, chartLive, chartPartial, activityLive,
    openSettled, openDueSoon, openDrafts, openLeakage, drill, closeDrill
  } = returnView; // The block ends with return { ... }, we need to change it to const returnView = { ... };

  return (
    <div className="bg-[#f8fafc] text-[#0f172a] font-sans min-h-screen text-[13px] leading-normal p-[20px_24px_48px]">
      <div className="w-full relative">
        
        <div style={{"marginBottom":"22px","display":"flex","flexWrap":"wrap","alignItems":"flex-end","justifyContent":"space-between","gap":"24px"}}>
          <div>
            <div style={{"marginBottom":"6px","display":"flex","alignItems":"center","gap":"10px"}}>
              <span style={{"borderRadius":"6px","background":"rgba(5,150,105,.08)","padding":"4px 9px","fontSize":"11px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em","color":"#059669"}}>Finance</span>
              <span style={{"fontSize":"12px","color":"#64748b"}}>Tenant-wide · 3 locations · location is a filter, not a dimension</span>
            </div>
            <h1 style={{"margin":"0","fontSize":"26px","fontWeight":"700","letterSpacing":"-.01em","color":"#0f172a"}}>Overview</h1>
            <p style={{"margin":"5px 0 0","fontSize":"13.5px","color":"#64748b"}}>Where the money is this period — every number opens the rows behind it.</p>
          </div>
          <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
            <select value={ currency } onChange={ onCurrency } style={{"cursor":"pointer","borderRadius":"12px","border":"1px solid #e2e8f0","background":"#fff","padding":"9px 12px","fontSize":"13px","fontWeight":"500","color":"#0f172a","outline":"none","fontFamily":"inherit"}}>
              <option value="default">All → default currency (INR)</option>
              <option value="INR">INR only</option>
              <option value="USD">USD only</option>
              <option value="AED">AED only</option>
            </select>
            <select value={ location } onChange={ onLocation } style={{"cursor":"pointer","borderRadius":"12px","border":"1px solid #e2e8f0","background":"#fff","padding":"9px 12px","fontSize":"13px","fontWeight":"500","color":"#0f172a","outline":"none","fontFamily":"inherit"}}>
              <option value="all">All locations</option>
              <option value="kaloor">Kaloor Main</option>
              <option value="edapally">Edappally</option>
              <option value="thrissur">Thrissur</option>
            </select>
            <div style={{"display":"flex","gap":"2px","borderRadius":"12px","border":"1px solid #e2e8f0","background":"#fff","padding":"3px"}}>
              {periods.map((p, i) => (
<React.Fragment key={i}>
                <button onClick={ p.pick } style={{"cursor":"pointer","border":"0","borderRadius":"9px","padding":"6px 11px","fontSize":"12.5px","fontWeight":"600","fontFamily":"inherit","background":"{ p.bg }","color":"{ p.fg }"}}>{ p.label }</button>
              </React.Fragment>
))}
            </div>
          </div>
        </div>

        {/* provenance + test-txn row */}
        <div style={{"marginBottom":"14px","display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"14px","padding":"12px 16px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
          <span style={{"fontSize":"11.5px","fontWeight":"700","color":"#64748b","textTransform":"uppercase","letterSpacing":".05em"}}>Originating domain</span>
          <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
            {features.map((f, i) => (
<React.Fragment key={i}>
              <button onClick={ f.toggle } style={{"cursor":"pointer","fontFamily":"inherit","fontSize":"12px","fontWeight":"600","padding":"6px 12px","borderRadius":"999px","border":"1px solid { f.bd }","background":"{ f.bg }","color":"{ f.fg }"}}>{ f.label }</button>
            </React.Fragment>
))}
          </div>
          <span style={{"fontSize":"11.5px","color":"#94a3b8"}}>·&nbsp; filters <code style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"11px","color":"#64748b"}}>feature</code>, the originating domain — not the owning service</span>
          <div style={{"flex":"1"}}></div>
          <label style={{"display":"flex","alignItems":"center","gap":"8px","cursor":"pointer","fontSize":"12px","color":"#64748b"}}>
            <span style={{"position":"relative","width":"34px","height":"19px","borderRadius":"999px","background":"{ testBg }","transition":"background .18s"}}>
              <span style={{"position":"absolute","top":"2px","left":"{ testX }","width":"15px","height":"15px","borderRadius":"50%","background":"#fff","boxShadow":"0 1px 2px rgba(0,0,0,.2)","transition":"left .18s"}}></span>
            </span>
            <input type="checkbox" checked={ includeTest } onChange={ onTest } style={{"position":"absolute","opacity":"0","width":"0","height":"0"}}/>
            Include test transactions
          </label>
        </div>

        {/* review-state switcher */}
        <div style={{"marginBottom":"18px","display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap","border":"1px dashed #cbd5e1","borderRadius":"12px","padding":"9px 14px","background":"rgba(148,163,184,.05)"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".07em","color":"#94a3b8"}}>Review states</span>
          <div style={{"display":"flex","gap":"5px","flexWrap":"wrap"}}>
            {states.map((s, i) => (
<React.Fragment key={i}>
              <button onClick={ s.pick } style={{"cursor":"pointer","fontFamily":"inherit","fontSize":"11.5px","fontWeight":"600","padding":"5px 11px","borderRadius":"8px","border":"1px solid { s.bd }","background":"{ s.bg }","color":"{ s.fg }"}}>{ s.label }</button>
            </React.Fragment>
))}
          </div>
          <span style={{"fontSize":"11.5px","color":"#94a3b8"}}>Drives the KPI strip, revenue trend and AR ageing. Three widgets below are pinned to a state permanently: <strong style={{"color":"#64748b","fontWeight":"600"}}>Top debtors</strong> partial, <strong style={{"color":"#64748b","fontWeight":"600"}}>Coupon performance</strong> empty, <strong style={{"color":"#64748b","fontWeight":"600"}}>Payouts by vendor</strong> error.</span>
        </div>

        {/* KPI strip */}
        <div style={{"display":"grid","gridTemplateColumns":"repeat(5,minmax(0,1fr))","gap":"16px","marginBottom":"16px"}}>
          {kpis.map((k, i) => (
<React.Fragment key={i}>
            <div onClick={ k.open } style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"18px 18px 16px","boxShadow":"0 1px 2px rgba(15,23,42,.06)","position":"relative","cursor":"pointer"}}>
              <span style={{"position":"absolute","top":"14px","right":"14px","fontSize":"11px","color":"#cbd5e1"}}>↗</span>
              <div style={{"fontSize":"12px","fontWeight":"600","color":"#64748b","marginBottom":"10px"}}>{ k.label }</div>
              {kpiLoading && (
<React.Fragment>
                <div style={{"height":"26px","borderRadius":"8px","background":"#f1f5f9","animation":"shimmerPulse 1.4s ease-in-out infinite","marginBottom":"8px"}}></div>
                <div style={{"height":"13px","width":"70%","borderRadius":"6px","background":"#f1f5f9","animation":"shimmerPulse 1.4s ease-in-out infinite"}}></div>
              </React.Fragment>
)}
              {kpiError && (
<React.Fragment>
                <div style={{"fontSize":"22px","fontWeight":"700","color":"#cbd5e1"}}>—</div>
                <div style={{"fontSize":"11px","color":"#b91c1c","marginTop":"5px","lineHeight":"1.4"}}>Unavailable — aggregate query failed</div>
              </React.Fragment>
)}
              {kpiEmpty && (
<React.Fragment>
                <div style={{"fontSize":"24px","fontWeight":"700","color":"#cbd5e1"}}>—</div>
                <div style={{"fontSize":"11.5px","color":"#94a3b8","marginTop":"4px"}}>No invoices yet</div>
              </React.Fragment>
)}
              {kpiLive && (
<React.Fragment>
                <div style={{"fontSize":"24px","fontWeight":"700","letterSpacing":"-.01em","color":"#0f172a"}}>{ k.value }</div>
                <div style={{"display":"flex","alignItems":"center","gap":"6px","marginTop":"6px","minHeight":"18px"}}>
                  <span style={{"fontSize":"11.5px","fontWeight":"700","color":"{ k.deltaFg }","background":"{ k.deltaBg }","padding":"2px 7px","borderRadius":"6px"}}>{ k.delta }</span>
                  <span style={{"fontSize":"11px","color":"#94a3b8"}}>{ k.deltaNote }</span>
                </div>
                <svg viewBox="0 0 120 26" preserveAspectRatio="none" style={{"width":"100%","height":"26px","display":"block","marginTop":"10px"}}>
                  <path d={ k.spark.area } fill="rgba(85,52,154,.08)"></path>
                  <polyline points={ k.spark.line } fill="none" stroke="#55349A" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"></polyline>
                </svg>
                <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"6px","lineHeight":"1.4"}}>{ k.note }</div>
              </React.Fragment>
)}
            </div>
          </React.Fragment>
))}
        </div>

        {/* collection rate + needs attention */}
        <div style={{"display":"grid","gridTemplateColumns":"repeat(12,minmax(0,1fr))","gap":"16px","marginBottom":"16px"}}>
          <div style={{"gridColumn":"span 3","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"18px 20px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"12px","fontWeight":"600","color":"#64748b","marginBottom":"8px"}}>Collection rate</div>
            <div style={{"display":"flex","alignItems":"baseline","gap":"8px"}}>
              <span style={{"fontSize":"28px","fontWeight":"700","letterSpacing":"-.02em"}}>81.9%</span>
              <span style={{"fontSize":"11.5px","fontWeight":"700","color":"#059669","background":"#ecfdf5","padding":"2px 7px","borderRadius":"6px"}}>▲ 3.1 pts</span>
            </div>
            <div style={{"height":"9px","borderRadius":"5px","background":"#f1f5f9","overflow":"hidden","margin":"12px 0 9px"}}>
              <div style={{"width":"81.9%","height":"100%","background":"#55349A","borderRadius":"5px"}}></div>
            </div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#64748b"}}>
              <span>₹15,08,940 collected</span><span>₹18,42,360 invoiced</span>
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"10px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"9px"}}>Collected ÷ invoiced for this period. The two come from different write paths, so the ratio can exceed 100% when payments land against older invoices.</div>
          </div>

          <div style={{"gridColumn":"span 9","display":"flex","flexDirection":"column","gap":"10px"}}>
            <div style={{"display":"grid","gridTemplateColumns":"repeat(4,minmax(0,1fr))","gap":"10px"}}>
              {attention.map((a, i) => (
<React.Fragment key={i}>
                <button onClick={ a.open } style={{"display":"flex","alignItems":"center","gap":"12px","textAlign":"left","background":"{ a.bg }","border":"1px solid { a.bd }","borderRadius":"12px","padding":"14px","cursor":"pointer","fontFamily":"inherit"}}>
                  <span style={{"fontSize":"20px","fontWeight":"700","color":"{ a.fg }","minWidth":"26px"}}>{ a.count }</span>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"{ a.lfg }","lineHeight":"1.3"}}>{ a.label }</span>
                  <span style={{"marginLeft":"auto","fontSize":"11px","color":"{ a.fg }"}}>→</span>
                </button>
              </React.Fragment>
))}
            </div>
            <div style={{"display":"flex","alignItems":"center","gap":"10px","background":"#fdf3e1","border":"1px solid #f0dcb2","borderRadius":"12px","padding":"11px 16px"}}>
              <span style={{"fontSize":"13px","color":"#996c00"}}>⚠</span>
              <span style={{"fontSize":"12.5px","color":"#6e5000","lineHeight":"1.45"}}>14 invoices worth ₹57,340 have no <code style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"11.5px"}}>due_date</code> and are excluded from the ageing buckets below — they still count in Outstanding. <strong style={{"fontWeight":"700"}}>Revenue counts master invoices only</strong>; linked children are excluded to avoid double-counting.</span>
            </div>
          </div>
        </div>

        {/* ══════ Section A ══════ */}
        <div style={{"display":"flex","alignItems":"center","gap":"12px","margin":"26px 0 14px"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":".1em","textTransform":"uppercase","color":"#94a3b8"}}>A · Revenue &amp; collections</span>
          <span style={{"flex":"1","height":"1px","background":"#e2e8f0"}}></span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(12,minmax(0,1fr))","gap":"16px"}}>

          {/* A4 trend */}
          <div style={{"gridColumn":"span 8","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"12px","flexWrap":"wrap","marginBottom":"6px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Revenue trend</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Invoiced and collected, daily</div>
              </div>
              <div style={{"display":"flex","alignItems":"center","gap":"14px"}}>
                <span style={{"fontSize":"11.5px","color":"#64748b"}}><span style={{"display":"inline-block","width":"10px","height":"3px","background":"#55349A","borderRadius":"2px","verticalAlign":"middle","marginRight":"5px"}}></span>Invoiced</span>
                <span style={{"fontSize":"11.5px","color":"#64748b"}}><span style={{"display":"inline-block","width":"10px","height":"8px","background":"#fcd34d","borderRadius":"2px","verticalAlign":"middle","marginRight":"5px"}}></span>Collected</span>
                <div style={{"display":"flex","gap":"2px","border":"1px solid #e2e8f0","borderRadius":"9px","padding":"2px"}}>
                  {grains.map((g, i) => (
<React.Fragment key={i}>
                    <button onClick={ g.pick } style={{"cursor":"pointer","border":"0","borderRadius":"7px","padding":"4px 9px","fontSize":"11px","fontWeight":"600","fontFamily":"inherit","background":"{ g.bg }","color":"{ g.fg }"}}>{ g.label }</button>
                  </React.Fragment>
))}
                </div>
              </div>
            </div>
            {chartLoading && (
<React.Fragment>
              <div style={{"height":"248px","borderRadius":"12px","background":"#f1f5f9","animation":"shimmerPulse 1.4s ease-in-out infinite","marginTop":"12px"}}></div>
            </React.Fragment>
)}
            {chartError && (
<React.Fragment>
              <div style={{"height":"248px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"7px"}}>
                <div style={{"fontSize":"13px","fontWeight":"600","color":"#b91c1c"}}>Trend could not be loaded</div>
                <div style={{"fontSize":"11.5px","color":"#94a3b8","maxWidth":"330px","textAlign":"center","lineHeight":"1.5"}}>The aggregate endpoint did not respond. These are missing figures, not zero.</div>
                <button style={{"fontFamily":"inherit","fontSize":"12.5px","fontWeight":"600","color":"#55349A","background":"#ede9fe","border":"0","borderRadius":"8px","padding":"7px 14px","cursor":"pointer","marginTop":"4px"}}>Retry</button>
              </div>
            </React.Fragment>
)}
            {chartEmpty && (
<React.Fragment>
              <div style={{"height":"248px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"7px"}}>
                <div style={{"fontSize":"13px","fontWeight":"600","color":"#64748b"}}>No invoices raised between 1 Aug – 11 Aug</div>
                <div style={{"fontSize":"11.5px","color":"#94a3b8","maxWidth":"330px","textAlign":"center","lineHeight":"1.5"}}>Daily figures appear here once invoices exist in this period.</div>
                <button style={{"fontFamily":"inherit","fontSize":"12.5px","fontWeight":"600","color":"#55349A","background":"#ede9fe","border":"0","borderRadius":"8px","padding":"7px 14px","cursor":"pointer","marginTop":"4px"}}>Create an invoice</button>
              </div>
            </React.Fragment>
)}
            {chartLive && (
<React.Fragment>
              {chartPartial && (
<React.Fragment>
                <div style={{"display":"flex","alignItems":"center","gap":"9px","background":"#fdf3e1","border":"1px solid #f0dcb2","borderRadius":"10px","padding":"9px 13px","margin":"10px 0 4px"}}>
                  <span style={{"fontSize":"12px","color":"#996c00"}}>⚠</span>
                  <span style={{"fontSize":"11.5px","color":"#6e5000","lineHeight":"1.4"}}>Showing 11 of 31 days — the aggregate window was truncated by the API cap. The bars are exact for the days shown; the period total above is not.</span>
                </div>
              </React.Fragment>
)}
              <svg viewBox="0 0 760 250" style={{"width":"100%","display":"block","marginTop":"8px"}}>
                <line x1="0" y1="60" x2="760" y2="60" stroke="#f1f5f9"></line>
                <line x1="0" y1="115" x2="760" y2="115" stroke="#f1f5f9"></line>
                <line x1="0" y1="170" x2="760" y2="170" stroke="#f1f5f9"></line>
                <line x1="0" y1="222" x2="760" y2="222" stroke="#e2e8f0"></line>
                {trend.bars.map((b, i) => (
<React.Fragment key={i}>
                  <rect x={ b.x } y={ b.y } width={ b.w } height={ b.h } rx="3" fill="#fcd34d"></rect>
                </React.Fragment>
))}
                <path d={ trend.area } fill="rgba(85,52,154,.07)"></path>
                <polyline points={ trend.line } fill="none" stroke="#55349A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline>
              </svg>
              <div style={{"display":"flex","justifyContent":"space-between","fontSize":"10.5px","color":"#94a3b8","padding":"2px 4px 0"}}>
                {trend.labels.map((l, i) => (
<React.Fragment key={i}>
                  <span>{ l.text }</span>
                </React.Fragment>
))}
              </div>
            </React.Fragment>
)}
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>
              <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(net_rate)</code> by day. Excludes drafts, cancelled invoices and linked child invoices. Collected is <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(payment.amount) WHERE is_payments_in</code>, excluding test, reverse and reserve transactions.
            </div>
          </div>

          {/* A5 payment mode donut */}
          <div style={{"gridColumn":"span 4","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Payment mode split</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>15 raw modes grouped into 5 buckets</div>
            <div style={{"display":"flex","justifyContent":"center","margin":"14px 0 12px"}}>
              <svg viewBox="0 0 140 140" style={{"width":"140px","height":"140px"}}>
                {modes.map((m, i) => (
<React.Fragment key={i}>
                  <circle cx="70" cy="70" r="54" fill="none" stroke={ m.c } strokeWidth="20" strokeDasharray={ m.dash } strokeDashoffset={ m.off } transform="rotate(-90 70 70)"></circle>
                </React.Fragment>
))}
                <text x="70" y="66" text-anchor="middle" style={{"font":"700 15px inherit","fill":"#0f172a"}}>₹15.1L</text>
                <text x="70" y="82" text-anchor="middle" style={{"font":"500 9.5px inherit","fill":"#94a3b8"}}>collected</text>
              </svg>
            </div>
            <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
              {modes.map((m, i) => (
<React.Fragment key={i}>
                <div onClick={ m.open } style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","cursor":"pointer"}}>
                  <span style={{"width":"9px","height":"9px","borderRadius":"3px","background":"{ m.c }","flex":"none"}}></span>
                  <span style={{"fontWeight":"600"}}>{ m.label }</span>
                  <span style={{"marginLeft":"auto","color":"#0f172a","fontWeight":"600"}}>{ m.value }</span>
                  <span style={{"color":"#94a3b8","width":"38px","textAlign":"right"}}>{ m.pct }</span>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Cash bucket merges <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>Cash</code>+<code style={{"fontFamily":"'JetBrains Mono',monospace"}}>Offline</code>; credit merges <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>CREDIT</code>+<code style={{"fontFamily":"'JetBrains Mono',monospace"}}>STORE_CREDIT</code>+<code style={{"fontFamily":"'JetBrains Mono',monospace"}}>PAYLATER</code>+<code style={{"fontFamily":"'JetBrains Mono',monospace"}}>WALLET</code>. Click any bucket for the raw modes.</div>
          </div>

          {/* A8 provenance */}
          <div style={{"gridColumn":"span 5","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Revenue by originating domain</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Which product raised the invoice</div>
              </div>
              <span style={{"fontSize":"10px","fontWeight":"700","letterSpacing":".06em","textTransform":"uppercase","color":"#059669","background":"rgba(5,150,105,.08)","padding":"3px 8px","borderRadius":"6px"}}>Shared ledger</span>
            </div>
            <div style={{"display":"flex","flexDirection":"column","gap":"15px","marginTop":"18px"}}>
              {provenance.map((p, i) => (
<React.Fragment key={i}>
                <div onClick={ p.open } style={{"cursor":"pointer"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","fontSize":"12.5px","marginBottom":"6px"}}>
                    <span style={{"fontWeight":"600"}}>{ p.label }</span>
                    <span style={{"fontWeight":"700"}}>{ p.value }</span>
                  </div>
                  <div style={{"height":"10px","background":"#f1f5f9","borderRadius":"5px","overflow":"hidden"}}>
                    <div style={{"width":"{ p.pctStr }","height":"100%","background":"{ p.c }","borderRadius":"5px"}}></div>
                  </div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginTop":"5px"}}>{ p.meta }</div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Grouped by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>feature</code> — the originating domain, not the owning service. A patient bill raised in Health is <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>HEALTHCARE</code> even though finance owns the row.</div>
          </div>

          {/* A9 by location */}
          <div style={{"gridColumn":"span 4","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Revenue by location</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>Branch comparison</div>
            <div style={{"display":"flex","flexDirection":"column","gap":"15px","marginTop":"18px"}}>
              {locations.map((l, i) => (
<React.Fragment key={i}>
                <div onClick={ l.open } style={{"cursor":"pointer"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","fontSize":"12.5px","marginBottom":"5px"}}>
                    <span style={{"fontWeight":"600"}}>{ l.name }</span>
                    <span style={{"fontWeight":"700"}}>{ l.value }</span>
                  </div>
                  <div style={{"height":"10px","background":"#f1f5f9","borderRadius":"5px","overflow":"hidden"}}>
                    <div style={{"width":"{ l.pctStr }","height":"100%","background":"#55349A","borderRadius":"5px"}}></div>
                  </div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginTop":"5px"}}>{ l.meta }</div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Hidden entirely for single-location tenants. Rows with no <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>location_uid</code> (₹18,400) sit in Unassigned.</div>
          </div>

          {/* A6 + A7 */}
          <div style={{"gridColumn":"span 3","display":"flex","flexDirection":"column","gap":"16px"}}>
            <div style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
              <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Gateway health</div>
              <div style={{"fontSize":"12px","color":"#64748b"}}>PayTM &amp; Razorpay rows only</div>
              <div style={{"display":"flex","flexDirection":"column","gap":"9px","marginTop":"16px"}}>
                {gateway.map((g, i) => (
<React.Fragment key={i}>
                  <div onClick={ g.open } style={{"display":"flex","alignItems":"center","gap":"9px","fontSize":"12px","cursor":"pointer"}}>
                    <span style={{"width":"8px","height":"8px","borderRadius":"50%","background":"{ g.c }","flex":"none"}}></span>
                    <span style={{"fontWeight":"600"}}>{ g.label }</span>
                    <span style={{"marginLeft":"auto","fontWeight":"700"}}>{ g.count }</span>
                    <span style={{"color":"#94a3b8","width":"34px","textAlign":"right"}}>{ g.pct }</span>
                  </div>
                </React.Fragment>
))}
              </div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}><code style={{"fontFamily":"'JetBrains Mono',monospace"}}>COUNT(*)</code> by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>gateway_status</code>. Offline and cash payments have no gateway status and are excluded.</div>
            </div>
            <div style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
              <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Settlement status</div>
              <div style={{"fontSize":"12px","color":"#64748b"}}>Gateway money reaching the bank</div>
              <div style={{"display":"flex","height":"22px","borderRadius":"7px","overflow":"hidden","gap":"2px","margin":"16px 0 9px"}}>
                <div style={{"width":"82.6%","background":"#059669","borderRadius":"6px 2px 2px 6px"}}></div>
                <div style={{"width":"17.4%","background":"#f59e0b","borderRadius":"2px 6px 6px 2px"}}></div>
              </div>
              <div onClick={ openSettled } style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#64748b","cursor":"pointer"}}>
                <span><strong style={{"color":"#0f172a"}}>₹7,42,300</strong> settled</span>
                <span><strong style={{"color":"#0f172a"}}>₹1,56,800</strong> pending</span>
              </div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Drill-down carries <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>settlement_utr</code> per row.</div>
            </div>
          </div>
        </div>

        {/* ══════ Section B ══════ */}
        <div style={{"display":"flex","alignItems":"center","gap":"12px","margin":"26px 0 14px"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":".1em","textTransform":"uppercase","color":"#94a3b8"}}>B · Receivables &amp; ageing</span>
          <span style={{"flex":"1","height":"1px","background":"#e2e8f0"}}></span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(12,minmax(0,1fr))","gap":"16px"}}>

          {/* B2 ageing */}
          <div style={{"gridColumn":"span 7","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>AR ageing</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Outstanding by days past due date</div>
              </div>
              <span style={{"fontSize":"10px","fontWeight":"700","letterSpacing":".06em","textTransform":"uppercase","color":"#64748b","background":"#f1f5f9","padding":"3px 8px","borderRadius":"6px"}}>As of now · a level, not a flow</span>
            </div>
            {chartLoading && (
<React.Fragment>
              <div style={{"height":"210px","borderRadius":"12px","background":"#f1f5f9","animation":"shimmerPulse 1.4s ease-in-out infinite","marginTop":"16px"}}></div>
            </React.Fragment>
)}
            {chartError && (
<React.Fragment>
              <div style={{"height":"210px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"7px"}}>
                <div style={{"fontSize":"13px","fontWeight":"600","color":"#b91c1c"}}>Ageing unavailable</div>
                <div style={{"fontSize":"11.5px","color":"#94a3b8","maxWidth":"320px","textAlign":"center","lineHeight":"1.5"}}>The bounded aggregate over <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>amount_due</code> timed out. Other widgets are unaffected.</div>
              </div>
            </React.Fragment>
)}
            {chartEmpty && (
<React.Fragment>
              <div style={{"height":"210px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"7px"}}>
                <div style={{"fontSize":"13px","fontWeight":"600","color":"#059669"}}>Nothing outstanding</div>
                <div style={{"fontSize":"11.5px","color":"#94a3b8","maxWidth":"320px","textAlign":"center","lineHeight":"1.5"}}>Every invoice with a due date is fully paid. This is a real ₹0, not missing data.</div>
              </div>
            </React.Fragment>
)}
            {chartLive && (
<React.Fragment>
              <div style={{"display":"flex","flexDirection":"column","gap":"13px","marginTop":"18px"}}>
                {ageing.map((a, i) => (
<React.Fragment key={i}>
                  <div onClick={ a.open } style={{"display":"grid","gridTemplateColumns":"76px 1fr 108px","alignItems":"center","gap":"12px","cursor":"pointer"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#64748b"}}>{ a.bucket }</span>
                    <div style={{"height":"26px","background":"#f8fafc","borderRadius":"7px","overflow":"hidden"}}>
                      <div style={{"width":"{ a.pctStr }","height":"100%","background":"{ a.c }","borderRadius":"7px"}}></div>
                    </div>
                    <span style={{"fontSize":"12.5px","fontWeight":"700","textAlign":"right"}}>{ a.value }</span>
                  </div>
                </React.Fragment>
))}
              </div>
              <div style={{"display":"flex","gap":"24px","marginTop":"16px","paddingTop":"14px","borderTop":"1px solid #f1f5f9"}}>
                <div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginBottom":"3px"}}>Total outstanding</div>
                  <div style={{"fontSize":"18px","fontWeight":"700"}}>₹4,86,210</div>
                </div>
                <div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginBottom":"3px"}}>Overdue value</div>
                  <div style={{"fontSize":"18px","fontWeight":"700","color":"#b45309"}}>₹2,44,310</div>
                </div>
                <div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginBottom":"3px"}}>Overdue invoices</div>
                  <div style={{"fontSize":"18px","fontWeight":"700"}}>87</div>
                </div>
                <div>
                  <div style={{"fontSize":"11px","color":"#94a3b8","marginBottom":"3px"}}>No due date</div>
                  <div style={{"fontSize":"18px","fontWeight":"700","color":"#94a3b8"}}>14 · ₹57,340</div>
                </div>
              </div>
            </React.Fragment>
)}
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Aged on <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>due_date</code>. 14 invoices with a null due date (₹57,340) are <strong style={{"fontWeight":"700"}}>excluded from these buckets</strong> and shown separately — they are still inside Total outstanding.</div>
          </div>

          {/* B4 top debtors (partial, pinned) */}
          <div style={{"gridColumn":"span 5","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Top debtors</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Consumers owing the most</div>
              </div>
              <span style={{"fontSize":"10px","fontWeight":"700","letterSpacing":".06em","textTransform":"uppercase","color":"#996c00","background":"#fdf3e1","border":"1px solid #f0dcb2","padding":"3px 8px","borderRadius":"6px"}}>Top 8 of 61</span>
            </div>
            <div style={{"display":"flex","flexDirection":"column","marginTop":"14px"}}>
              {debtors.map((d, i) => (
<React.Fragment key={i}>
                <div onClick={ d.open } style={{"display":"grid","gridTemplateColumns":"18px 1fr auto","alignItems":"center","gap":"10px","padding":"9px 0","borderBottom":"1px solid #f6f8fb","cursor":"pointer"}}>
                  <span style={{"fontSize":"11px","color":"#94a3b8","fontWeight":"600"}}>{ d.rank }</span>
                  <div style={{"minWidth":"0"}}>
                    <div style={{"fontSize":"12.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{ d.name }</div>
                    <div style={{"fontSize":"11px","color":"#94a3b8"}}>{ d.meta }</div>
                  </div>
                  <div style={{"textAlign":"right"}}>
                    <div style={{"fontSize":"12.5px","fontWeight":"700"}}>{ d.value }</div>
                    <div style={{"fontSize":"10.5px","color":"{ d.ageFg }"}}>{ d.age }</div>
                  </div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Ranked by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(amount_due)</code> per consumer, top 8 only — this is <strong style={{"fontWeight":"700"}}>not</strong> the full receivables list, and the ₹ shown here do not sum to Total outstanding.</div>
          </div>

          {/* B5 status mix */}
          <div style={{"gridColumn":"span 4","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Payment status mix</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>Invoices by settlement state</div>
            <div style={{"display":"flex","flexDirection":"column","gap":"11px","marginTop":"16px"}}>
              {statusMix.map((s, i) => (
<React.Fragment key={i}>
                <div onClick={ s.open } style={{"cursor":"pointer"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","marginBottom":"5px"}}>
                    <span style={{"fontWeight":"600"}}>{ s.label }</span>
                    <span style={{"color":"#64748b"}}>{ s.count } · <strong style={{"color":"#0f172a","fontWeight":"700"}}>{ s.value }</strong></span>
                  </div>
                  <div style={{"height":"7px","background":"#f1f5f9","borderRadius":"4px","overflow":"hidden"}}>
                    <div style={{"width":"{ s.pctStr }","height":"100%","background":"{ s.c }","borderRadius":"4px"}}></div>
                  </div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Display strings from <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>InvoicePaymentStatus</code> — never the constant names. Bars are share of invoice count.</div>
          </div>

          {/* B6 due soon */}
          <div style={{"gridColumn":"span 8","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Due in the next 7 days</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Chase these before they age</div>
              </div>
              <button onClick={ openDueSoon } style={{"fontFamily":"inherit","fontSize":"12px","fontWeight":"600","color":"#55349A","background":"#ede9fe","border":"0","borderRadius":"8px","padding":"6px 12px","cursor":"pointer"}}>Open all 11 →</button>
            </div>
            <div style={{"display":"grid","gridTemplateColumns":"1.1fr 1.4fr .8fr .9fr .8fr .5fr","gap":"10px","padding":"12px 0 8px","borderBottom":"1px solid #e2e8f0","fontSize":"10.5px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".05em","color":"#94a3b8"}}>
              <span>Invoice</span><span>Consumer</span><span>Due</span><span style={{"textAlign":"right"}}>Due amount</span><span>Origin</span><span></span>
            </div>
            {dueSoon.map((d, i) => (
<React.Fragment key={i}>
              <div onClick={ d.open } style={{"display":"grid","gridTemplateColumns":"1.1fr 1.4fr .8fr .9fr .8fr .5fr","gap":"10px","alignItems":"center","padding":"11px 0","borderBottom":"1px solid #f6f8fb","fontSize":"12.5px","cursor":"pointer"}}>
                <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"11.5px","color":"#55349A","fontWeight":"600"}}>{ d.num }</span>
                <span style={{"minWidth":"0","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{ d.name }</span>
                <span style={{"color":"#64748b"}}>{ d.due }</span>
                <span style={{"textAlign":"right","fontWeight":"700"}}>{ d.value }</span>
                <span><span style={{"fontSize":"10.5px","fontWeight":"600","padding":"2px 7px","borderRadius":"5px","background":"{ d.originBg }","color":"{ d.originFg }"}}>{ d.origin }</span></span>
                <span style={{"textAlign":"right","color":"#cbd5e1","fontSize":"11px"}}>→</span>
              </div>
            </React.Fragment>
))}
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45"}}>Invoices with <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>amount_due &gt; 0</code> and <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>due_date</code> within 7 days. Sorted by due date. Drafts and cancelled excluded.</div>
          </div>
        </div>

        {/* ══════ Section C ══════ */}
        <div style={{"display":"flex","alignItems":"center","gap":"12px","margin":"26px 0 14px"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":".1em","textTransform":"uppercase","color":"#94a3b8"}}>C · Expenses &amp; cash position</span>
          <span style={{"flex":"1","height":"1px","background":"#e2e8f0"}}></span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(12,minmax(0,1fr))","gap":"16px"}}>

          {/* C5 net position band */}
          <div style={{"gridColumn":"span 12","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"18px 24px","boxShadow":"0 1px 2px rgba(15,23,42,.06)","display":"grid","gridTemplateColumns":"repeat(4,minmax(0,1fr))","gap":"24px","alignItems":"center"}}>
            <div>
              <div style={{"fontSize":"11.5px","fontWeight":"600","color":"#64748b","marginBottom":"8px"}}>Net cash movement — not profit</div>
              <div style={{"display":"flex","alignItems":"baseline","gap":"9px"}}>
                <span style={{"fontSize":"24px","fontWeight":"700","color":"#059669"}}>+₹8,96,460</span>
                <span style={{"fontSize":"11.5px","color":"#94a3b8"}}>this month</span>
              </div>
            </div>
            <div style={{"borderLeft":"1px solid #f1f5f9","paddingLeft":"24px"}}>
              <div style={{"fontSize":"11.5px","fontWeight":"600","color":"#64748b","marginBottom":"4px"}}>Collected</div>
              <div style={{"fontSize":"21px","fontWeight":"700"}}>₹15,08,940</div>
            </div>
            <div style={{"borderLeft":"1px solid #f1f5f9","paddingLeft":"24px"}}>
              <div style={{"fontSize":"11.5px","fontWeight":"600","color":"#64748b","marginBottom":"4px"}}>Expenses paid</div>
              <div style={{"fontSize":"21px","fontWeight":"700"}}>₹6,12,480</div>
            </div>
            <div style={{"borderLeft":"1px solid #f1f5f9","paddingLeft":"24px"}}>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","lineHeight":"1.5"}}>No cost-of-goods field exists on the invoice, so gross margin cannot be computed. This figure is cash in minus cash out for the period — it is not profit.</div>
            </div>
          </div>

          {/* C2 categories */}
          <div style={{"gridColumn":"span 5","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Expenses by category</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>Tenant-defined categories</div>
            <div style={{"display":"flex","flexDirection":"column","gap":"13px","marginTop":"18px"}}>
              {categories.map((c, i) => (
<React.Fragment key={i}>
                <div onClick={ c.open } style={{"cursor":"pointer"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","fontSize":"12.5px","marginBottom":"5px"}}>
                    <span style={{"fontWeight":"600"}}>{ c.label }</span>
                    <span style={{"fontWeight":"700"}}>{ c.value }</span>
                  </div>
                  <div style={{"height":"9px","background":"#f1f5f9","borderRadius":"5px","overflow":"hidden"}}>
                    <div style={{"width":"{ c.pctStr }","height":"100%","background":"{ c.c }","borderRadius":"5px"}}></div>
                  </div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Top 5 categories by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(amount)</code>; the remaining 9 roll into Other. Category set is tenant-defined and open-ended.</div>
          </div>

          {/* C3 payout status + C4 cash */}
          <div style={{"gridColumn":"span 3","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Expense payout status</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>What you still owe out</div>
            <div style={{"display":"flex","flexDirection":"column","gap":"12px","marginTop":"16px"}}>
              {payoutStatus.map((p, i) => (
<React.Fragment key={i}>
                <div onClick={ p.open } style={{"display":"flex","alignItems":"center","gap":"10px","cursor":"pointer"}}>
                  <span style={{"width":"8px","height":"8px","borderRadius":"50%","background":"{ p.c }","flex":"none"}}></span>
                  <div style={{"minWidth":"0"}}>
                    <div style={{"fontSize":"12px","fontWeight":"600"}}>{ p.label }</div>
                    <div style={{"fontSize":"10.5px","color":"#94a3b8"}}>{ p.meta }</div>
                  </div>
                  <span style={{"marginLeft":"auto","fontSize":"12.5px","fontWeight":"700"}}>{ p.value }</span>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}><code style={{"fontFamily":"'JetBrains Mono',monospace"}}>COUNT(*)</code> and <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(amount_due)</code> by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>ExpensePayoutStatus</code>.</div>
          </div>

          <div style={{"gridColumn":"span 4","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Cash in hand</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Per location, right now</div>
              </div>
              <span style={{"fontSize":"10px","fontWeight":"700","letterSpacing":".06em","textTransform":"uppercase","color":"#64748b","background":"#f1f5f9","padding":"3px 8px","borderRadius":"6px"}}>Point in time</span>
            </div>
            <div style={{"display":"flex","flexDirection":"column","gap":"11px","marginTop":"16px"}}>
              {cash.map((c, i) => (
<React.Fragment key={i}>
                <div onClick={ c.open } style={{"display":"flex","alignItems":"center","gap":"10px","padding":"11px 13px","border":"1px solid #f1f5f9","borderRadius":"11px","cursor":"pointer"}}>
                  <span style={{"fontSize":"15px"}}>💰</span>
                  <span style={{"fontSize":"12.5px","fontWeight":"600"}}>{ c.name }</span>
                  <span style={{"marginLeft":"auto","fontSize":"14px","fontWeight":"700"}}>{ c.value }</span>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Direct read of <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>cash_balance_tbl</code> — one row per location, no history. A cash-over-time chart is not available and would need a snapshot table.</div>
          </div>

          {/* C6 payouts by vendor — ERROR state, pinned */}
          <div style={{"gridColumn":"span 12","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Payouts by vendor</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>Money out, grouped by vendor</div>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","background":"#fef2f2","border":"1px solid #fecaca","borderRadius":"12px","padding":"16px 18px","marginTop":"16px"}}>
              <span style={{"fontSize":"15px","color":"#b91c1c"}}>⚠</span>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"13px","fontWeight":"700","color":"#7f1d1d","marginBottom":"3px"}}>This widget failed to load — the rest of the dashboard is unaffected</div>
                <div style={{"fontSize":"12px","color":"#7f1d1d","lineHeight":"1.5"}}>The vendor payout aggregate returned <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>503</code>. Figures are unavailable, not zero. Vendor bank details stay masked (<code style={{"fontFamily":"'JetBrains Mono',monospace"}}>••••1234</code>) in any drill-down and are revealed only on explicit action.</div>
              </div>
              <button style={{"marginLeft":"auto","flex":"none","fontFamily":"inherit","fontSize":"12.5px","fontWeight":"600","color":"#fff","background":"#b91c1c","border":"0","borderRadius":"9px","padding":"8px 15px","cursor":"pointer"}}>Retry</button>
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45"}}>Would show <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>SUM(amount) WHERE is_payments_in = false</code> grouped by <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>vendor_uid</code>. Vendor payables ageing is not possible — there is no vendor bill entity, only payments out.</div>
          </div>
        </div>

        {/* ══════ Section D ══════ */}
        <div style={{"display":"flex","alignItems":"center","gap":"12px","margin":"26px 0 14px"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":".1em","textTransform":"uppercase","color":"#94a3b8"}}>D · Invoice operations</span>
          <span style={{"flex":"1","height":"1px","background":"#e2e8f0"}}></span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(12,minmax(0,1fr))","gap":"16px"}}>

          {/* D1 status counts */}
          <div style={{"gridColumn":"span 4","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Invoices by status</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>All six states</div>
            <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"10px","marginTop":"16px"}}>
              {invoiceStatus.map((s, i) => (
<React.Fragment key={i}>
                <div onClick={ s.open } style={{"border":"1px solid { s.bd }","background":"{ s.bg }","borderRadius":"11px","padding":"12px 13px","cursor":"pointer"}}>
                  <div style={{"fontSize":"19px","fontWeight":"700","color":"{ s.fg }","lineHeight":"1.1"}}>{ s.count }</div>
                  <div style={{"fontSize":"11px","fontWeight":"600","color":"{ s.lfg }","marginTop":"4px","lineHeight":"1.3"}}>{ s.label }</div>
                </div>
              </React.Fragment>
))}
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"14px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Display strings only — <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>InvoiceStatus</code> is stored ordinal and its constants mix naming styles.</div>
          </div>

          {/* D2 + D3 + D4 */}
          <div style={{"gridColumn":"span 4","display":"flex","flexDirection":"column","gap":"16px"}}>
            <div onClick={ openDrafts } style={{"background":"#fffbeb","border":"1px dashed #fde68a","borderRadius":"16px","padding":"18px 20px","cursor":"pointer"}}>
              <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between"}}>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#92400e"}}>Draft backlog</div>
                <span style={{"fontSize":"10px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em","color":"#92400e"}}>Not revenue yet</span>
              </div>
              <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginTop":"10px"}}>
                <span style={{"fontSize":"24px","fontWeight":"700","color":"#92400e"}}>34</span>
                <span style={{"fontSize":"15px","fontWeight":"700","color":"#b45309"}}>₹2,94,600</span>
              </div>
              <div style={{"fontSize":"10.5px","color":"#a16207","marginTop":"8px","lineHeight":"1.45"}}>Unfinished invoices. Excluded from every revenue figure above — deliberately.</div>
            </div>
            <div style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
              <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
                <div>
                  <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Cancellation rate</div>
                  <div style={{"fontSize":"12px","color":"#64748b"}}>Trend beats the single number</div>
                </div>
                <span style={{"fontSize":"17px","fontWeight":"700"}}>2.7%</span>
              </div>
              <div style={{"display":"flex","alignItems":"flex-end","gap":"6px","height":"56px","marginTop":"16px"}}>
                {cancelTrend.map((c, i) => (
<React.Fragment key={i}>
                  <div style={{"flex":"1","display":"flex","flexDirection":"column","justifyContent":"flex-end","height":"100%"}}>
                    <div style={{"height":"{ c.hStr }","background":"{ c.c }","borderRadius":"4px 4px 2px 2px"}}></div>
                  </div>
                </React.Fragment>
))}
              </div>
              <div style={{"display":"flex","justifyContent":"space-between","fontSize":"10px","color":"#94a3b8","marginTop":"6px"}}>
                <span>Jan</span><span>Aug</span>
              </div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"10px","lineHeight":"1.45"}}>19 cancelled ÷ 703 raised, this month.</div>
            </div>
          </div>

          <div style={{"gridColumn":"span 4","display":"flex","flexDirection":"column","gap":"16px"}}>
            <div onClick={ openLeakage } style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)","cursor":"pointer"}}>
              <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Discount &amp; coupon leakage</div>
              <div style={{"fontSize":"12px","color":"#64748b"}}>Given away this period</div>
              <div style={{"display":"flex","alignItems":"baseline","gap":"10px","marginTop":"12px"}}>
                <span style={{"fontSize":"24px","fontWeight":"700"}}>₹1,15,800</span>
                <span style={{"fontSize":"12.5px","fontWeight":"700","color":"#b45309","background":"#fef3c7","padding":"2px 8px","borderRadius":"6px"}}>5.9% of gross</span>
              </div>
              <div style={{"display":"flex","height":"20px","borderRadius":"7px","overflow":"hidden","gap":"2px","margin":"14px 0 9px"}}>
                <div style={{"width":"72.7%","background":"#8b5cf6","borderRadius":"6px 2px 2px 6px"}}></div>
                <div style={{"width":"27.3%","background":"#f59e0b","borderRadius":"2px 6px 6px 2px"}}></div>
              </div>
              <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#64748b"}}>
                <span><strong style={{"color":"#0f172a"}}>₹84,200</strong> discounts</span>
                <span><strong style={{"color":"#0f172a"}}>₹31,600</strong> coupons</span>
              </div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"11px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"9px"}}>Shared discount and shared coupon columns are counted once, on the master invoice only.</div>
            </div>
            <div style={{"background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
              <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>GST summary</div>
              <div style={{"fontSize":"12px","color":"#64748b"}}>Compliance-facing totals</div>
              <div style={{"marginTop":"14px"}}>
                {tax.map((t, i) => (
<React.Fragment key={i}>
                  <div onClick={ t.open } style={{"display":"flex","justifyContent":"space-between","alignItems":"center","padding":"9px 0","borderBottom":"1px solid #f6f8fb","fontSize":"12.5px","cursor":"pointer"}}>
                    <span style={{"fontWeight":"600","color":"#64748b"}}>{ t.label }</span>
                    <span style={{"fontWeight":"700"}}>{ t.value }</span>
                  </div>
                </React.Fragment>
))}
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","padding":"11px 0 0","fontSize":"13px"}}>
                  <span style={{"fontWeight":"700"}}>Total tax</span>
                  <span style={{"fontWeight":"700"}}>₹1,45,720</span>
                </div>
              </div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"11px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"9px"}}>Amounts are stored as <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>double</code> — shown to 2 decimals and approximate at the third. Do not treat this as a reconciliation that ties exactly.</div>
            </div>
          </div>

          {/* D5 coupon performance — EMPTY state, pinned */}
          <div style={{"gridColumn":"span 5","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Coupon performance</div>
            <div style={{"fontSize":"12px","color":"#64748b"}}>Redemptions per coupon</div>
            <div style={{"display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"9px","height":"216px","textAlign":"center"}}>
              <div style={{"width":"44px","height":"44px","borderRadius":"14px","background":"#f1f5f9","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"19px"}}>🎟️</div>
              <div style={{"fontSize":"13.5px","fontWeight":"700","color":"#0f172a"}}>No coupons published yet</div>
              <div style={{"fontSize":"12px","color":"#94a3b8","maxWidth":"290px","lineHeight":"1.5"}}>Publish a coupon and redemptions, value given away and expiry will appear here. This is an empty state, not a failure or a zero.</div>
              <button style={{"fontFamily":"inherit","fontSize":"12.5px","fontWeight":"600","color":"#fff","background":"#55349A","border":"0","borderRadius":"9px","padding":"8px 15px","cursor":"pointer","marginTop":"2px"}}>Create a coupon</button>
            </div>
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"8px","lineHeight":"1.45","borderTop":"1px solid #f1f5f9","paddingTop":"10px"}}>Would count rows in <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>coupon_stat_tbl</code> grouped by coupon. Coupon amounts are the only money in the service stored as <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>BigDecimal</code>.</div>
          </div>

          {/* D8 recent activity */}
          <div style={{"gridColumn":"span 7","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"16px","padding":"20px 22px","boxShadow":"0 1px 2px rgba(15,23,42,.06)"}}>
            <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
              <div>
                <div style={{"fontSize":"14px","fontWeight":"700","color":"#0f172a"}}>Recent activity</div>
                <div style={{"fontSize":"12px","color":"#64748b"}}>Latest invoices and payments</div>
              </div>
              <span style={{"fontSize":"10px","fontWeight":"700","letterSpacing":".06em","textTransform":"uppercase","color":"#059669","background":"rgba(5,150,105,.08)","padding":"3px 8px","borderRadius":"6px"}}>Buildable today</span>
            </div>
            {chartLoading && (
<React.Fragment>
              <div style={{"display":"flex","flexDirection":"column","gap":"9px","marginTop":"16px"}}>
                {skeletonRows.map((s, i) => (
<React.Fragment key={i}>
                  <div style={{"height":"34px","borderRadius":"9px","background":"#f1f5f9","animation":"shimmerPulse 1.4s ease-in-out infinite"}}></div>
                </React.Fragment>
))}
              </div>
            </React.Fragment>
)}
            {activityLive && (
<React.Fragment>
              <div style={{"marginTop":"12px"}}>
                {activity.map((a, i) => (
<React.Fragment key={i}>
                  <div onClick={ a.open } style={{"display":"grid","gridTemplateColumns":"26px 1.1fr 1.3fr auto auto","gap":"11px","alignItems":"center","padding":"10px 0","borderBottom":"1px solid #f6f8fb","fontSize":"12.5px","cursor":"pointer"}}>
                    <span style={{"width":"26px","height":"26px","borderRadius":"8px","background":"{ a.iconBg }","color":"{ a.iconFg }","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"12px","fontWeight":"700"}}>{ a.icon }</span>
                    <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"11.5px","color":"#55349A","fontWeight":"600"}}>{ a.ref }</span>
                    <span style={{"minWidth":"0","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","color":"#0f172a"}}>{ a.who }</span>
                    <span style={{"fontWeight":"700","color":"{ a.amtFg }"}}>{ a.amount }</span>
                    <span style={{"fontSize":"11px","color":"#94a3b8","width":"64px","textAlign":"right"}}>{ a.when }</span>
                  </div>
                </React.Fragment>
))}
              </div>
            </React.Fragment>
)}
            <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"12px","lineHeight":"1.45"}}>Page 1 of <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>POST /invoice/search</code> and <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>POST /payment/search</code>, newest first — a page, never a total. Test transactions excluded.</div>
          </div>
        </div>

        {/* footer note */}
        <div style={{"marginTop":"26px","borderTop":"1px solid #e2e8f0","paddingTop":"16px","display":"flex","gap":"28px","flexWrap":"wrap"}}>
          <div style={{"fontSize":"10.5px","color":"#94a3b8","lineHeight":"1.55","maxWidth":"430px"}}>
            <strong style={{"color":"#64748b","fontWeight":"700","display":"block","marginBottom":"3px"}}>Design decisions baked in</strong>
            Collected = <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>payment.amount WHERE is_payments_in</code> · totals converted to <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>default_currency</code> with a per-currency filter available · master invoices only · aged on <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>due_date</code> with nulls excluded and labelled · tenant-wide with location as a filter.
          </div>
          <div style={{"fontSize":"10.5px","color":"#94a3b8","lineHeight":"1.55","maxWidth":"430px"}}>
            <strong style={{"color":"#64748b","fontWeight":"700","display":"block","marginBottom":"3px"}}>Deliberately absent</strong>
            No gross-margin widget (no COGS field) · no budget-vs-actual (no budget entity) · no cash-balance-over-time (no snapshot history) · no vendor payables ageing (no vendor bill entity) · nothing sourced from the analytics pipeline.
          </div>
        </div>
      {/* ============ drill-down drawer ============ */}
  {drill && (
<React.Fragment>
    <div onClick={ closeDrill } style={{"position":"fixed","inset":"0","background":"rgba(15,23,42,.28)","zIndex":"400"}}></div>
    <div style={{"position":"fixed","top":"0","right":"0","bottom":"0","width":"520px","maxWidth":"92vw","background":"#fff","zIndex":"401","boxShadow":"-14px 0 40px rgba(15,23,42,.14)","display":"flex","flexDirection":"column"}}>
      <div style={{"flex":"none","padding":"20px 24px 16px","borderBottom":"1px solid #e2e8f0"}}>
        <div style={{"display":"flex","alignItems":"flex-start","gap":"12px"}}>
          <div style={{"minWidth":"0"}}>
            <div style={{"fontSize":"10.5px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".08em","color":"#94a3b8","marginBottom":"5px"}}>Drill-down</div>
            <div style={{"fontSize":"17px","fontWeight":"700","color":"#0f172a","lineHeight":"1.25"}}>{ drill.title }</div>
            <div style={{"fontSize":"12.5px","color":"#64748b","marginTop":"4px","lineHeight":"1.45"}}>{ drill.subtitle }</div>
          </div>
          <button onClick={ closeDrill } style={{"marginLeft":"auto","flex":"none","width":"32px","height":"32px","border":"1px solid #e2e8f0","borderRadius":"9px","background":"#fff","color":"#64748b","cursor":"pointer","fontSize":"15px","fontFamily":"inherit"}}>✕</button>
        </div>
        <div style={{"display":"flex","gap":"6px","flexWrap":"wrap","marginTop":"14px"}}>
          {drill.chips.map((c, i) => (
<React.Fragment key={i}>
            <span style={{"fontSize":"11px","fontWeight":"600","padding":"4px 10px","borderRadius":"999px","background":"#f1f5f9","color":"#475569","fontFamily":"'JetBrains Mono',monospace"}}>{ c.text }</span>
          </React.Fragment>
))}
        </div>
      </div>
      <div style={{"flex":"1","overflowY":"auto","padding":"18px 24px 24px"}}>
        <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","marginBottom":"10px"}}>
          <span style={{"fontSize":"11px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em","color":"#94a3b8"}}>{ drill.countLabel }</span>
          <span style={{"fontSize":"13px","fontWeight":"700","color":"#0f172a"}}>{ drill.total }</span>
        </div>
        {drill.rows.map((r, i) => (
<React.Fragment key={i}>
          <div style={{"display":"grid","gridTemplateColumns":"1fr auto","gap":"10px","alignItems":"center","padding":"11px 0","borderBottom":"1px solid #f6f8fb"}}>
            <div style={{"minWidth":"0"}}>
              <div style={{"fontSize":"12.5px","fontWeight":"600","color":"#0f172a","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{ r.primary }</div>
              <div style={{"fontSize":"11px","color":"#94a3b8","marginTop":"2px"}}>{ r.secondary }</div>
            </div>
            <div style={{"textAlign":"right"}}>
              <div style={{"fontSize":"12.5px","fontWeight":"700"}}>{ r.amount }</div>
              <div style={{"fontSize":"10.5px","color":"#94a3b8"}}>{ r.meta }</div>
            </div>
          </div>
        </React.Fragment>
))}
        <div style={{"marginTop":"16px","background":"#f8fafc","border":"1px solid #eef2f7","borderRadius":"12px","padding":"14px 16px"}}>
          <div style={{"fontSize":"10.5px","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em","color":"#94a3b8","marginBottom":"8px"}}>Request this list came from</div>
          <pre style={{"margin":"0","fontFamily":"'JetBrains Mono',monospace","fontSize":"11px","lineHeight":"1.65","color":"#475569","whiteSpace":"pre-wrap","wordBreak":"break-word"}}>{ drill.payload }</pre>
          <div style={{"fontSize":"10.5px","color":"#94a3b8","marginTop":"10px","lineHeight":"1.5"}}>The client never sends column, table or join names — <code style={{"fontFamily":"'JetBrains Mono',monospace"}}>view</code> selects the projection and the backend owns the SQL.</div>
        </div>
        <div style={{"display":"flex","gap":"9px","marginTop":"16px"}}>
          <button style={{"flex":"1","fontFamily":"inherit","fontSize":"13px","fontWeight":"600","color":"#fff","background":"#55349A","border":"0","borderRadius":"10px","padding":"11px","cursor":"pointer"}}>Open in list view</button>
          <button style={{"fontFamily":"inherit","fontSize":"13px","fontWeight":"600","color":"#475569","background":"#fff","border":"1px solid #e2e8f0","borderRadius":"10px","padding":"11px 16px","cursor":"pointer"}}>Export CSV</button>
        </div>
      </div>
    </div>
  </React.Fragment>
)}

      </div>
    </div>
  );
}
