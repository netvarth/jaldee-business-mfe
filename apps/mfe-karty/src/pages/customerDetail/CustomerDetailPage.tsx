import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { SharedModulesProvider } from "@jaldee/shared-modules";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Power,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";

import { useItems } from "../../services/useItems";
import { useStores } from "../../services/useStores";
import {
  useCustomerCart,
  useCustomerOrders,
  useCustomerReturns,
  useCustomerWishlist,
  type CustomerOrder,
} from "../../services/useCustomerRecord";
import { consumerLabels, consumerName, useKartyConsumer } from "./useKartyConsumer";
import {
  KARTY_THEMES,
  OPEN_ORDER_STATUSES,
  formatDate,
  initialsOf,
  inr,
  isDarkTheme,
  relativeTime,
} from "./theme";
import { SectionCardHead, SkeletonBar, card, dashedBtn, ghostBtn, primaryBtn } from "./parts";
import { OrdersTab } from "./tabs/OrdersTab";
import { ReturnsTab } from "./tabs/ReturnsTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { NotesTab } from "./tabs/NotesTab";
import { FamilyTab } from "./tabs/FamilyTab";

export type TabKey = "orders" | "returns" | "activity" | "notes" | "family";

/**
 * Karty's customer record.
 *
 * Deliberately not the shared CustomersModule detail: everything below the profile card is
 * commerce — orders, returns, the live cart, the wishlist — and none of it belongs on the
 * health or lending version of the same screen. The CRM half (profile, labels, groups,
 * notes, family) still comes from base-crm through the shared hooks, so a customer edited
 * anywhere shows the same details here.
 */
export default function CustomerDetailPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const uid = params.recordId ?? null;

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "customers" as const,
      product: "karty" as const,
      apiScope: "global" as const,
      basePath: `${mfeProps?.basePath ?? ""}/customers`,
      assetsBaseUrl: mfeProps?.assetsBaseUrl,
      user: mfeProps?.user,
      account: normalizeAccountContext(mfeProps?.account),
      location: mfeProps?.location ?? null,
      api: mfeProps?.api,
      routeParams: { locationId: mfeProps?.location?.id ?? null, recordId: uid },
    }),
    [mfeProps, uid]
  );

  if (!mfeProps?.api || !uid) {
    return (
      <div style={{ padding: 28, fontSize: 13, color: "#64748b" }}>
        Customer records open from the Karty customers list.
      </div>
    );
  }

  return (
    <SharedModulesProvider value={sharedModuleProps as never}>
      <KartyCustomerRecord uid={uid} />
    </SharedModulesProvider>
  );
}

