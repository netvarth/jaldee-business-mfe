import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useMFEProps } from "@jaldee/auth-context";

const SPLASH_MIN_MS = 2500; // minimum time the splash stays on screen
const FADE_MS = 420; // fade-out duration
const BG = "#FAFAFA"; // matches the app background

const KEYFRAMES = `
/* Karty Retail Animation */
@keyframes k-roll{0%{transform:translateX(-46px);opacity:0;}30%{opacity:1;}100%{transform:translateX(0);opacity:1;}}
@keyframes k-word{0%{opacity:0;transform:translateX(-16px);letter-spacing:.16em;}100%{opacity:1;transform:translateX(0);letter-spacing:0em;}}
@keyframes k-nudge{0%,72%,100%{transform:translateX(0);}82%{transform:translateX(3px);}91%{transform:translateX(-1px);}}
@keyframes k-splash-fade{from{opacity:1;}to{opacity:0;}}
@keyframes k-shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}

/* Health Pharmacy Animation */
@keyframes jh-draw{from{stroke-dashoffset:var(--len);}to{stroke-dashoffset:0;}}
@keyframes jh-pop{0%{transform:scale(0);}60%{transform:scale(1.32);}100%{transform:scale(1);}}
@keyframes jh-word{0%{opacity:0;transform:translateX(-14px);letter-spacing:.22em;}100%{opacity:1;transform:translateX(0);letter-spacing:0em;}}
@keyframes jh-glint{0%,58%{stroke-dashoffset:16;opacity:0;}62%{opacity:.9;}92%{opacity:.9;}100%{stroke-dashoffset:-120;opacity:0;}}
@keyframes jh-beat{0%,76%,100%{transform:scale(1);}84%{transform:scale(1.22);}92%{transform:scale(.97);}}

@media (prefers-reduced-motion:reduce){
  .k-splash [data-anim]{animation:none !important;}
  .k-splash [data-anim="glint"]{opacity:0 !important;}
  .k-sk{animation:none !important;}
}
`;

function KartyLogo() {
  const font = "'Poppins', Inter, ui-sans-serif, system-ui, sans-serif";
  return (
    <svg
      role="img"
      viewBox="0 0 360 140"
      width="360"
      height="140"
      style={{ maxWidth: "100%", height: "auto", overflow: "visible" }}
    >
      <title>Karty</title>
      <desc>The lowercase Karty wordmark whose y descender forms a shopping cart rolling in on two teal wheels.</desc>

      <text x="72" y="88" fontFamily={font} fontSize="76" fontWeight={300} fill="#1E293B" letterSpacing="0" data-anim="word" style={{ animation: "k-word .7s cubic-bezier(.22,1,.36,1) .1s backwards" }}>kart</text>

      <g data-anim="cart" style={{ animation: "k-roll .9s cubic-bezier(.17,.84,.34,1) .55s both, k-nudge 3.4s cubic-bezier(.45,.05,.55,.95) 2.8s infinite" }}>
        <text x="218" y="88" fontFamily={font} fontSize="76" fontWeight={300} fill="#1E293B">y</text>
        <path d="M 214 116 L 258 116" fill="none" stroke="#1E293B" strokeWidth={6} strokeLinecap="round" />
        <circle cx="215" cy="128" r="8.5" fill="#14B39A" />
        <circle cx="257" cy="128" r="8.5" fill="#14B39A" />
      </g>
    </svg>
  );
}

