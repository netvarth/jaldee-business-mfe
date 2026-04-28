import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { OrdersActiveCart } from "./components/OrdersActiveCart";
import { OrdersCatalogList } from "./components/OrdersCatalogList";
import { CreateOrder } from "./components/CreateOrder";
import { OrdersDashboard } from "./components/OrdersDashboard";
import { OrdersInvoice } from "./components/OrdersInvoice";
import { OrdersInvoicesList } from "./components/OrdersInvoicesList";
import { OrdersInventoryList } from "./components/OrdersInventoryList";
import { OrdersItemCreate } from "./components/OrdersItemCreate";
import { OrdersItemDetails } from "./components/OrdersItemDetails";
import { OrdersItemsList } from "./components/OrdersItemsList";
import { OrderDetails } from "./components/OrderDetails";
import { OrdersList } from "./components/OrdersList";
import { OrdersRequestsList } from "./components/OrdersRequestsList";
import { OrdersSettings } from "./components/OrdersSettings";

export function OrdersModule() {
  const access = useModuleAccess("orders");
  const { routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "dashboard";
  const subview = routeParams?.subview;
  const recordId = routeParams?.recordId;

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Orders unavailable"
          description={
            access.reason === "location-required"
              ? "Select a location to work with location-scoped orders and pharmacy data."
              : "The shared orders module is not available in the current shell context."
          }
        />
      </SectionCard>
    );
  }

  if (view === "orders-grid") {
    if (subview === "details" && recordId) {
      return <OrderDetails />;
    }
    return <OrdersList />;
  }

  if (view === "details" && recordId) {
    return <OrderDetails />;
  }

  if (view === "create") {
    return <CreateOrder />;
  }

  if (view === "invoice") {
    return <OrdersInvoice />;
  }

  if (view === "invoices") {
    return <OrdersInvoicesList />;
  }

  if (view === "rx-requests-grid") {
    return <OrdersRequestsList />;
  }

  if (view === "catalogs") {
    return <OrdersCatalogList />;
  }

  if (view === "inventory") {
    return <OrdersInventoryList />;
  }

  if (view === "items") {
    if (subview === "create") {
      return <OrdersItemCreate />;
    }
    if (subview === "update" && recordId) {
      return <OrdersItemCreate />;
    }
    if (subview === "details" && recordId) {
      return <OrdersItemDetails />;
    }
    return <OrdersItemsList />;
  }

  if (view === "invoice-types") {
    return <OrdersSettings />;
  }

  if (view === "settings") {
    return <OrdersSettings />;
  }

  if (view === "active-cart") {
    return <OrdersActiveCart />;
  }

  if (view === "dashboard" || view === "overview") {
    return <OrdersDashboard />;
  }

  return <OrdersDashboard />;
}
