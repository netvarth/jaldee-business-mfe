import React from "react";
import { RotateCcw } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

import type { CustomerOrder, CustomerReturn } from "../../../services/useCustomerRecord";
import { REFUND_STATUS_LABEL, RETURN_STATUS_STYLE, formatDate, inr, isDarkTheme } from "../theme";
import { EmptyBlock, LoadErrorBlock, Pill, SkeletonBar } from "../parts";
import { errorDetail } from "./OrdersTab";

const GRID = "1.15fr .95fr .4fr .95fr .95fr";

/** Sales returns raised against this customer's orders, with what each one refunded. */
export function ReturnsTab({
  query,
  orders,
  orderNoByUid,
}: {
  query: UseQueryResult<CustomerReturn[], unknown>;
  orders: CustomerOrder[];
  orderNoByUid: Map<string, string>;
}) {
  const returns = query.data ?? [];
  const eligible = orders.filter((o) => o.status === "DELIVERED").length;
  const dark = isDarkTheme();

  if (query.isLoading) {
    return (
      <div
        style={{
          border: "1px solid var(--kt-border)",
          borderRadius: 13,
          overflow: "hidden",
          background: "var(--kt-surface)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 18px",
              borderBottom: "1px solid var(--kt-border)",
            }}
          >
            <SkeletonBar w={100} />
            <SkeletonBar w={90} />
            <div style={{ flex: 1 }} />
            <SkeletonBar w={84} h={22} />
          </div>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <LoadErrorBlock what="returns" detail={errorDetail(query.error)} onRetry={() => query.refetch()} />
    );
  }

  return (
    <div>
      {eligible > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 15px",
            marginBottom: 14,
            background: "var(--kt-accentWeak)",
            border: "1px solid var(--kt-accentBorder)",
            borderRadius: 11,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <RotateCcw size={19} color="var(--kt-accent)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kt-text)" }}>
              <strong>
                {eligible} delivered order{eligible === 1 ? "" : "s"}
              </strong>{" "}
              {eligible === 1 ? "is" : "are"} eligible for return.
            </span>
          </div>
        </div>
      ) : null}

      {returns.length === 0 ? (
        <EmptyBlock
          icon={<RotateCcw size={26} />}
          title="No returns"
          body="Nothing has been sent back. Returns raised against this customer's orders will appear here."
        />
      ) : (
        <div
          className="kt-scroll"
          style={{
            border: "1px solid var(--kt-border)",
            borderRadius: 13,
            overflowX: "auto",
            background: "var(--kt-surface)",
            boxShadow: "var(--kt-shadow)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 14,
              minWidth: 520,
              padding: "11px 16px",
              background: "var(--kt-surface2)",
              borderBottom: "1px solid var(--kt-border)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              color: "var(--kt-text3)",
            }}
          >
            <div>Return</div>
            <div>Against order</div>
            <div style={{ textAlign: "center" }}>Items</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Refund</div>
          </div>

          {returns.map((r) => {
            const s = RETURN_STATUS_STYLE[String(r.status)] ?? RETURN_STATUS_STYLE.DRAFT;
            const refundLabel = REFUND_STATUS_LABEL[String(r.refundStatus)] ?? "—";
            return (
              <div
                key={r.uid}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 14,
                  minWidth: 520,
                  alignItems: "center",
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--kt-border)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--kt-fmono)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--kt-text)",
                    }}
                  >
                    {r.returnNo ? `#${r.returnNo}` : `#${r.uid.slice(0, 8)}`}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--kt-text3)", marginTop: 2 }}>
                    {formatDate(r.returnDate)}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--kt-fmono)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--kt-accent)",
                  }}
                >
                  {r.orderUid ? `#${orderNoByUid.get(r.orderUid) ?? r.orderUid.slice(0, 8)}` : "—"}
                </span>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--kt-text2)",
                  }}
                >
                  {/* The list endpoint doesn't expand lines — show that we don't know
                      rather than a confident 0. */}
                  {r.items ? r.items.length : "—"}
                </div>
                <div>
                  <Pill label={s.label} dot={s.dot} bg={dark ? s.darkBg : s.bg} fg={dark ? s.darkFg : s.fg} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--kt-text)",
                      fontFamily: "var(--kt-fmono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {inr(r.refundAmount ?? 0)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      marginTop: 2,
                      color:
                        r.refundStatus === "REFUNDED" ? "var(--kt-good)" : "var(--kt-text3)",
                    }}
                  >
                    {refundLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
