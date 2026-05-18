import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "@jaldee/shared-modules";
import { IpAdmissionsList } from "./components/IpAdmissionsList";
import { IpAdmissionWorkbench } from "./components/IpAdmissionWorkbench";
import { IpBedsList } from "./components/IpBedsList";
import { IpBillingList } from "./components/IpBillingList";
import { IpDetails } from "./components/IpDetails";
import { IpFeaturePlaceholder } from "./components/IpFeaturePlaceholder";
import { IpFeatureWorkspace } from "./components/IpFeatureWorkspace";
import { IpOverview } from "./components/IpOverview";
import { IpPatientsList } from "./components/IpPatientsList";
import { IpSettings } from "./components/IpSettings";
import type { IpViewKey } from "./types";

function resolveIpView(view?: string | null): IpViewKey {
  const normalized = String(view ?? "").trim();
  if (!normalized) {
    return "dashboard";
  }

  return normalized as IpViewKey;
}

function getWorkspaceMeta(view: IpViewKey, basePath: string, recordId: string, subview: string) {
  switch (view) {
    case "activity-log":
      return {
        title: "IP Activity Log",
        subtitle: "Angular activity tracking is now grouped into a dedicated React workspace.",
        primaryAction: "Open Admissions",
        primaryHref: `${basePath}/admissions`,
        searchPlaceholder: "Search log route, note, history",
        filterLabel: "Logs",
        featureLabel: "Feature",
        emptyTitle: "No activity routes found",
        emptyDescription: "IP activity-log child flows will appear here as the module is expanded.",
        rows: [
          { id: "activity-log", name: "Activity Timeline", summary: "Admission and patient history events.", status: "Ready" as const, href: `${basePath}/activity-log` },
          { id: "log/:uid", name: "IP Log", summary: "Detailed record-level IP log from the Angular route tree.", status: recordId ? "Ready" as const : "Mapped" as const, href: `${basePath}/log/${recordId || "sample"}` },
          { id: "details/:ipUid/log", name: "Detail Log Panel", summary: "Patient-specific log panel under inpatient details.", status: "Live" as const, href: `${basePath}/details/${recordId || "sample"}/log` },
        ],
      };
    case "care-scheduler":
      return {
        title: "Care Scheduler",
        subtitle: "The Angular care scheduler family is mapped into a shared planning workspace.",
        primaryAction: "Open Inpatients",
        primaryHref: `${basePath}/inpatient`,
        searchPlaceholder: "Search scheduler routes",
        filterLabel: "Schedulers",
        featureLabel: "Planner",
        emptyTitle: "No scheduler routes found",
        emptyDescription: "Care scheduler subflows will appear here as they are converted.",
        rows: [
          { id: "care-scheduler", name: "Scheduler Board", summary: "Nursing and provider task planning board.", status: "Mapped" as const, href: `${basePath}/care-scheduler` },
          { id: "care-scheduler-print", name: "Print View", summary: "Angular printable schedule output.", status: "Mapped" as const, href: `${basePath}/care-scheduler` },
        ],
      };
    case "categories":
      return {
        title: "IP Categories",
        subtitle: "Administrative category setup based on the Angular category module.",
        primaryAction: "Open Types",
        primaryHref: `${basePath}/types`,
        searchPlaceholder: "Search category routes",
        filterLabel: "Categories",
        featureLabel: "Config",
        emptyTitle: "No category routes found",
        emptyDescription: "Category administration routes will appear here as they are converted.",
        rows: [{ id: "categories", name: "Category Grid", summary: "Manage inpatient categories and related definitions.", status: "Mapped" as const, href: `${basePath}/categories` }],
      };
    case "types":
      return {
        title: "IP Types",
        subtitle: "IP type configuration grouped like the Angular types module.",
        primaryAction: "Open Categories",
        primaryHref: `${basePath}/categories`,
        searchPlaceholder: "Search type routes",
        filterLabel: "Types",
        featureLabel: "Config",
        emptyTitle: "No type routes found",
        emptyDescription: "Type configuration routes will appear here as they are converted.",
        rows: [{ id: "types", name: "Type Grid", summary: "Manage room, service, and inpatient type definitions.", status: "Mapped" as const, href: `${basePath}/types` }],
      };
    case "pricing":
      return {
        title: "IP Pricing",
        subtitle: "Pricing administration grouped from the Angular bed and room pricing module.",
        primaryAction: "Open Services",
        primaryHref: `${basePath}/services`,
        searchPlaceholder: "Search pricing routes",
        filterLabel: "Pricing",
        featureLabel: "Pricing View",
        emptyTitle: "No pricing routes found",
        emptyDescription: "Pricing views will appear here as they are converted.",
        rows: [{ id: "pricing", name: "Pricing Console", summary: "Configure room, bed, and service pricing.", status: "Mapped" as const, href: `${basePath}/pricing` }],
      };
    case "registration":
      return {
        title: "IP Registration",
        subtitle: "Registration flows aligned to the Angular registration and registration-grid modules.",
        primaryAction: "Open Registration Grid",
        primaryHref: `${basePath}/registarionGrid`,
        searchPlaceholder: "Search registration routes",
        filterLabel: "Registrations",
        featureLabel: "Flow",
        emptyTitle: "No registration routes found",
        emptyDescription: "Registration routes will appear here as they are converted.",
        rows: [
          { id: "registration", name: "Registration Workspace", summary: "Create and manage inpatient registration records.", status: "Mapped" as const, href: `${basePath}/registration` },
          { id: "registarionGrid", name: "Registration Grid", summary: "Angular registration grid listing and drill-in.", status: "Mapped" as const, href: `${basePath}/registarionGrid` },
        ],
      };
    case "buildings":
      return {
        title: "Buildings",
        subtitle: "Building administration grouped from the Angular buildings module and its child flows.",
        primaryAction: "Create Building",
        primaryHref: `${basePath}/buildings/create`,
        searchPlaceholder: "Search building routes",
        filterLabel: "Buildings",
        featureLabel: "Building Flow",
        emptyTitle: "No building routes found",
        emptyDescription: "Building routes will appear here as they are converted.",
        rows: [
          { id: "buildings", name: "Building Grid", summary: "List and manage all hospital buildings.", status: "Ready" as const, href: `${basePath}/buildings` },
          { id: "buildings/create", name: "Create Building", summary: "Angular building creation flow.", status: "Mapped" as const, href: `${basePath}/buildings/create` },
          { id: "buildings/details/:id", name: "Building Details", summary: "View details and floor relationships for one building.", status: "Mapped" as const, href: `${basePath}/buildings/details/${recordId || "sample"}` },
        ],
      };
    case "floors":
      return {
        title: "Floors",
        subtitle: "Floor management grouped from the Angular floors feature.",
        primaryAction: "Open Buildings",
        primaryHref: `${basePath}/buildings`,
        searchPlaceholder: "Search floor routes",
        filterLabel: "Floors",
        featureLabel: "Floor Flow",
        emptyTitle: "No floor routes found",
        emptyDescription: "Floor routes will appear here as they are converted.",
        rows: [{ id: "floors", name: "Floor Workspace", summary: "Manage floors within building structures.", status: "Mapped" as const, href: `${basePath}/floors` }],
      };
    case "calender":
      return {
        title: "IP Calendar",
        subtitle: "Calendar scheduling grouped from the Angular ip-calender module.",
        primaryAction: "Open Care Scheduler",
        primaryHref: `${basePath}/care-scheduler`,
        searchPlaceholder: "Search calendar routes",
        filterLabel: "Calendars",
        featureLabel: "Calendar View",
        emptyTitle: "No calendar routes found",
        emptyDescription: "Calendar routes will appear here as they are converted.",
        rows: [{ id: "calender", name: "Calendar Board", summary: "Calendar view for inpatient occupancy and schedules.", status: "Mapped" as const, href: `${basePath}/calender` }],
      };
    case "occupancy":
      return {
        title: "Occupancy",
        subtitle: "Occupancy management grouped from the Angular occupancy feature.",
        primaryAction: "Open Beds",
        primaryHref: `${basePath}/beds`,
        searchPlaceholder: "Search occupancy routes",
        filterLabel: "Occupancy",
        featureLabel: "Occupancy View",
        emptyTitle: "No occupancy routes found",
        emptyDescription: "Occupancy routes will appear here as they are converted.",
        rows: [{ id: "occupancy", name: "Occupancy Board", summary: "Track room and bed occupancy across the facility.", status: "Ready" as const, href: `${basePath}/occupancy` }],
      };
    case "rooms":
      return {
        title: "Rooms",
        subtitle: "Room administration grouped from the Angular rooms module, room grid, and room details flows.",
        primaryAction: "Create Room",
        primaryHref: `${basePath}/rooms/create`,
        searchPlaceholder: "Search room routes",
        filterLabel: "Rooms",
        featureLabel: "Room Flow",
        emptyTitle: "No room routes found",
        emptyDescription: "Room routes will appear here as they are converted.",
        rows: [
          { id: "rooms", name: "Room Grid", summary: "List and manage inpatient rooms.", status: "Ready" as const, href: `${basePath}/rooms` },
          { id: "rooms/create", name: "Create Room", summary: "Angular room creation flow.", status: "Mapped" as const, href: `${basePath}/rooms/create` },
          { id: "rooms/details/:id", name: "Room Details", summary: "Detailed room view with bed assignments.", status: "Mapped" as const, href: `${basePath}/rooms/details/${recordId || "sample"}` },
        ],
      };
    case "services":
      return {
        title: "IP Services",
        subtitle: "Service definitions and grids grouped from the Angular services module.",
        primaryAction: "Open Pricing",
        primaryHref: `${basePath}/pricing`,
        searchPlaceholder: "Search service routes",
        filterLabel: "Services",
        featureLabel: "Service Flow",
        emptyTitle: "No service routes found",
        emptyDescription: "Service routes will appear here as they are converted.",
        rows: [
          { id: "services", name: "Service Grid", summary: "Manage inpatient service definitions.", status: "Ready" as const, href: `${basePath}/services` },
          { id: "services/service-grid", name: "Detailed Service Grid", summary: "Angular service grid and configuration tables.", status: "Mapped" as const, href: `${basePath}/services` },
        ],
      };
    case "registarionGrid":
      return {
        title: "Registration Grid",
        subtitle: "The Angular registration grid route is available as a separate workspace.",
        primaryAction: "Open Registration",
        primaryHref: `${basePath}/registration`,
        searchPlaceholder: "Search grid routes",
        filterLabel: "Grid Views",
        featureLabel: "Grid",
        emptyTitle: "No registration grid routes found",
        emptyDescription: "Registration grid routes will appear here as they are converted.",
        rows: [{ id: "registarionGrid", name: "Registration Grid", summary: "Grid-oriented registration list and filters.", status: "Mapped" as const, href: `${basePath}/registarionGrid` }],
      };
    case "invoice":
      return {
        title: "IP Invoice",
        subtitle: "Invoice creation and view flows grouped from the Angular ip-invoice module.",
        primaryAction: "Open Billing",
        primaryHref: `${basePath}/billing`,
        searchPlaceholder: "Search invoice routes",
        filterLabel: "Invoices",
        featureLabel: "Invoice Flow",
        emptyTitle: "No invoice routes found",
        emptyDescription: "Invoice routes will appear here as they are converted.",
        rows: [
          { id: "invoice/:uid", name: "Invoice View", summary: "Record-level inpatient invoice screen.", status: recordId ? "Ready" as const : "Mapped" as const, href: `${basePath}/invoice/${recordId || "sample"}` },
          { id: "invoice/template-selection", name: "Template Selection", summary: "Angular invoice template selection flow.", status: "Mapped" as const, href: `${basePath}/invoice/${recordId || "sample"}` },
        ],
      };
    case "master-invoice":
      return {
        title: "Master Invoice",
        subtitle: "Master invoice workflow grouped from the Angular master-invoice module.",
        primaryAction: "Open Billing",
        primaryHref: `${basePath}/billing`,
        searchPlaceholder: "Search master invoice routes",
        filterLabel: "Invoices",
        featureLabel: "Invoice Flow",
        emptyTitle: "No master invoice routes found",
        emptyDescription: "Master invoice routes will appear here as they are converted.",
        rows: [{ id: "master-invoice/:uid", name: "Master Invoice", summary: "Aggregate invoice view for a patient or stay.", status: recordId ? "Ready" as const : "Mapped" as const, href: `${basePath}/master-invoice/${recordId || "sample"}` }],
      };
    case "diet":
      return {
        title: "Diet",
        subtitle: "Kitchen, diet preference, and diet plan flows grouped from the Angular kitchen module.",
        primaryAction: "Open Inpatient Details",
        primaryHref: `${basePath}/admissions`,
        searchPlaceholder: "Search diet routes",
        filterLabel: "Diet Views",
        featureLabel: "Diet Flow",
        emptyTitle: "No diet routes found",
        emptyDescription: "Diet routes will appear here as they are converted.",
        rows: [
          { id: "diet", name: "Kitchen Dashboard", summary: "Primary diet and kitchen workspace.", status: "Mapped" as const, href: `${basePath}/diet` },
          { id: "diet/diet-preference", name: "Diet Preference", summary: "Manage patient diet preference grids and templates.", status: "Mapped" as const, href: `${basePath}/diet` },
          { id: "diet/diet-plan", name: "Diet Plan", summary: "Create day-wise meal plans and templates.", status: "Mapped" as const, href: `${basePath}/diet` },
        ],
      };
    case "transfer":
      return {
        title: "Bed Transfer",
        subtitle: "Bed transfer workflow grouped from the Angular bed-transfer module.",
        primaryAction: "Open Details",
        primaryHref: `${basePath}/details/${recordId || subview || "sample"}`,
        searchPlaceholder: "Search transfer routes",
        filterLabel: "Transfers",
        featureLabel: "Transfer Flow",
        emptyTitle: "No transfer routes found",
        emptyDescription: "Transfer routes will appear here as they are converted.",
        rows: [
          { id: "transfer/:uid", name: "Transfer Workspace", summary: "Move a patient between beds or rooms.", status: recordId ? "Ready" as const : "Mapped" as const, href: `${basePath}/transfer/${recordId || "sample"}` },
          { id: "details/:ipUid/bed-transactions", name: "Bed Transactions", summary: "Detailed transfer and occupancy history under patient details.", status: "Live" as const, href: `${basePath}/details/${recordId || "sample"}/bedTransactions` },
        ],
      };
    case "log":
      return {
        title: "IP Log",
        subtitle: "Patient log flow grouped from the Angular ip-log module.",
        primaryAction: "Open Details",
        primaryHref: `${basePath}/details/${recordId || subview || "sample"}`,
        searchPlaceholder: "Search log routes",
        filterLabel: "Logs",
        featureLabel: "Log Flow",
        emptyTitle: "No log routes found",
        emptyDescription: "Log routes will appear here as they are converted.",
        rows: [{ id: "log/:uid", name: "IP Log View", summary: "Admission-specific activity and audit history.", status: recordId ? "Ready" as const : "Mapped" as const, href: `${basePath}/log/${recordId || "sample"}` }],
      };
    case "dischargeTemplate":
      return {
        title: "Discharge Template",
        subtitle: "Discharge summary template setup grouped from the Angular discharge template module.",
        primaryAction: "Open Admissions",
        primaryHref: `${basePath}/admissions`,
        searchPlaceholder: "Search discharge routes",
        filterLabel: "Templates",
        featureLabel: "Template Flow",
        emptyTitle: "No discharge template routes found",
        emptyDescription: "Discharge template routes will appear here as they are converted.",
        rows: [{ id: "dischargeTemplate", name: "Template Library", summary: "Manage discharge summary templates and print formats.", status: "Mapped" as const, href: `${basePath}/dischargeTemplate` }],
      };
    default:
      return null;
  }
}

