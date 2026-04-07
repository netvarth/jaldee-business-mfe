import { useMemo, useState } from "react";
import { ErrorState } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { CustomersList } from "./components/CustomersList";
import { CustomerDetail } from "./components/CustomerDetail";

export function CustomersModule() {
  const access = useModuleAccess("customers");
  const { routeParams } = useSharedModulesContext();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(routeParams?.recordId ?? null);

  const customerId = useMemo(
    () => routeParams?.recordId ?? selectedCustomerId,
    [routeParams?.recordId, selectedCustomerId]
  );

  if (!access.allowed) {
    return (
      <ErrorState
        title="Customers unavailable"
        description={access.reason === "module-disabled"
          ? "This account does not currently have access to the Customers module."
          : access.reason === "location-required"
            ? "Select a location to work with location-scoped customer data."
            : "This module cannot be opened in the current scope."}
      />
    );
  }

  if (customerId) {
    return <CustomerDetail customerId={customerId} onBack={() => setSelectedCustomerId(null)} />;
  }

  return <CustomersList onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)} />;
}
