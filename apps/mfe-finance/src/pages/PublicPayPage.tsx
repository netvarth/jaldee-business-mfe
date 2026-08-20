import { Alert, Badge, Button, SectionCard } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { financeApi } from "../lib/financeApi";

type PaymentLinkDetail = {
  uid?: string;
  tenantUid?: string;
  paymentLink?: string;
  entityName?: string;
  linkExpired?: boolean;
  locationUid?: string;
  timezone?: string;
  businessName?: string;
  sourceService?: string;
  feature?: string;
  subFeature?: string;
  featureModule?: string;
};

function formatDisplayName(input: string) {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim();
}

function parseFallbackToken(token: string) {
  const match = token.match(/^(\d+)?(.*)$/);
  return {
    accountId: match?.[1] || "",
    name: formatDisplayName(match?.[2] || token || "Payment"),
  };
}

export default function PublicPayPage() {
  const { paymentLink = "" } = useParams();
  const normalizedToken = String(paymentLink || "").trim();
  const [loading, setLoading] = useState(Boolean(normalizedToken) && normalizedToken !== "invalid-link");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<PaymentLinkDetail | null>(null);

  const fallback = useMemo(() => parseFallbackToken(normalizedToken), [normalizedToken]);

  useEffect(() => {
    let active = true;

    async function loadLinkDetail() {
      if (!normalizedToken || normalizedToken === "invalid-link") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await financeApi.consumerPayments.linkDetail<PaymentLinkDetail>(normalizedToken);
        if (!active) {
          return;
        }
        setDetail(response.data ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("Failed to load public payment link detail", loadError);
        setError(loadError instanceof Error ? loadError.message : "Could not load payment link details.");
        setDetail(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLinkDetail();

    return () => {
      active = false;
    };
  }, [normalizedToken]);

  const businessName = String(detail?.businessName || fallback.name || "Payment");
  const entityName = String(detail?.entityName || fallback.name || "Payment");
  const accountId = String(detail?.tenantUid || fallback.accountId || "-");
  const isInvalid = !normalizedToken || normalizedToken === "invalid-link";
  const isExpired = Boolean(detail?.linkExpired);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-2">
          <Badge variant="info">Jaldee Pay</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{businessName}</h1>
          <p className="text-sm text-slate-600">
            Public payment route for finance invoice links.
          </p>
        </div>

        {isInvalid ? (
          <Alert variant="danger" title="Invalid payment link">
            The payment link is missing or malformed.
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="danger" title="Could not load payment link">
            {error}
          </Alert>
        ) : null}

        {isExpired ? (
          <Alert variant="warning" title="Payment link expired">
            This link is marked as expired by the finance service.
          </Alert>
        ) : null}

        <SectionCard className="border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Link</div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-900">{normalizedToken || "-"}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entity Name</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{entityName}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant / Account</div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-900">{accountId}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950">Public Payment Flow</div>
                <div className="text-sm text-slate-500">
                  Local shell route is now aligned to the finance public payment flow.
                </div>
              </div>
              <Badge variant={loading ? "warning" : error ? "danger" : "success"}>
                {loading ? "Loading" : error ? "Service Error" : "Active"}
              </Badge>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              {loading
                ? "Loading payment link details..."
                : error
                  ? "The finance service link-detail endpoint is reachable from swagger, but the local gateway is currently returning an error for this public token."
                  : "Payment link details loaded from the finance service consumer endpoint."}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => window.location.reload()}>
                Reload
              </Button>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
