import React from "react";
import { ArrowRight, Heart, ShoppingCart } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

import type { CustomerCart, WishlistEntry } from "../../../services/useCustomerRecord";
import { inr, relativeTime } from "../theme";
import { EmptyBlock, LoadErrorBlock, SkeletonBar, card, primaryBtn } from "../parts";
import { errorDetail } from "./OrdersTab";

/**
 * What the customer is doing right now but hasn't paid for: an open cart and their
 * wishlist. Both are sales prompts, which is why the cart leads with its value and a way
 * to turn it into an order.
 */
export function ActivityTab({
  cartQuery,
  wishlistQuery,
  itemName,
  onConvert,
}: {
  cartQuery: UseQueryResult<CustomerCart | null, unknown>;
  wishlistQuery: UseQueryResult<WishlistEntry[], unknown>;
  itemName: Map<string, { name: string; sku: string }>;
  onConvert: () => void;
}) {
  const cart = cartQuery.data;
  const cartItems = cart?.items ?? [];
  const cartValue = cartItems.reduce(
    (sum, i) => sum + (Number(i.unitPrice) || 0) * (Number(i.sellQty ?? i.qty) || 0),
    0
  );
  const wishlist = wishlistQuery.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ---- active cart ---- */}
      {cartQuery.isLoading ? (
        <div style={{ ...card, padding: 16 }}>
          <SkeletonBar w="40%" h={14} />
          <div style={{ marginTop: 14 }}>
            <SkeletonBar w="100%" h={40} />
          </div>
        </div>
      ) : cartQuery.isError ? (
        <LoadErrorBlock
          what="the cart"
          detail={errorDetail(cartQuery.error)}
          onRetry={() => cartQuery.refetch()}
        />
      ) : cartItems.length === 0 ? (
        <EmptyBlock
          icon={<ShoppingCart size={26} />}
          title="No active cart"
          body="This customer has nothing sitting in a cart. Carts appear here while they shop and before they check out."
        />
      ) : (
        <div
          style={{
            border: "1px solid var(--kt-accentBorder)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--kt-surface)",
            boxShadow: "var(--kt-shadow)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 16px",
              background: "var(--kt-accentWeak)",
              borderBottom: "1px solid var(--kt-accentBorder)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "var(--kt-accent)",
                  color: "var(--kt-onAccent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingCart size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--kt-text)" }}>
                  Active cart — not checked out
                </div>
                <div style={{ fontSize: 12, color: "var(--kt-text2)", marginTop: 1 }}>
                  {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
                  {cart?.updatedAt ? ` · last active ${relativeTime(cart.updatedAt)}` : ""} · a
                  chance to close
                </div>
              </div>
            </div>
            <button type="button" style={primaryBtn} onClick={onConvert}>
              <ArrowRight size={14} />
              Convert to order
            </button>
          </div>

          {cartItems.map((c, i) => {
            const meta = c.itemUid ? itemName.get(c.itemUid) : undefined;
            const qty = Number(c.sellQty ?? c.qty) || 0;
            return (
              <div
                key={c.uid ?? i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--kt-border)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--kt-text)" }}>
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
                    {meta?.sku ?? c.itemUid?.slice(0, 8) ?? "—"}
                  </div>
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--kt-text3)", fontVariantNumeric: "tabular-nums" }}
                >
                  {qty} × {inr(c.unitPrice)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--kt-text)",
                    fontFamily: "var(--kt-fmono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {inr((Number(c.unitPrice) || 0) * qty)}
                </div>
              </div>
            );
          })}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "13px 16px",
              background: "var(--kt-surface2)",
            }}
          >
            <span style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>Cart value</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--kt-text)",
                fontFamily: "var(--kt-fmono)",
              }}
            >
              {inr(cartValue)}
            </span>
          </div>
        </div>
      )}

      {/* ---- wishlist ---- */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
          <Heart size={17} color="var(--kt-text2)" />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kt-text)" }}>Wishlist</span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--kt-text3)",
              background: "var(--kt-surface3)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {wishlist.length}
          </span>
        </div>

        {wishlistQuery.isLoading ? (
          <SkeletonBar w="100%" h={40} />
        ) : wishlistQuery.isError ? (
          <div style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>
            Couldn't load the wishlist.
          </div>
        ) : wishlist.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>
            Nothing saved for later.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {wishlist.map((w) => {
              const meta = w.itemUid ? itemName.get(w.itemUid) : undefined;
              return (
                <div
                  key={w.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px",
                    borderRadius: 9,
                    borderBottom: "1px solid var(--kt-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "var(--kt-surface3)",
                        flexShrink: 0,
                      }}
                    />
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
                        {meta?.sku ?? w.itemUid?.slice(0, 8) ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
