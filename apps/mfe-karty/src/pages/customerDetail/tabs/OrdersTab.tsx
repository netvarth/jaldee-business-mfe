import React, { useMemo, useState } from "react";
import { ChevronDown, Filter, Globe, Plus, Search, ShoppingBag, Store } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

import { useOrderLines, type CustomerOrder } from "../../../services/useCustomerRecord";
import { ORDER_STATUS_STYLE, formatDate, inr, isDarkTheme } from "../theme";
import { EmptyBlock, LoadErrorBlock, Pill, SkeletonBar, ghostBtn, primaryBtn } from "../parts";

const PAGE_SIZE = 8;
// Tightened from the design's 640px minimum: with the 320px identity column beside it, a
// 640px table pushed Status off the visible area and made the row look truncated.
const GRID = "1.35fr 1.15fr .4fr .7fr .95fr 26px";

/**
 * The customer's order history — the tab the record opens on, because "what have they
 * bought" is the question this page exists to answer.
 *
 * Filtering is client-side over the customer's full order list: a single customer's orders
 * are a small set, and filtering locally keeps status/channel/search instant and lets the
 * "no orders match this filter" state be distinguished from "no orders at all", which a
 * server-filtered empty response cannot tell you.
 */
export function OrdersTab({
  query,
  storeName,
  itemName,
  onNewOrder,
  onOpenOrder,
}: {
  query: UseQueryResult<CustomerOrder[], unknown>;
  storeName: Map<string, string>;
  itemName: Map<string, { name: string; sku: string }>;
  onNewOrder: () => void;
  onOpenOrder: (order: CustomerOrder) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const orders = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => (status === "all" ? true : String(o.status) === status))
      .filter((o) => (channel === "all" ? true : String(o.channel) === channel))
      .filter((o) =>
        q ? (o.orderNo || "").toLowerCase().includes(q) || o.uid.toLowerCase().includes(q) : true
      )
      .sort((a, b) => String(b.orderDate ?? "").localeCompare(String(a.orderDate ?? "")));
  }, [orders, search, status, channel]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const filtersActive = status !== "all" || channel !== "all" || search.trim() !== "";

  return (
    <div>
      {/* filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 170 }}>
          <Search
            size={15}
            color="var(--kt-text3)"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search order #"
            style={{
              width: "100%",
              padding: "9px 12px 9px 33px",
              fontSize: 13,
              fontFamily: "var(--kt-fsans)",
              border: "1px solid var(--kt-border2)",
              borderRadius: 9,
              background: "var(--kt-surface)",
              color: "var(--kt-text)",
              outline: "none",
            }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          style={selectStyle}
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS_STYLE).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(0);
          }}
          style={selectStyle}
        >
          <option value="all">All channels</option>
          <option value="WALKIN">Walk-in</option>
          <option value="ONLINE">Online</option>
        </select>
      </div>

      {/* status legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 12,
          padding: "0 2px",
        }}
      >
        {Object.values(ORDER_STATUS_STYLE).map((s) => (
          <span
            key={s.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--kt-text3)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
            {s.label}
          </span>
        ))}
      </div>

      {query.isLoading ? (
        <div
          style={{
            border: "1px solid var(--kt-border)",
            borderRadius: 13,
            overflow: "hidden",
            background: "var(--kt-surface)",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
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
              <SkeletonBar w={4} h={34} />
              <SkeletonBar w={90} />
              <SkeletonBar w={80} />
              <div style={{ flex: 1 }} />
              <SkeletonBar w={70} />
              <SkeletonBar w={84} h={22} />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <LoadErrorBlock
          what="orders"
          detail={errorDetail(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyBlock
          dashed
          icon={<ShoppingBag size={28} />}
          title="No orders yet"
          body="This customer hasn't placed an order. Start their first one to begin building history."
          action={
            <button type="button" style={primaryBtn} onClick={onNewOrder}>
              <Plus size={15} />
              Create first order
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          icon={<Filter size={26} />}
          title="No orders match this filter"
          body={`This customer has orders — none in the current slice (${filterSummary(status, channel, search)}).`}
          action={
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                setStatus("all");
                setChannel("all");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
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
                minWidth: 560,
                padding: "11px 18px",
                background: "var(--kt-surface2)",
                borderBottom: "1px solid var(--kt-border)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: "var(--kt-text3)",
              }}
            >
              <div>Order</div>
              <div>Channel / Store</div>
              <div style={{ textAlign: "center" }}>Items</div>
              <div style={{ textAlign: "right" }}>Total</div>
              <div>Status</div>
              <div />
            </div>

            {visible.map((o) => (
              <OrderRow
                key={o.uid}
                order={o}
                storeName={storeName}
                itemName={itemName}
                expanded={expanded === o.uid}
                onToggle={() => setExpanded((cur) => (cur === o.uid ? null : o.uid))}
                onOpen={() => onOpenOrder(o)}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--kt-text3)" }}>
              Showing {visible.length} of {filtered.length} order{filtered.length === 1 ? "" : "s"}
              {filtersActive ? ` (filtered from ${orders.length})` : ""}
            </span>
            {pages > 1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                  style={{ ...pagerBtn, opacity: current === 0 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                {Array.from({ length: pages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: i === current ? 700 : 600,
                      border: i === current ? "none" : "1px solid var(--kt-border2)",
                      background: i === current ? "var(--kt-accent)" : "var(--kt-surface)",
                      color: i === current ? "var(--kt-onAccent)" : "var(--kt-text2)",
                      cursor: "pointer",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                  style={{ ...pagerBtn, opacity: current >= pages - 1 ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function OrderRow({
  order,
  storeName,
  itemName,
  expanded,
  onToggle,
  onOpen,
}: {
  order: CustomerOrder;
  storeName: Map<string, string>;
  itemName: Map<string, { name: string; sku: string }>;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  // Lines are only fetched once a row is opened — the list endpoint doesn't carry them.
  const linesQ = useOrderLines(expanded ? order.uid : null);
  const s = ORDER_STATUS_STYLE[String(order.status)] ?? ORDER_STATUS_STYLE.PENDING;
  const dark = isDarkTheme();

  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 14,
          minWidth: 560,
          alignItems: "center",
          padding: "13px 18px",
          borderBottom: "1px solid var(--kt-border)",
          cursor: "pointer",
          background: expanded ? "var(--kt-surface2)" : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <span style={{ width: 4, height: 32, borderRadius: 4, background: s.dot, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              style={{
                fontFamily: "var(--kt-fmono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--kt-accent)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {order.orderNo ? `#${order.orderNo}` : `#${order.uid.slice(0, 8)}`}
            </button>
            <div style={{ fontSize: 11.5, color: "var(--kt-text3)", marginTop: 2 }}>
              {formatDate(order.orderDate)}
            </div>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--kt-text2)",
            }}
          >
            {order.channel === "ONLINE" ? <Globe size={13} /> : <Store size={13} />}
            {order.channel === "ONLINE" ? "Online" : "Walk-in"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--kt-text3)", marginTop: 2 }}>
            {order.storeUid ? storeName.get(order.storeUid) ?? "Unknown store" : "No store"}
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--kt-text2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {order.itemsCount ?? 0}
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--kt-text)",
            fontFamily: "var(--kt-fmono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {inr(order.totalAmount)}
        </div>
        <div>
          <Pill
            label={s.label}
            dot={s.dot}
            bg={dark ? s.darkBg : s.bg}
            fg={dark ? s.darkFg : s.fg}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", color: "var(--kt-text3)" }}>
          <ChevronDown
            size={17}
            style={{ transition: "transform .18s", transform: `rotate(${expanded ? 180 : 0}deg)` }}
          />
        </div>
      </div>

      {expanded ? (
        <div
          style={{
            padding: "2px 18px 16px 33px",
            background: "var(--kt-surface2)",
            borderBottom: "1px solid var(--kt-border)",
          }}
        >
          <div
            style={{
              border: "1px solid var(--kt-border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--kt-surface)",
            }}
          >
            {linesQ.isLoading ? (
              <div style={{ padding: 14 }}>
                <SkeletonBar w="60%" />
              </div>
            ) : linesQ.isError ? (
              <div style={{ padding: 14, fontSize: 12.5, color: "var(--kt-text3)" }}>
                Couldn't load the lines for this order.
              </div>
            ) : (linesQ.data ?? []).length === 0 ? (
              <div style={{ padding: 14, fontSize: 12.5, color: "var(--kt-text3)" }}>
                This order has no line items.
              </div>
            ) : (
              (linesQ.data ?? []).map((l, i) => {
                const meta = l.itemUid ? itemName.get(l.itemUid) : undefined;
                return (
                  <div
                    key={l.uid ?? i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 16,
                      alignItems: "center",
                      padding: "11px 14px",
                      borderBottom: "1px solid var(--kt-border)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--kt-text)" }}>
                        {meta?.name ?? "Item"}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--kt-fmono)",
                          fontSize: 11,
                          color: "var(--kt-text3)",
                          marginTop: 2,
                        }}
                      >
                        {meta?.sku ?? l.itemUid?.slice(0, 8) ?? "—"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--kt-text3)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {(l.sellQty ?? l.qty ?? 0)} × {inr(l.unitPrice)}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "var(--kt-text)",
                        fontFamily: "var(--kt-fmono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {inr(l.lineTotal)}
                    </div>
                  </div>
                );
              })
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "var(--kt-surface2)",
              }}
            >
              <button
                type="button"
                onClick={onOpen}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--kt-accent)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                Open order detail →
              </button>
              <span style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>
                Total{" "}
                <strong style={{ color: "var(--kt-text)", fontFamily: "var(--kt-fmono)" }}>
                  {inr(order.totalAmount)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--kt-fsans)",
  border: "1px solid var(--kt-border2)",
  borderRadius: 9,
  background: "var(--kt-surface)",
  color: "var(--kt-text2)",
  cursor: "pointer",
};

const pagerBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  border: "1px solid var(--kt-border2)",
  background: "var(--kt-surface)",
  color: "var(--kt-text2)",
  cursor: "pointer",
};

function filterSummary(status: string, channel: string, search: string) {
  const parts = [
    status !== "all" ? ORDER_STATUS_STYLE[status]?.label ?? status : null,
    channel !== "all" ? (channel === "ONLINE" ? "Online" : "Walk-in") : null,
    search.trim() ? `“${search.trim()}”` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "current filters";
}

export function errorDetail(error: unknown): string | undefined {
  const message = (error as { message?: string } | null)?.message;
  return message ? `commerce-service · ${message}` : undefined;
}

function isDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
