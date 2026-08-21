import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Small presentational pieces shared by the Karty customer record's tabs. Kept apart from
 * CustomerDetailPage so that file stays about layout and data, not markup primitives.
 */

export const card: React.CSSProperties = {
  background: "var(--kt-surface)",
  border: "1px solid var(--kt-border)",
  borderRadius: 14,
  boxShadow: "var(--kt-shadow)",
};

export function SectionCardHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: ".02em",
        textTransform: "uppercase",
        color: "var(--kt-text3)",
        marginBottom: 11,
      }}
    >
      {children}
    </div>
  );
}

export function Pill({
  label,
  dot,
  bg,
  fg,
}: {
  label: string;
  dot: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
      {label}
    </span>
  );
}

/** A row of shimmering bars — the design's skeleton for the tiles and the order table. */
export function SkeletonBar({ w, h = 12 }: { w: number | string; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 5,
        background: "var(--kt-surface3)",
        animation: "ktpulse 1.3s ease-in-out infinite",
      }}
    />
  );
}

export function EmptyBlock({
  icon,
  title,
  body,
  action,
  dashed,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  dashed?: boolean;
}) {
  return (
    <div
      style={{
        border: dashed ? "1.5px dashed var(--kt-border2)" : "1px solid var(--kt-border)",
        borderRadius: 13,
        background: dashed ? "var(--kt-surface2)" : "var(--kt-surface)",
        padding: "48px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 15,
          background: "var(--kt-accentWeak)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 17,
          color: "var(--kt-accent)",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16.5, fontWeight: 800, color: "var(--kt-text)" }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--kt-text2)",
          marginTop: 7,
          maxWidth: 400,
          lineHeight: 1.5,
        }}
      >
        {body}
      </div>
      {action ? <div style={{ marginTop: 19 }}>{action}</div> : null}
    </div>
  );
}

/**
 * The partial-failure state: the CRM half of the page is fine, one commerce call is not.
 * It names the service and shows the status, so nobody has to open devtools to find out
 * which half broke.
 */
export function LoadErrorBlock({
  what,
  detail,
  onRetry,
}: {
  what: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--kt-border)",
        borderRadius: 13,
        background: "var(--kt-surface)",
        padding: "44px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--kt-badWeak)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <AlertTriangle size={26} color="var(--kt-bad)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--kt-text)" }}>
        Couldn't load {what}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--kt-text2)",
          marginTop: 7,
          maxWidth: 440,
          lineHeight: 1.5,
        }}
      >
        The customer profile above loaded fine — only {what} failed.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
        <button type="button" onClick={onRetry} style={primaryBtn}>
          <RefreshCw size={14} />
          Retry
        </button>
        {detail ? (
          <span
            style={{
              fontFamily: "var(--kt-fmono)",
              fontSize: 11.5,
              color: "var(--kt-text3)",
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 700,
  background: "var(--kt-accent)",
  color: "var(--kt-onAccent)",
  border: "none",
  cursor: "pointer",
};

export const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 14px",
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 600,
  background: "var(--kt-surface)",
  color: "var(--kt-text)",
  border: "1px solid var(--kt-border2)",
  cursor: "pointer",
};

export const dashedBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 11.5,
  fontWeight: 600,
  background: "transparent",
  color: "var(--kt-text3)",
  border: "1px dashed var(--kt-border2)",
  cursor: "pointer",
};
