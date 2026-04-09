import { Button, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import type { Customer } from "../types";

interface CustomerCommunicationCardProps {
  customer: Customer;
  customerLabel: string;
}

export function CustomerCommunicationCard({ customer, customerLabel }: CustomerCommunicationCardProps) {
  const { basePath, product } = useSharedModulesContext();
  const phone = customer.phoneNo ? `${customer.countryCode ?? ""}${customer.phoneNo}`.replace(/\s+/g, "") : "";
  const whatsapp = customer.whatsappNumber ? `${customer.countryCode ?? ""}${customer.whatsappNumber}`.replace(/\s+/g, "") : phone;
  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customerLabel;

  function getModuleRoot() {
    if (basePath.endsWith("/customers")) {
      return basePath.slice(0, -"/customers".length);
    }

    if (basePath.endsWith("/patients")) {
      return basePath.slice(0, -"/patients".length);
    }

    return `/${product}`;
  }

  function navigateTo(path: string, params: Record<string, string>) {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.origin + path);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    window.location.assign(url.pathname + url.search);
  }

  function openHref(href: string) {
    if (typeof window === "undefined") {
      return;
    }
    window.location.assign(href);
  }

  return (
    <SectionCard title="Communication">
      <div className="space-y-3" data-testid="customer-communication-card">
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Start contact or hand off this {customerLabel.toLowerCase()} to related communication flows.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            data-testid="customer-communication-call"
            variant="outline"
            size="sm"
            disabled={!phone}
            onClick={() => openHref(`tel:${phone}`)}
          >
            Call
          </Button>
          <Button
            data-testid="customer-communication-email"
            variant="outline"
            size="sm"
            disabled={!customer.email}
            onClick={() => openHref(`mailto:${customer.email}?subject=${encodeURIComponent(displayName)}`)}
          >
            Email
          </Button>
          <Button
            data-testid="customer-communication-whatsapp"
            variant="outline"
            size="sm"
            disabled={!whatsapp}
            onClick={() => openHref(`https://wa.me/${whatsapp.replace(/^\+/, "")}`)}
          >
            WhatsApp
          </Button>
          <Button
            data-testid="customer-communication-reminder"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo(`${getModuleRoot()}/settings`, {
                view: "comm-reminder",
                customerId: customer.id,
                source: "customers",
              })
            }
          >
            Reminder
          </Button>
          <Button
            data-testid="customer-communication-secure-video"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo(`${getModuleRoot()}/secure-video`, {
                customerId: customer.id,
                type: "secure_video",
                source: "customers",
              })
            }
          >
            Secure Video
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
