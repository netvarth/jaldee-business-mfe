import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { OrdersReviewsList } from "./components/OrdersReviewsList";
import { OrdersInvoiceTypeCreate } from "./components/OrdersInvoiceTypeCreate";
import { OrdersActiveCart } from "./components/OrdersActiveCart";
import { OrdersCatalogList } from "./components/OrdersCatalogList";
import { CreateOrder } from "./components/CreateOrder";
import { OrdersDashboard } from "./components/OrdersDashboard";
import { OrdersInvoice } from "./components/OrdersInvoice";
import { OrdersInvoicesList } from "./components/OrdersInvoicesList";
import { InventoryDashboard } from "./components/InventoryDashboard";
import { OrdersItemCreate } from "./components/OrdersItemCreate";
import { OrdersItemDetails } from "./components/OrdersItemDetails";
import { OrdersItemVariantsPage } from "./components/OrdersItemVariantsPage";
import { OrdersItemsList } from "./components/OrdersItemsList";
import { OrderDetails } from "./components/OrderDetails";
import { OrdersList } from "./components/OrdersList";
import { OrdersRequestsList } from "./components/OrdersRequestsList";
import { OrdersSettings } from "./components/OrdersSettings";
import { OrdersDeliveryProfiles } from "./components/OrdersDeliveryProfiles";
import { OrdersDeliveryProfileCreate } from "./components/OrdersDeliveryProfileCreate";
import { OrdersDeliveryProfileDetails } from "./components/OrdersDeliveryProfileDetails";
import { OrdersLogisticsList } from "./components/OrdersLogisticsList";
import { OrdersCourierList } from "./components/OrdersCourierList";
import { OrdersDealersList } from "./components/OrdersDealersList";
import { OrdersSectionPlaceholder } from "./components/shared";
import { InventoryAdjustmentsPage } from "./components/InventoryAdjustmentsPage";
import { InventoryCatalogsPage } from "./components/InventoryCatalogsPage";
import { InventoryStocksPage } from "./components/InventoryStocksPage";
import { InventoryAuditLogsPage } from "./components/InventoryAuditLogsPage";

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
    if (subview) {
      if (subview === "adjust") {
        return <InventoryAdjustmentsPage />;
      }
      if (subview === "catalogs") {
        return <InventoryCatalogsPage />;
      }
      if (subview === "stocks") {
        return <InventoryStocksPage />;
      }
      if (subview === "auditlogs") {
        return <InventoryAuditLogsPage />;
      }
      if (!isInventoryVariantSubview(subview)) {
        return (
          <OrdersSectionPlaceholder
            title={formatInventorySubviewTitle(subview)}
            description="This inventory workflow is routed from the React dashboard and is ready for the next conversion slice."
          />
        );
      }
      return <OrdersItemVariantsPage />;
    }
    return <InventoryDashboard />;
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

  if (view === "invoice-types" || view === "invoice-type") {
    if (subview === "create" || subview === "edit" || subview === "view") {
      return <OrdersInvoiceTypeCreate />;
    }
    return <OrdersSettings />;
  }

  if (view === "settings") {
    return <OrdersSettings />;
  }

  if (view === "active-cart") {
    return <OrdersActiveCart />;
  }

  if (view === "delivery-profile") {
    if (subview === "create") {
      return <OrdersDeliveryProfileCreate />;
    }
    if (subview === "edit" && recordId) {
      return <OrdersDeliveryProfileCreate />;
    }
    if (subview === "details" && recordId) {
      return <OrdersDeliveryProfileDetails />;
    }
    return <OrdersDeliveryProfiles />;
  }

  if (view === "dealers") {
    return <OrdersDealersList />;
  }

  if (view === "logistics") {
    if (subview === "courier") {
      return <OrdersCourierList />;
    }
    return <OrdersLogisticsList />;
  }

  if (view === "reviews") {
    return <OrdersReviewsList />;
  }

  if (view === "dashboard" || view === "overview") {
    return <OrdersDashboard />;
  }

  return <OrdersDashboard />;
}

function isInventoryVariantSubview(value: string) {
  return new Set([
    "categories",
    "groups",
    "tags",
    "types",
    "manufacturers",
    "units",
    "compositions",
    "hsn",
    "hsn-codes",
    "remarks",
  ]).has(value);
}

function formatInventorySubviewTitle(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