export function IpModule() {
  const { routeParams, basePath, account, location } = useSharedModulesContext();
  const view = resolveIpView(routeParams?.view);
  const subview = String(routeParams?.subview ?? "").trim();
  const recordId = String(routeParams?.recordId ?? "").trim();

  if (!account.licensedProducts.includes("health")) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Inpatient unavailable"
          description="This account does not currently have access to the Health product."
        />
      </SectionCard>
    );
  }

  if (!location?.id) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Location required"
          description="Select a location to work with location-scoped inpatient data."
        />
      </SectionCard>
    );
  }

  if (view === "patients") {
    return <IpPatientsList />;
  }

  if (view === "inpatient") {
    return <IpPatientsList />;
  }

  if (view === "admissions") {
    if (subview === "new") {
      return <IpAdmissionWorkbench />;
    }

    if (subview === "details" || subview === "in-patient-details") {
      return <IpDetails />;
    }

    if (subview === "summary-view" || subview === "customer-create" || subview === "visits" || subview === "discharge-summary") {
      const title = subview.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
      return (
        <IpFeatureWorkspace
          title={`Admissions ${title}`}
          subtitle={`Angular admissions/${subview} is mapped into the shared IP module with the same route structure.`}
          primaryAction={subview === "visits" ? "Open Details" : "Open Admissions"}
          primaryHref={subview === "visits" && recordId ? `${basePath}/admissions/in-patient-details/${recordId}` : `${basePath}/admissions`}
          searchPlaceholder={`Search ${title.toLowerCase()} routes`}
          filterLabel={title}
          featureLabel="Feature"
          emptyTitle={`No ${title.toLowerCase()} routes found`}
          emptyDescription={`Admissions ${title.toLowerCase()} child flows will appear here as they are converted.`}
          rows={[
            {
              id: `admissions/${subview}`,
              name: `${title} Workspace`,
              summary: `Primary Angular route for admissions/${subview}.`,
              status: "Ready" as const,
              href: `${basePath}/admissions/${subview}${recordId ? `/${recordId}` : ""}`,
            },
            {
              id: "admissions/in-patient-details/:ipUid",
              name: "In-Patient Details",
              summary: "Admission detail shell with tabs and patient work areas.",
              status: recordId ? ("Live" as const) : ("Ready" as const),
              href: `${basePath}/admissions/in-patient-details/${recordId || "sample"}`,
            },
          ]}
        />
      );
    }

    return <IpAdmissionsList />;
  }

  if (view === "beds") {
    return <IpBedsList />;
  }

  if (view === "billing") {
    return <IpBillingList />;
  }

  if (view === "settings") {
    return <IpSettings />;
  }

  if (view === "details") {
    return <IpDetails />;
  }

  if (view === "dashboard" || view === "overview") {
    return <IpOverview />;
  }

  const workspace = getWorkspaceMeta(view, basePath, recordId, subview);
  if (workspace) {
    return <IpFeatureWorkspace {...workspace} />;
  }

  return <IpFeaturePlaceholder title="IP Feature" description="This Angular IP route is mapped. Convert the exact feature into this shared React screen next." />;
}

