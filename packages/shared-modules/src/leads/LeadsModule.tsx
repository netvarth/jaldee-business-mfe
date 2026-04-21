import { ErrorState } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { AuditLogList } from "./components/AuditLogList";
import { ChannelDetails } from "./components/ChannelDetails";
import { ChannelForm } from "./components/ChannelForm";
import { ChannelsList } from "./components/ChannelsList";
import { LeadCustomerForm } from "./components/LeadCustomerForm";
import { LeadCustomersList } from "./components/LeadCustomersList";
import { LeadDetails } from "./components/LeadDetails";
import { LeadForm } from "./components/LeadForm";
import { LeadsDashboard } from "./components/LeadsDashboard";
import { LeadsList } from "./components/LeadsList";
import { ProductTypeDetails } from "./components/ProductTypeDetails";
import { ProductTypeForm } from "./components/ProductTypeForm";
import { ProductTypeList } from "./components/ProductTypeList";

export function LeadsModule() {
  const access = useModuleAccess("leads");
  const { routeParams } = useSharedModulesContext();
  const [selectedRecordId] = useState<string | null>(routeParams?.recordId ?? null);

  const recordId = useMemo(() => routeParams?.recordId ?? selectedRecordId, [routeParams?.recordId, selectedRecordId]);
  const view = routeParams?.view;
  const subview = routeParams?.subview;

  if (!access.allowed) {
    return (
      <ErrorState
        title="Lead manager unavailable"
        description={access.reason === "module-disabled"
          ? "This account does not currently have access to the Leads module."
          : access.reason === "location-required"
            ? "Select a location to work with location-scoped lead data."
            : "This module cannot be opened in the current scope."}
      />
    );
  }

  if (!view || view === "dashboard") {
    return <LeadsDashboard />;
  }

  if (view === "leads") {
    if (subview === "create") return <LeadForm mode="create" />;
    if (subview === "update") return <LeadForm mode="update" recordId={recordId ?? undefined} />;
    if (subview === "details" && recordId) return <LeadDetails leadUid={recordId} />;
    return <LeadsList />;
  }

  if (view === "product-type") {
    if (subview === "create") return <ProductTypeForm mode="create" />;
    if (subview === "update" && recordId) return <ProductTypeForm mode="update" recordId={recordId} />;
    if (subview === "details" && recordId) return <ProductTypeDetails productTypeUid={recordId} />;
    return <ProductTypeList />;
  }

  if (view === "channels") {
    if (subview === "create") return <ChannelForm mode="create" />;
    if (subview === "update" && recordId) return <ChannelForm mode="update" recordId={recordId} />;
    if (subview === "details" && recordId) return <ChannelDetails channelUid={recordId} />;
    return <ChannelsList />;
  }

  if (view === "customers") {
    if (subview === "create") return <LeadCustomerForm mode="create" />;
    if (subview === "update" && recordId) return <LeadCustomerForm mode="update" recordId={recordId} />;
    return <LeadCustomersList />;
  }

  if (view === "auditlog") {
    return <AuditLogList />;
  }

  return <LeadsDashboard />;
}
