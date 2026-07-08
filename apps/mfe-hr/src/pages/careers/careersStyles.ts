/** Scoped styles for the public careers pages (Jaldee brand). All rules are
 *  namespaced under `.jd` so they never leak into the rest of the app. */
export const careersStyles = `
.jd{
  --brand:#5B21D1; --brand-dark:#4C1DB3; --accent:#0369A1;
  --ink:#1E1B4B; --body:#3b4252; --muted:#6b7280; --line:#E5E7EB;
  --card:#fff; --accent-soft:#EDE9FE;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif;
  color:var(--body); background:var(--card); border-radius:22px; overflow:hidden;
  max-width:1120px; margin:0 auto; box-shadow:0 1px 2px rgba(16,12,20,.04),0 12px 32px rgba(40,30,90,.09);
}
.jd *{box-sizing:border-box}
.jd .site-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 30px;border-bottom:1px solid var(--line)}
.jd .logo{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--ink);font-size:17px}
.jd .logo .mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--brand),var(--accent));display:grid;place-items:center;color:#fff;font-weight:800}
.jd .nav-links{display:flex;gap:22px;color:var(--muted);font-size:14px;font-weight:600}
.jd .nav-links a{color:inherit;text-decoration:none}
.jd .nav-links a:hover{color:var(--brand)}
.jd .hero{padding:40px 30px 26px;background:linear-gradient(180deg,var(--accent-soft),#fff)}
.jd .crumb{font-size:13px;color:var(--muted);margin-bottom:14px}
.jd .crumb a{color:var(--brand);text-decoration:none;font-weight:600}
.jd .hero h1{margin:0 0 12px;font-size:34px;line-height:1.15;color:var(--ink);letter-spacing:-.5px}
.jd .chips{display:flex;gap:9px;flex-wrap:wrap}
.jd .chip{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);color:var(--body);font-size:13px;font-weight:600;padding:7px 12px;border-radius:999px;box-shadow:0 1px 2px rgba(16,12,20,.06)}
.jd .layout{display:grid;grid-template-columns:1fr 360px;gap:34px;padding:30px 30px 44px}
.jd .prose h2{font-size:19px;color:var(--ink);margin:26px 0 10px}
.jd .prose h2:first-child{margin-top:0}
.jd .prose p{line-height:1.65;margin:0 0 12px}
.jd .prose ul{margin:0 0 12px;padding-left:0;list-style:none}
.jd .prose li{position:relative;padding:6px 0 6px 28px;line-height:1.5}
.jd .prose li::before{content:"";position:absolute;left:4px;top:12px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.jd .tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.jd .tag{background:var(--accent-soft);color:var(--brand-dark);font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:8px}
.jd .apply{align-self:start;position:sticky;top:20px}
.jd .apply-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 32px rgba(40,30,90,.09);overflow:hidden}
.jd .apply-head{padding:18px 20px;background:var(--brand);color:#fff}
.jd .apply-head .t{font-weight:800;font-size:16px}
.jd .apply-head .s{font-size:12.5px;opacity:.85;margin-top:3px}
.jd .apply-body{padding:18px 20px}
.jd .field{margin-bottom:14px}
.jd .field label{display:block;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px}
.jd .field .req{color:#d64545}
.jd .field input,.jd .field textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit;font-size:14px;color:var(--ink);background:#fff}
.jd .field input:focus,.jd .field textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(91,33,209,.14)}
.jd .field textarea{resize:vertical;min-height:76px}
.jd .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.jd .dropzone{display:block;border:2px dashed #d7cfdd;border-radius:12px;padding:18px;text-align:center;background:#faf8fc;cursor:pointer}
.jd .dropzone:hover{border-color:var(--brand);background:#f6f1f8}
.jd .dropzone .dz-ic{font-size:22px;color:var(--brand);display:block;margin-bottom:4px}
.jd .dropzone .dz-main{font-size:13.5px;font-weight:700;color:var(--ink)}
.jd .dropzone .dz-sub{font-size:11.5px;color:var(--muted);margin-top:3px}
.jd .consent{display:flex;gap:9px;align-items:flex-start;margin:4px 0 14px;font-size:12px;color:var(--muted);line-height:1.45}
.jd .consent input{margin-top:2px}
.jd .btn-apply{width:100%;border:0;background:var(--brand);color:#fff;font:inherit;font-weight:800;font-size:15px;padding:13px;border-radius:11px;cursor:pointer;box-shadow:0 6px 18px rgba(91,33,209,.28)}
.jd .btn-apply:hover{background:var(--brand-dark)}
.jd .btn-apply:disabled{opacity:.6;cursor:default}
.jd .apply-foot{padding:12px 20px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted);text-align:center}
.jd .err{background:#FEE2E2;border:1px solid #fca5a5;color:#b91c1c;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
.jd .success{padding:26px 20px;text-align:center}
.jd .success .ok{width:52px;height:52px;border-radius:50%;background:#D1FAE5;color:#059669;display:grid;place-items:center;margin:0 auto 12px;font-size:24px;font-weight:800}
.jd .success h3{margin:0 0 6px;color:var(--ink)}
.jd .success p{margin:0;color:var(--muted);font-size:13.5px}
.jd .footer{padding:22px 30px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
/* template: split */
.jd.tpl-split .hero{background:#fff;border-bottom:1px solid var(--line)}
.jd.tpl-split .prose{background:var(--accent-soft);border:1px solid var(--line);border-radius:16px;padding:24px}
.jd.tpl-split .apply-head{background:linear-gradient(135deg,var(--brand),var(--accent))}
/* template: minimal */
.jd.tpl-minimal .hero{background:#fff}
.jd.tpl-minimal .hero h1{font-size:40px;border-left:5px solid var(--accent);padding-left:16px}
.jd.tpl-minimal .layout{grid-template-columns:1fr;max-width:760px;margin:0 auto}
.jd.tpl-minimal .apply{position:static}
.jd.tpl-minimal .apply-head{background:#fff;color:var(--ink);border-bottom:1px solid var(--line)}
.jd.tpl-minimal .apply-head .s{opacity:.7}
@media(max-width:920px){
  .jd .layout{grid-template-columns:1fr;gap:24px}
  .jd .apply{position:static}
  .jd .nav-links{display:none}
  .jd .hero h1{font-size:27px}
  .jd .row2{grid-template-columns:1fr}
}
/* careers listing */
.jd .list-wrap{padding:12px 30px 44px}
.jd .job-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--line);border-radius:14px;margin-bottom:12px;cursor:pointer;transition:.15s;background:#fff}
.jd .job-row:hover{border-color:var(--brand);box-shadow:0 8px 22px rgba(40,30,90,.08)}
.jd .job-row .jt{font-weight:800;color:var(--ink);font-size:16px}
.jd .job-row .jm{font-size:13px;color:var(--muted);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}
.jd .job-row .go{color:var(--brand);font-weight:700;font-size:14px;white-space:nowrap}
`;
