import { SiteConfig } from "./siteGeneratorTypes";

export function generatePreviewHTML(cfg: SiteConfig): string {
  const fontPrimary = cfg.primaryFont || "'Playfair Display', serif";
  const brandTitle = cfg.seo?.title || cfg.header?.title || "Website Preview";

  const sectionsHTML = cfg.sections
    .map((sec) => {
      const cards = sec.content
        .map((c) => {
          const imgTag = c.image
            ? `<img src="${c.image}" alt="${c.title}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:12px;" />`
            : "";
          return `
            <div style="border-radius:12px; overflow:hidden; background:#faf9f6; border:1px solid #e7e5e4; padding:16px;">
              ${imgTag}
              <h3 style="font-family:${fontPrimary}; font-size:18px; margin:0 0 6px 0; color:#292524;">${c.title}</h3>
              <p style="font-size:13px; color:#57534e; line-height:1.5; margin:0;">${c.description}</p>
            </div>
          `;
        })
        .join("");

      const subTitleHTML = sec.subTitle
        ? `<p style="font-size:14px; color:#78716c; margin:0 0 24px 0;">${sec.subTitle}</p>`
        : "";

      return `
        <section style="background:#ffffff; border-radius:16px; padding:32px; margin-bottom:32px; box-shadow:0 4px 20px rgba(0,0,0,0.04); border:1px solid #e7e5e4;">
          <h2 style="font-family:${fontPrimary}; font-size:26px; margin:0 0 8px 0; color:#1c1917;">${sec.title || "Section"}</h2>
          ${subTitleHTML}
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:24px;">
            ${cards}
          </div>
        </section>
      `;
    })
    .join("");

  const logoHTML = cfg.logo ? `<img src="${cfg.logo}" alt="Logo" class="logo-img" />` : "";
  const headerTitle = cfg.header?.title || brandTitle;
  const headerDesc = cfg.header?.description || cfg.seo?.description || "";
  const footerTitle = cfg.footer?.title || brandTitle;
  const footerDesc = cfg.footer?.description || "Powered by Jaldee Site Generator Live Show";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Live Preview - ${brandTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #faf9f6; color: #1c1917; }
      .preview-topbar { background: #0f172a; color: #38bdf8; padding: 10px 24px; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
      
      /* Site Header Styles */
      .top-ticker { background: #4a0404; color: #ffffff; text-align: center; padding: 8px 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; }
      .header-wrap { background: #ffffff; border-bottom: 1px solid #e7e5e4; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
      .header-container { max-width: 1320px; margin: 0 auto; padding: 16px 24px; }
      .header-top-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
      .logo-group { display: flex; align-items: center; gap: 16px; cursor: pointer; }
      .logo-img { height: 42px; object-fit: contain; }
      .brand-title { font-family: ${fontPrimary}; font-size: 26px; font-weight: 400; color: #1c1917; margin: 0; }
      .action-pills { display: flex; align-items: center; gap: 10px; }
      .pill-btn { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #1c1917; display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .pills-nav { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .nav-pill { background: #eef2ff; border: 1px solid transparent; border-radius: 20px; padding: 8px 20px; font-size: 13px; font-weight: 600; color: #312e81; text-decoration: none; display: inline-block; }
      
      .main-content { max-width: 1240px; margin: 40px auto; padding: 0 20px; }
      footer { background: #1c1917; color: #faf9f6; padding: 40px; text-align: center; font-size: 14px; margin-top: 60px; }
    </style>
  </head>
  <body>
    <div class="preview-topbar">
      <span>🔴 DETACHED LIVE SHOW PREVIEW</span>
      <span>REAL-TIME SYNCHRONIZED</span>
    </div>
    <div class="top-ticker">Free Shipping on Orders Worth ₹500/-</div>
    <div class="header-wrap">
      <div class="header-container">
        <div class="header-top-row">
          <div class="logo-group">
            ${logoHTML}
            <h1 class="brand-title">${brandTitle}</h1>
          </div>
          <div class="action-pills">
            <button type="button" class="pill-btn">🔍 Search</button>
            <button type="button" class="pill-btn">🛒 Cart</button>
            <button type="button" class="pill-btn">👤 Account ▾</button>
          </div>
        </div>
        <nav class="pills-nav">
          <a href="#shop" class="nav-pill">Shop</a>
          <a href="#our-story" class="nav-pill">Our Story</a>
          <a href="#what-we-dont-do" class="nav-pill">What We Don't Do</a>
          <a href="#contact" class="nav-pill">Contact Us</a>
          <a href="#gifting" class="nav-pill">Gifting</a>
        </nav>
      </div>
    </div>
    <div class="hero-banner" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 60px 40px; text-align: center; border-bottom: 1px solid #fde68a;">
      <h1 style="font-family: ${fontPrimary}; font-size: 38px; color: #78350f; margin: 0 0 12px 0;">${headerTitle}</h1>
      <p style="font-size: 18px; color: #92400e; max-width: 760px; margin: 0 auto; line-height: 1.6;">${headerDesc}</p>
    </div>
    <main class="main-content">
      ${sectionsHTML}
    </main>
    <footer>
      <h4>${footerTitle}</h4>
      <p>${footerDesc}</p>
    </footer>
  </body>
</html>`;
}