function KartyCustomerRecord({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("orders");
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useThemeTokens();

  const consumerQ = useKartyConsumer(uid);
  const ordersQ = useCustomerOrders(uid);
  const returnsQ = useCustomerReturns(uid);
  const cartQ = useCustomerCart(uid);
  const wishlistQ = useCustomerWishlist(uid);
  const itemsQ = useItems();
  const storesQ = useStores();

  const consumer = consumerQ.data;
  const name = consumerName(consumer);
  const labels = consumerLabels(consumer);
  const orders = ordersQ.data ?? [];

  const itemName = useMemo(() => {
    const map = new Map<string, { name: string; sku: string }>();
    (itemsQ.data ?? []).forEach((i: any) => map.set(i.uid, { name: i.name, sku: i.sku }));
    return map;
  }, [itemsQ.data]);

  const storeName = useMemo(() => {
    const map = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => map.set(s.id ?? s.uid, s.name));
    return map;
  }, [storesQ.data]);

  const orderNoByUid = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.uid, o.orderNo || o.uid.slice(0, 8)));
    return map;
  }, [orders]);

  // ---- summary tiles -------------------------------------------------------------
  // Everything here is derived from the loaded orders, so the captions say so — a number
  // whose basis is invisible invites the wrong conclusion.
  const summary = useMemo(() => {
    const billable = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED");
    const spend = billable.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const aov = billable.length ? spend / billable.length : 0;
    const open = orders.filter((o) => OPEN_ORDER_STATUSES.includes(String(o.status))).length;
    const latest = orders
      .map((o) => o.orderDate)
      .filter(Boolean)
      .sort()
      .slice(-1)[0];
    return {
      spend,
      aov,
      open,
      count: orders.length,
      billable: billable.length,
      lastOrderAt: latest ?? null,
    };
  }, [orders]);

  const phone = consumer?.phoneE164 || "";
  const waNumber = (consumer?.whatsAppE164 || consumer?.phoneE164 || "").replace(/[^\d]/g, "");

  const counts: Record<TabKey, number | null> = {
    orders: orders.length,
    returns: (returnsQ.data ?? []).length,
    activity: null,
    notes: null,
    family: null,
  };

  return (
    <div
      style={{
        ...(theme.vars as React.CSSProperties),
        background: "var(--kt-bg)",
        minHeight: "100%",
        fontFamily: "var(--kt-fsans)",
        color: "var(--kt-text)",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ---------- title bar ---------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 22px 4px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/customers")}
          aria-label="Back to customers"
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            border: "1px solid var(--kt-border2)",
            background: "var(--kt-surface)",
            color: "var(--kt-text2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kt-text)" }}>
          Customer Profile
        </span>
      </div>

      {/* ---------- header ---------- */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 22px 16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-.02em",
                color: "var(--kt-text)",
              }}
            >
              {consumerQ.isLoading ? "Loading…" : name}
            </h1>
            {consumer ? <StatusChip status={consumer.status} /> : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              fontSize: 13,
              color: "var(--kt-text2)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--kt-fmono)",
                fontSize: 12.5,
                color: "var(--kt-text3)",
                fontWeight: 500,
              }}
            >
              {consumer?.consumerNo ? `#${consumer.consumerNo}` : "—"}
            </span>
            <span
              style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--kt-border2)" }}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Phone size={14} color="var(--kt-text3)" />
              {phone || "No phone"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {labels.map((l) => (
              <LabelChip key={l} label={l} />
            ))}
            <button type="button" style={dashedBtn} onClick={() => navigate("/customers")}>
              <Plus size={12} />
              Label
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <button type="button" style={primaryBtn} onClick={() => navigate("/orders")}>
            <Plus size={15} />
            New Order
          </button>
          <button type="button" style={ghostBtn} onClick={() => navigate("/customers")}>
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 9,
              background: "var(--kt-surface)",
              color: "var(--kt-text2)",
              border: "1px solid var(--kt-border2)",
              cursor: "pointer",
            }}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen ? (
            <div
              style={{
                position: "absolute",
                top: 46,
                right: 0,
                zIndex: 30,
                width: 196,
                background: "var(--kt-surface)",
                border: "1px solid var(--kt-border2)",
                borderRadius: 11,
                boxShadow: "var(--kt-shadowLg)",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <MenuItem
                label="Add Note"
                onClick={() => {
                  setMenuOpen(false);
                  setTab("notes");
                }}
              />
              <MenuItem
                label="Order history"
                onClick={() => {
                  setMenuOpen(false);
                  setTab("orders");
                }}
              />
              <div style={{ height: 1, background: "var(--kt-border)", margin: "4px 6px" }} />
              <MenuItem
                label="Manage in CRM"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/customers");
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------- quick actions ---------- */}
      <div style={{ padding: "0 22px 16px" }}>
        <div style={{ ...card, borderRadius: 13, padding: "14px 16px", boxShadow: "none" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".06em",
              color: "var(--kt-text3)",
              marginBottom: 11,
            }}
          >
            QUICK ACTIONS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <QuickAction
              icon={<ShoppingBag size={15} />}
              label="New Order"
              tint="teal"
              onClick={() => navigate("/orders")}
            />
            <QuickAction
              icon={<MessageCircle size={15} />}
              label="Message WhatsApp"
              tint="green"
              disabled={!waNumber}
              onClick={() => window.open(`https://wa.me/${waNumber}`, "_blank", "noopener")}
            />
            <QuickAction
              icon={<Pencil size={15} />}
              label="Add Note"
              tint="blue"
              onClick={() => setTab("notes")}
            />
            <QuickAction
              icon={<RotateCcw size={15} />}
              label="Returns"
              tint="amber"
              onClick={() => setTab("returns")}
            />
            <QuickAction
              icon={<ShoppingCart size={15} />}
              label="Cart & Wishlist"
              tint="teal"
              onClick={() => setTab("activity")}
            />
            <QuickAction
              icon={<Power size={15} />}
              label="Manage in CRM"
              tint="gray"
              onClick={() => navigate("/customers")}
            />
          </div>
        </div>
      </div>

      {/* ---------- summary strip ---------- */}
      <div style={{ padding: "0 22px 4px" }}>
        <div
          style={{
            display: "grid",
            // 5 across on a desktop content box (~980px inside the shell's two rails),
            // folding to 3 then 2 as it narrows. The design's fixed 5-column grid assumed
            // a 1320px frame that the shell never gives this page.
            gridTemplateColumns: "repeat(auto-fit, minmax(178px, 1fr))",
            gap: 12,
          }}
        >
          {ordersQ.isLoading ? (
            [0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ ...card, borderRadius: 13, padding: "15px 16px" }}>
                <SkeletonBar w="58%" h={11} />
                <div style={{ marginTop: 16 }}>
                  <SkeletonBar w="70%" h={24} />
                </div>
                <div style={{ marginTop: 11 }}>
                  <SkeletonBar w="45%" h={9} />
                </div>
              </div>
            ))
          ) : ordersQ.isError ? (
            <>
              {["Total Spend", "Orders", "Avg Order Value", "Open Orders"].map((label) => (
                <div key={label} style={{ ...card, borderRadius: 13, padding: "15px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--kt-text3)" }}>
                    {label}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "var(--kt-text3)" }}>
                    Unavailable
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--kt-text3)" }}>
                    Depends on orders
                  </div>
                </div>
              ))}
              <div
                style={{
                  ...card,
                  borderRadius: 13,
                  border: "1px dashed var(--kt-border2)",
                  padding: "15px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--kt-text2)", lineHeight: 1.35 }}>
                  Totals compute from order rows — none loaded.
                </div>
                <button
                  type="button"
                  onClick={() => ordersQ.refetch()}
                  style={{ ...primaryBtn, padding: "6px 11px", fontSize: 12.5 }}
                >
                  Retry
                </button>
              </div>
            </>
          ) : (
            <>
              <Tile
                label="Total Spend"
                value={inr(summary.spend)}
                // Says which orders the number came from: spend excludes cancelled and
                // returned, so "across 4 orders" next to a one-order total would mislead.
                sub={
                  summary.billable === summary.count
                    ? `across ${summary.count} order${summary.count === 1 ? "" : "s"}`
                    : `across ${summary.billable} of ${summary.count} orders`
                }
                icon={<Wallet size={16} />}
                iconBg="var(--kt-accentWeak)"
                iconFg="var(--kt-accent)"
              />
              <Tile
                label="Orders"
                value={String(summary.count)}
                sub={
                  summary.lastOrderAt
                    ? `last order ${relativeTime(summary.lastOrderAt)}`
                    : "no orders yet"
                }
                icon={<ShoppingBag size={16} />}
                iconBg="#e5edfd"
                iconFg="#2563eb"
              />
              <Tile
                label="Avg Order Value"
                value={summary.count ? inr(summary.aov) : "—"}
                sub="cancelled & returned excluded"
                icon={<Wallet size={16} />}
                iconBg="var(--kt-surface3)"
                iconFg="var(--kt-text2)"
              />
              <Tile
                label="Open Orders"
                value={String(summary.open)}
                sub={summary.open ? "pending, confirmed or shipped" : "nothing outstanding"}
                icon={<ShoppingCart size={16} />}
                iconBg="#fdf2dc"
                iconFg="#a76a05"
                valueColor={summary.open ? "var(--kt-accent)" : undefined}
              />
              <div
                style={{
                  ...card,
                  borderRadius: 13,
                  background: "var(--kt-surface2)",
                  border: "1px dashed var(--kt-border2)",
                  boxShadow: "none",
                  padding: "15px 16px",
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--kt-text3)" }}>
                  Outstanding Balance
                </div>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--kt-text3)",
                  }}
                >
                  Not applicable
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: "var(--kt-text3)",
                  }}
                >
                  Credit terms apply to B2B trade partners only — never retail.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- body ---------- */}
      <div
        style={{
          display: "grid",
          // The design's fixed 320px identity column assumed a 1320px frame; inside the
          // shell (two nav rails) the content box is ~860px, which squeezed the order
          // table's Status column out of view. Clamped so it gives room back when narrow.
          gridTemplateColumns: "minmax(0, clamp(240px, 26%, 320px)) minmax(0, 1fr)",
          gap: 20,
          padding: "16px 22px 28px",
          alignItems: "start",
        }}
        className="kt-body"
      >
        {/* left: identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ ...card, overflow: "hidden" }}>
            <div
              style={{
                padding: "22px 18px 18px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 20,
                    background: "var(--kt-avatarBg)",
                    color: "var(--kt-avatarFg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    fontWeight: 800,
                  }}
                >
                  {initialsOf(name)}
                </div>
                <span
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "var(--kt-surface)",
                    border: "1px solid var(--kt-border2)",
                    color: "var(--kt-text3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "var(--kt-shadow)",
                  }}
                >
                  <Camera size={15} />
                </span>
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "-.01em",
                  color: "var(--kt-text)",
                }}
              >
                {name || "—"}
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".04em",
                  color: "var(--kt-text3)",
                }}
              >
                {[consumer?.consumerNo ? `CUST-${consumer.consumerNo}` : null, consumer?.gender]
                  .filter(Boolean)
                  .join(" · ")
                  .toUpperCase() || "—"}
              </div>
              <button
                type="button"
                disabled={!waNumber}
                onClick={() => window.open(`https://wa.me/${waNumber}`, "_blank", "noopener")}
                style={{
                  ...primaryBtn,
                  width: "100%",
                  marginTop: 16,
                  justifyContent: "center",
                  opacity: waNumber ? 1 : 0.5,
                  cursor: waNumber ? "pointer" : "not-allowed",
                }}
              >
                <MessageCircle size={15} />
                Message on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => navigate("/customers")}
                style={{ ...ghostBtn, width: "100%", marginTop: 8, justifyContent: "center" }}
              >
                <Pencil size={14} />
                Edit Profile
              </button>
            </div>
            <div style={{ height: 1, background: "var(--kt-border)", margin: "0 16px" }} />
            <div style={{ padding: "14px 6px 8px" }}>
              <IdentityField icon={<Phone size={16} />} label="Phone" value={consumer?.phoneE164} />
              <IdentityField
                icon={<MessageCircle size={16} />}
                label="WhatsApp"
                value={consumer?.whatsAppE164}
              />
              <IdentityField icon={<Mail size={16} />} label="Email" value={consumer?.email} />
              <IdentityField icon={<User size={16} />} label="Gender" value={consumer?.gender} />
              <IdentityField
                icon={<Calendar size={16} />}
                label="Date of Birth"
                value={consumer?.dob ? formatDate(consumer.dob) : null}
              />
              <IdentityField icon={<MapPin size={16} />} label="Address" value={consumer?.address} />
              <IdentityField icon={<Globe size={16} />} label="State" value={consumer?.state} />
              <IdentityField icon={<MapPin size={16} />} label="District" value={consumer?.district} />
            </div>
          </div>

          <div style={{ ...card, padding: "15px 16px" }}>
            <SectionCardHead>Labels</SectionCardHead>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {labels.length ? (
                labels.map((l) => <LabelChip key={l} label={l} />)
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>No labels applied</span>
              )}
            </div>
          </div>

          <div style={{ ...card, padding: "15px 16px" }}>
            <SectionCardHead>Groups</SectionCardHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(consumer?.profile?.groups ?? []).length ? (
                (consumer?.profile?.groups ?? []).map((g, i) => (
                  <div
                    key={g.uid ?? i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--kt-surface2)",
                      border: "1px solid var(--kt-border)",
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kt-text)" }}>
                      {g.name ?? g.groupName ?? "Group"}
                    </span>
                    {g.memberId ? (
                      <span
                        style={{
                          fontFamily: "var(--kt-fmono)",
                          fontSize: 11.5,
                          color: "var(--kt-text3)",
                        }}
                      >
                        {g.memberId}
                      </span>
                    ) : null}
                  </div>
                ))
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--kt-text3)" }}>
                  Not in any customer group
                </span>
              )}
            </div>
          </div>
        </div>

        {/* main: tabs */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            className="kt-scroll"
            style={{
              display: "flex",
              gap: 3,
              borderBottom: "1px solid var(--kt-border)",
              overflowX: "auto",
              marginBottom: 16,
            }}
          >
            {(
              [
                ["orders", "Orders"],
                ["returns", "Returns"],
                ["activity", "Activity"],
                ["notes", "Notes"],
                ["family", "Family"],
              ] as [TabKey, string][]
            ).map(([key, label]) => {
              const active = tab === key;
              const count = counts[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "11px 15px",
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 600,
                    whiteSpace: "nowrap",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: active ? "var(--kt-accent)" : "var(--kt-text3)",
                    borderBottom: `2px solid ${active ? "var(--kt-accent)" : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  {label}
                  {count != null ? (
                    <span
                      style={{
                        marginLeft: 7,
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: active ? "var(--kt-accentWeak)" : "var(--kt-surface3)",
                        color: active ? "var(--kt-accent)" : "var(--kt-text3)",
                      }}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {tab === "orders" ? (
            <OrdersTab
              query={ordersQ}
              storeName={storeName}
              itemName={itemName}
              onNewOrder={() => navigate("/orders")}
              onOpenOrder={(o: CustomerOrder) => navigate(`/orders/${o.uid}`)}
            />
          ) : null}
          {tab === "returns" ? (
            <ReturnsTab query={returnsQ} orders={orders} orderNoByUid={orderNoByUid} />
          ) : null}
          {tab === "activity" ? (
            <ActivityTab
              cartQuery={cartQ}
              wishlistQuery={wishlistQ}
              itemName={itemName}
              onConvert={() => navigate("/orders")}
            />
          ) : null}
          {tab === "notes" ? <NotesTab uid={uid} /> : null}
          {tab === "family" ? <FamilyTab uid={uid} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ small pieces --- */

function StatusChip({ status }: { status?: string }) {
  const active = (status ?? "").toLowerCase() !== "disabled";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px 3px 8px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: active ? "var(--kt-goodWeak)" : "var(--kt-badWeak)",
        color: active ? "var(--kt-good)" : "var(--kt-bad)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? "var(--kt-good)" : "var(--kt-bad)",
        }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function LabelChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 6,
        fontSize: 11.5,
        fontWeight: 600,
        background: "var(--kt-accentWeak)",
        color: "var(--kt-accentDeep)",
        border: "1px solid var(--kt-accentBorder)",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--kt-accent)" }} />
      {label}
    </span>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "9px 11px",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--kt-text)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const QUICK_TINTS: Record<string, { bg: string; fg: string; bd: string }> = {
  teal: { bg: "var(--kt-accentWeak)", fg: "var(--kt-accentDeep)", bd: "var(--kt-accentBorder)" },
  green: { bg: "#e7f6ec", fg: "#0b7c3c", bd: "#c5e8d1" },
  blue: { bg: "#e5edfd", fg: "#1d4ed8", bd: "#cbdcfb" },
  amber: { bg: "#fdf2dc", fg: "#a76a05", bd: "#f3ddb2" },
  gray: { bg: "var(--kt-surface2)", fg: "var(--kt-text2)", bd: "var(--kt-border2)" },
};

function QuickAction({
  icon,
  label,
  tint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  tint: keyof typeof QUICK_TINTS;
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = QUICK_TINTS[tint];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 13px",
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Tile({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconFg,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  valueColor?: string;
}) {
  return (
    <div style={{ ...card, borderRadius: 13, padding: "15px 16px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--kt-text3)" }}>{label}</div>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: iconBg,
            color: iconFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          fontFamily: "var(--kt-fmono)",
          fontVariantNumeric: "tabular-nums",
          color: valueColor ?? "var(--kt-text)",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--kt-text3)" }}>{sub}</div>
    </div>
  );
}

function IdentityField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  const filled = Boolean(value && String(value).trim());
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px" }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "var(--kt-surface3)",
          color: "var(--kt-text3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".05em",
            color: "var(--kt-text3)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: filled ? 600 : 500,
            fontStyle: filled ? "normal" : "italic",
            marginTop: 2,
            color: filled ? "var(--kt-text)" : "var(--kt-text3)",
            wordBreak: "break-word",
          }}
        >
          {filled ? value : "Not provided"}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- theming --- */

const KEYFRAMES = `
@keyframes ktpulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
.kt-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
.kt-scroll::-webkit-scrollbar-thumb { background: var(--kt-border2); border-radius: 8px; }
@media (max-width: 900px) { .kt-body { grid-template-columns: minmax(0,1fr) !important; } }
`;

/** Tokens as CSS custom properties, following the host app's theme (see `isDarkTheme`). */
function useThemeTokens() {
  const [dark, setDark] = useState(() => isDarkTheme());

  useEffect(() => {
    // Re-read when the host flips its theme attribute/class.
    const observer = new MutationObserver(() => setDark(isDarkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const t = dark ? KARTY_THEMES.dark : KARTY_THEMES.light;
    const vars: Record<string, string> = {
      "--kt-fsans": "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "--kt-fmono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    };
    Object.entries(t).forEach(([k, v]) => {
      vars[`--kt-${k}`] = v as string;
    });
    return { dark, tokens: t, vars };
  }, [dark]);
}