function HealthLogo() {
  return (
    <svg
      role="img"
      viewBox="0 0 360 140"
      width="360"
      height="140"
      style={{ maxWidth: "100%", height: "auto", overflow: "visible" }}
    >
      <title>Jaldee Health</title>
      <desc>A heartbeat line sweeping left to right that rises into an upward vitality tick topped by a coral pulse dot, beside the Jaldee Health wordmark.</desc>

      <g fill="none" stroke="#048C84" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 18 80 L 40 80 L 50 62 L 62 98 L 72 80 L 86 80" strokeDasharray="118" data-anim="ecg" style={{ ["--len" as string]: "118", strokeDashoffset: 0, animation: "jh-draw .8s cubic-bezier(.22,1,.36,1) .05s backwards" }} />
        <path d="M 86 80 L 106 52" strokeDasharray="36" data-anim="tick" style={{ ["--len" as string]: "36", strokeDashoffset: 0, animation: "jh-draw .3s cubic-bezier(.16,1,.3,1) .82s backwards" }} />
        <path d="M 18 80 L 40 80 L 50 62 L 62 98 L 72 80 L 86 80 L 106 52" stroke="#E0675A" strokeWidth={7} strokeDasharray="18 320" opacity={0} data-anim="glint" style={{ strokeDashoffset: 16, animation: "jh-glint 3.4s cubic-bezier(.45,.05,.55,.95) 2.4s infinite" }} />
      </g>

      <circle cx="106" cy="52" r="6.5" fill="#E0675A" data-anim="dot" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "jh-pop .42s cubic-bezier(.34,1.4,.64,1) 1.02s backwards, jh-beat 3.4s ease-in-out 2.4s infinite" }} />

      <text x="132" y="82" fontFamily="'Inter Tight', Inter, ui-sans-serif, system-ui, sans-serif" fontSize="30" data-anim="word" style={{ animation: "jh-word .7s cubic-bezier(.22,1,.36,1) 1.2s backwards" }}>
        <tspan fontWeight={500} fill="#1E293B">Jaldee</tspan>
        <tspan fontWeight={400} fill="#048C84" dx="9">Health</tspan>
      </text>
    </svg>
  );
}

/** A shimmering grey placeholder block. */
function Sk({ h = 16, w = "100%", r = 8, style }: { h?: number | string; w?: number | string; r?: number; style?: CSSProperties }) {
  return (
    <div
      className="k-sk"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        background: "linear-gradient(90deg,#eef2f7 25%,#e2e8f0 37%,#eef2f7 63%)",
        backgroundSize: "200% 100%",
        animation: "k-shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

const skCard: CSSProperties = { background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, padding: 20 };

/** Skeleton of the landing (stat cards + a table), shown behind the logo. */
function DashboardSkeleton() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: BG }}>
      <div style={{ padding: "24px 28px", maxWidth: 1600, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {/* header */}
        <div style={{ ...skCard, borderRadius: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Sk h={20} w={200} />
            <Sk h={12} w={320} style={{ marginTop: 10 }} />
          </div>
          <Sk h={34} w={120} r={10} />
        </div>
        {/* stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={skCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <Sk h={36} w={36} r={12} />
                <Sk h={18} w={56} r={9} />
              </div>
              <Sk h={11} w={120} />
              <Sk h={26} w={80} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        {/* table */}
        <div style={{ ...skCard, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Sk h={14} w={160} />
            <Sk h={30} w={100} r={8} />
          </div>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} style={{ padding: "16px 20px", borderBottom: "1px solid #f5f7fa", display: "flex", alignItems: "center", gap: 16 }}>
              <Sk h={36} w={36} r={10} />
              <Sk h={12} w="24%" />
              <Sk h={12} w="18%" />
              <Sk h={12} w="14%" style={{ marginLeft: "auto" }} />
              <Sk h={24} w={72} r={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KartySplash({ fading }: { fading: boolean }) {
  const mfeProps = useMFEProps();
  const isHealth =
    mfeProps?.basePath?.includes("/health") ||
    (mfeProps as any)?.product === "health" ||
    (typeof window !== "undefined" && window.location.pathname.includes("/health"));

  return (
    <div
      className="k-splash"
      aria-label={isHealth ? "Loading Jaldee Health Pharmacy" : "Loading Karty"}
      role="status"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: BG,
        animation: fading ? `k-splash-fade ${FADE_MS}ms ease forwards` : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <style>{KEYFRAMES}</style>
      {/* dashboard/table skeleton loading in the background */}
      <DashboardSkeleton />
      {/* soft glow + logo pinned to the centre of the VISIBLE viewport */}
      <div
        style={{
          position: "absolute",
          top: "calc(50vh - 28px)",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 64px",
          borderRadius: 28,
          background: "radial-gradient(ellipse at center, rgba(250,250,250,0.96) 0%, rgba(250,250,250,0.85) 45%, rgba(250,250,250,0) 75%)",
        }}
      >
        {isHealth ? <HealthLogo /> : <KartyLogo />}
      </div>
    </div>
  );
}

/**
 * Wraps the app. Renders children immediately (so data loads in the background)
 * and overlays the animated splash — scoped to the MFE content area, not the
 * whole screen — for at least SPLASH_MIN_MS, then fades out.
 */
export function KartySplashGate({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), SPLASH_MIN_MS);
    const doneTimer = window.setTimeout(() => setVisible(false), SPLASH_MIN_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: "calc(100vh - 56px)" }}>
      {children}
      {visible && <KartySplash fading={fading} />}
    </div>
  );
}
