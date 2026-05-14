import { useMemo, useState } from "react";
import { Badge, Button, Checkbox, Input, PageHeader, SectionCard, Select, Switch } from "@jaldee/design-system";
import { useLocation, useNavigate } from "react-router-dom";
import "./SettingsPage.css";

type SettingsNavItem = {
  key: string;
  label: string;
  icon: string;
  group: "GENERAL" | "BUSINESS" | "ADVANCED";
};

const NAV_ITEMS: SettingsNavItem[] = [
  { key: "company", label: "Company", icon: "building", group: "GENERAL" },
  { key: "branding", label: "Branding", icon: "palette", group: "GENERAL" },
  { key: "branches-locations", label: "Branches & Locations", icon: "mapPin", group: "GENERAL" },
  { key: "subscription-products", label: "Subscription & Products", icon: "box", group: "GENERAL" },
  { key: "billing-tax", label: "Billing & Tax", icon: "creditCard", group: "BUSINESS" },
  { key: "communications", label: "Communications", icon: "messageSquare", group: "BUSINESS" },
  { key: "team-access", label: "Team & Access", icon: "users", group: "BUSINESS" },
  { key: "integrations", label: "Integrations", icon: "share2", group: "BUSINESS" },
  { key: "data-privacy", label: "Data & Privacy", icon: "shield", group: "ADVANCED" },
  { key: "developer", label: "Developer", icon: "code2", group: "ADVANCED" },
];

type ProductCardItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  enabled: boolean;
  statusLabel: string;
  statusMeta: string;
  actionLabel?: string;
  locked?: boolean;
};

type UsageItem = {
  id: string;
  label: string;
  value: string;
  total: string;
  progress: number;
};

const CORE_PRODUCTS: ProductCardItem[] = [
  {
    id: "booking",
    name: "Jaldee Booking",
    description: "Online slot booking and slot management system",
    icon: "calendar",
    accent: "blue",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "health",
    name: "Jaldee Health",
    description: "EMR, Pharmacy, Lab, and Patient Management",
    icon: "stethoscope",
    accent: "green",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Enabled since undefined",
    actionLabel: "Configure",
  },
  {
    id: "karty",
    name: "Karty",
    description: "Retail POS, Inventory, and Omnichannel Commerce",
    icon: "bag",
    accent: "orange",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "lending",
    name: "Jaldee Lending",
    description: "Loan Origination and Lifecycle Management (LoM)",
    icon: "wallet",
    accent: "violet",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
];

const ADD_ON_MODULES: ProductCardItem[] = [
  {
    id: "membership",
    name: "Membership & Loyalty",
    description: "Subscription plans, point systems, and rewards",
    icon: "crown",
    accent: "amber",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "leads",
    name: "Lead Suite",
    description: "Sales pipeline and lead conversion tracking",
    icon: "target",
    accent: "pink",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "tasks",
    name: "Task Manager",
    description: "Workflow automation and staff assignments",
    icon: "checkSquare",
    accent: "indigo",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "donations",
    name: "Donation Manager",
    description: "Donation tracking and 80G receipting",
    icon: "heart",
    accent: "rose",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
];

const PLATFORM_SERVICES: ProductCardItem[] = [
  {
    id: "finance",
    name: "Jaldee Pay & Finance",
    description: "GST Invoicing, Payments, and Billing",
    icon: "currency",
    accent: "slate",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "comms",
    name: "Smart Comms",
    description: "WhatsApp, SMS, and Email delivery engine",
    icon: "bell",
    accent: "blue",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "insights",
    name: "Jaldee Insights",
    description: "Unified cross-product data and analytics",
    icon: "chartBars",
    accent: "violet",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "drive",
    name: "Jaldee Drive",
    description: "Secure cloud storage for all documents",
    icon: "folder",
    accent: "amber",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
];

const USAGE_ITEMS: UsageItem[] = [
  { id: "bookings", label: "Bookings", value: "247", total: "500", progress: 49 },
  { id: "sms", label: "SMS Sent", value: "1832", total: "5000", progress: 37 },
  { id: "storage", label: "Storage", value: "2.1", total: "10GB", progress: 21 },
];

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Acme Healthcare Pvt Ltd");
  const [displayName, setDisplayName] = useState("Acme Health");
  const [industry, setIndustry] = useState("healthcare");
  const [legalEntityName, setLegalEntityName] = useState("Acme Healthcare Private Limited");
  const [gstin, setGstin] = useState("27AAAAA0000A1Z5");
  const [pan, setPan] = useState("AAAAA0000A");
  const [registeredAddress, setRegisteredAddress] = useState("123 Health Street, Jubilee Hills, Hyderabad, Telangana - 500033");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [fiscalYearStart, setFiscalYearStart] = useState("April");
  const [autoLockTransactions, setAutoLockTransactions] = useState(false);
  const [coreProducts, setCoreProducts] = useState(CORE_PRODUCTS);
  const [addOnModules, setAddOnModules] = useState(ADD_ON_MODULES);

  const activeKey = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[1] ?? "company";
  }, [location.pathname]);

  const activeItem = NAV_ITEMS.find((item) => item.key === activeKey) ?? NAV_ITEMS[0];
  const grouped = useMemo(() => {
    return {
      GENERAL: NAV_ITEMS.filter((item) => item.group === "GENERAL"),
      BUSINESS: NAV_ITEMS.filter((item) => item.group === "BUSINESS"),
      ADVANCED: NAV_ITEMS.filter((item) => item.group === "ADVANCED"),
    };
  }, []);

  function goTo(key: string) {
    navigate(`/settings/${key}`);
  }

  function toggleCoreProduct(id: string, enabled: boolean) {
    setCoreProducts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled,
              statusLabel: enabled ? "Active" : "Available",
              statusMeta: enabled ? "Enabled since today" : "Click to enable",
              actionLabel: enabled ? "Configure" : undefined,
            }
          : item,
      ),
    );
  }

  function toggleAddOnModule(id: string, enabled: boolean) {
    setAddOnModules((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled,
              statusLabel: enabled ? "Active" : "Available",
              statusMeta: enabled ? "Enabled for this workspace" : "Click to enable",
              actionLabel: enabled ? "Configure" : undefined,
            }
          : item,
      ),
    );
  }

  return (
    <div className="settings-page">
      <aside className="settings-page__nav">
        <div className="settings-page__nav-inner">
          <SettingsNavGroup title="GENERAL" items={grouped.GENERAL} activeKey={activeItem.key} onNavigate={goTo} />
          <SettingsNavGroup title="BUSINESS" items={grouped.BUSINESS} activeKey={activeItem.key} onNavigate={goTo} />
          <SettingsNavGroup title="ADVANCED" items={grouped.ADVANCED} activeKey={activeItem.key} onNavigate={goTo} />
        </div>
      </aside>

      <div className="settings-page__content">
        <PageHeader
          title={activeItem.label}
          subtitle={activeItem.key === "subscription-products" ? "Manage your plan and the products, modules, and services enabled for Acme Healthcare" : "Your business profile and operating defaults"}
          actions={<Button variant="primary" className="settings-save-button"><ActionGlyph kind="save" />Save Changes</Button>}
          className="settings-page__header"
        />

        {activeItem.key === "company" ? (
          <div className="settings-page__cards">
            <SectionCard className="settings-card settings-card--company">
              <CardHeading icon="building" title="Profile" subtitle="Public information about your business" />
              <div className="settings-form-grid settings-form-grid--two">
                <Input label="Company Name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                <div>
                  <Input label="Display Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  <p className="settings-field-note">Shown on invoices and receipts</p>
                </div>
                <div className="settings-field-span">
                  <Select
                    label="Industry"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    options={[
                      { value: "healthcare", label: "healthcare" },
                      { value: "retail", label: "retail" },
                      { value: "services", label: "services" },
                    ]}
                  />
                </div>
              </div>

              <div className="settings-logo-row">
                <div className="settings-logo-uploader">
                  <ActionGlyph kind="upload" className="settings-logo-uploader__icon" />
                  <span>UPLOAD</span>
                </div>
                <div className="settings-logo-copy">
                  <p className="settings-logo-copy__title">Change your business logo</p>
                  <p className="settings-logo-copy__meta">Square images work best. Max 2MB, PNG or JPG.</p>
                  <button type="button" className="settings-link-danger">Remove logo</button>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <CardHeading icon="scale" title="Legal & Tax" subtitle="Government registrations and tax compliance" />
              <div className="settings-form-grid settings-form-grid--two">
                <Input label="Legal Entity Name" value={legalEntityName} onChange={(event) => setLegalEntityName(event.target.value)} />
                <Input label="GSTIN" value={gstin} onChange={(event) => setGstin(event.target.value)} />
                <Input label="PAN" value={pan} onChange={(event) => setPan(event.target.value)} />
                <div />
                <div className="settings-field-span settings-field-span--full">
                  <Input label="Registered Address" value={registeredAddress} onChange={(event) => setRegisteredAddress(event.target.value)} />
                  <p className="settings-field-note">This address appears on all GST invoices</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <CardHeading icon="slidersHorizontal" title="Operating Defaults" subtitle="Default regional and time settings" />
              <div className="settings-form-grid settings-form-grid--four">
                <Select label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} options={[{ value: "INR", label: "INR" }]} />
                <Select
                  label="Timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  options={[{ value: "Asia/Kolkata", label: "Asia/Kolkata" }]}
                />
                <Select
                  label="Date Format"
                  value={dateFormat}
                  onChange={(event) => setDateFormat(event.target.value)}
                  options={[{ value: "DD/MM/YYYY", label: "DD/MM/YYYY" }]}
                />
                <Select
                  label="Fiscal Year Start"
                  value={fiscalYearStart}
                  onChange={(event) => setFiscalYearStart(event.target.value)}
                  options={[{ value: "April", label: "April" }]}
                />
              </div>

              <div className="settings-inline-check">
                <Checkbox checked={autoLockTransactions} onChange={(event) => setAutoLockTransactions(event.target.checked)} />
                <div>
                  <div className="settings-inline-check__title">Auto-lock transactions</div>
                  <div className="settings-inline-check__copy">Automatically lock invoices and payments after the month-end to prevent accidental changes.</div>
                </div>
              </div>
            </SectionCard>

            <div className="settings-danger">
              <div className="settings-danger__divider" />
              <div className="settings-danger__label">DANGER ZONE</div>
              <div className="settings-danger__divider" />
            </div>

            <div className="settings-danger-grid">
              <DangerTile icon="download" title="Export Business Data" description="Download a full archive of your tenant data (JSON/CSV)." />
              <DangerTile icon="trash2" title="Delete Tenant Account" description="Permanently erase all data for Acme Healthcare." />
            </div>
          </div>
        ) : activeItem.key === "subscription-products" ? (
          <div className="settings-page__cards">
            <SectionCard className="settings-card">
              <div className="settings-plan-card">
                <div>
                  <h3 className="settings-plan-card__title">Growth Plan</h3>
                  <p className="settings-plan-card__price">Rs. 4,999 per month, billed annually</p>
                  <div className="settings-plan-card__meta">
                    <NavIcon name="calendar" className="settings-plan-card__meta-icon" />
                    <span>Next billing: 15 December 2026</span>
                  </div>
                </div>
                <div className="settings-plan-card__actions">
                  <Button variant="primary">Upgrade Plan</Button>
                  <button type="button" className="settings-link-button">
                    <NavIcon name="historyClock" className="settings-link-button__icon" />
                    <span>View billing history</span>
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Core Products</h3>
                  <Badge variant="info">TIER 4</Badge>
                </div>
                <p>Business applications you enable based on your use case. Toggle on to provision and start using.</p>
              </div>
              <div className="settings-product-grid">
                {coreProducts.map((item) => (
                  <ProductCard key={item.id} item={item} onToggle={toggleCoreProduct} />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Add-on Modules</h3>
                  <Badge variant="info">TIER 3</Badge>
                </div>
                <p>Capabilities that work across your core products. Enable to extend your core products with sales, loyalty, and workflow features.</p>
              </div>
              <div className="settings-product-grid">
                {addOnModules.map((item) => (
                  <ProductCard key={item.id} item={item} onToggle={toggleAddOnModule} />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Platform Services</h3>
                  <Badge variant="info">TIER 2</Badge>
                </div>
                <p>Foundation services included with every plan. Some are always on; others are optional.</p>
              </div>
              <div className="settings-product-grid">
                {PLATFORM_SERVICES.map((item) => (
                  <ProductCard key={item.id} item={item} readOnly />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-usage-header">
                <h3>Usage This Month</h3>
              </div>
              <div className="settings-usage-grid">
                {USAGE_ITEMS.map((item) => (
                  <UsageCard key={item.id} item={item} />
                ))}
              </div>
              <button type="button" className="settings-usage-link">
                <span>View detailed usage report</span>
                <NavIcon name="arrowRight" className="settings-usage-link__icon" />
              </button>
            </SectionCard>
          </div>
        ) : (
          <SectionCard className="settings-card">
            <CardHeading icon={activeItem.icon} title={activeItem.label} subtitle="This settings section is routed and ready for implementation." />
            <div className="settings-placeholder">
              <p className="settings-placeholder__title">{activeItem.label} is scaffolded</p>
              <p className="settings-placeholder__copy">Use this section for the next conversion slice while keeping the shared settings layout intact.</p>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SettingsNavGroup({
  title,
  items,
  activeKey,
  onNavigate,
}: {
  title: string;
  items: SettingsNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
}) {
  return (
    <div className="settings-nav-group">
      <div className="settings-nav-group__title">{title}</div>
      <div className="settings-nav-group__items">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            className={`settings-nav-item ${activeKey === item.key ? "settings-nav-item--active" : ""}`}
          >
            <NavIcon name={item.icon} className="settings-nav-item__icon" />
            <span>{item.label}</span>
            {item.key === "developer" ? <span className="settings-nav-item__badge">PRO</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="settings-card__heading">
      <div className="settings-card__title-row">
        <NavIcon name={icon} className="settings-card__title-icon" />
        <h3>{title}</h3>
      </div>
      <p>{subtitle}</p>
    </div>
  );
}

function DangerTile({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <button type="button" className="settings-danger-tile">
      <span className="settings-danger-tile__icon">
        <NavIcon name={icon} />
      </span>
      <span className="settings-danger-tile__content">
        <span className="settings-danger-tile__title">{title}</span>
        <span className="settings-danger-tile__description">{description}</span>
      </span>
    </button>
  );
}

function ProductCard({
  item,
  onToggle,
  readOnly = false,
}: {
  item: ProductCardItem;
  onToggle?: (id: string, enabled: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="settings-product-card">
      <div className="settings-product-card__top">
        <div className={`settings-product-card__icon settings-product-card__icon--${item.accent}`}>
          <NavIcon name={item.icon} className="settings-product-card__glyph" />
        </div>
        {readOnly ? (
          <span className="settings-product-card__lock">
            <NavIcon name="lock" />
          </span>
        ) : (
          <Switch checked={item.enabled} onChange={(checked) => onToggle?.(item.id, checked)} className="settings-product-card__switch" />
        )}
      </div>
      <div className="settings-product-card__body">
        <h4>{item.name}</h4>
        <p>{item.description}</p>
      </div>
      <div className="settings-product-card__footer">
        <div className="settings-product-card__status">
          <Badge variant={item.enabled ? "success" : "neutral"}>{item.statusLabel}</Badge>
          <span>{item.statusMeta}</span>
        </div>
        {item.actionLabel ? (
          <button type="button" className="settings-product-card__action">
            <span>{item.actionLabel}</span>
            <NavIcon name="arrowRight" className="settings-product-card__action-icon" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UsageCard({ item }: { item: UsageItem }) {
  return (
    <div className="settings-usage-card">
      <div className="settings-usage-card__top">
        <span className="settings-usage-card__label">{item.label}</span>
        <div className="settings-usage-card__value">
          <strong>{item.value}</strong>
          <span>/ {item.total}</span>
        </div>
      </div>
      <div className="settings-usage-card__bar">
        <span style={{ width: `${item.progress}%` }} />
      </div>
      <div className="settings-usage-card__meta">{item.progress}% used</div>
    </div>
  );
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className,
  };

  switch (name) {
    case "building":
      return <svg {...shared}><path d="M4 20V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14" /><path d="M8 9h4" /><path d="M8 13h4" /><path d="M8 17h4" /><path d="M16 10h3a1 1 0 0 1 1 1v9" /></svg>;
    case "palette":
      return <svg {...shared}><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a2 2 0 0 1 0-4H14a7 7 0 1 0-2-10.5Z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="8" r="1" fill="currentColor" stroke="none" /></svg>;
    case "mapPin":
      return <svg {...shared}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
    case "box":
      return <svg {...shared}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12 20 7.5" /><path d="M12 12 4 7.5" /><path d="M12 12v9" /></svg>;
    case "creditCard":
      return <svg {...shared}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>;
    case "messageSquare":
      return <svg {...shared}><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 2.5Z" /></svg>;
    case "users":
      return <svg {...shared}><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><circle cx="17" cy="9" r="2" /><path d="M15 19a4 4 0 0 1 5 0" /></svg>;
    case "share2":
      return <svg {...shared}><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 12 8-6" /><path d="m8 12 8 6" /></svg>;
    case "shield":
      return <svg {...shared}><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9.5 12 1.7 1.7 3.3-3.4" /></svg>;
    case "code2":
      return <svg {...shared}><path d="m8 9-4 3 4 3" /><path d="m16 9 4 3-4 3" /><path d="m13 6-2 12" /></svg>;
    case "scale":
      return <svg {...shared}><path d="M12 4v16" /><path d="M7 7h10" /><path d="m7 7-3 5h6l-3-5Z" /><path d="m17 7-3 5h6l-3-5Z" /><path d="M8 20h8" /></svg>;
    case "slidersHorizontal":
      return <svg {...shared}><path d="M4 7h8" /><path d="M16 7h4" /><circle cx="14" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></svg>;
    case "download":
      return <svg {...shared}><path d="M12 4v10" /><path d="m8.5 10.5 3.5 3.5 3.5-3.5" /><path d="M5 20h14" /></svg>;
    case "trash2":
      return <svg {...shared}><path d="M4 7h16" /><path d="M10 11v5" /><path d="M14 11v5" /><path d="M6 7l1 12h10l1-12" /><path d="M9 7V4h6v3" /></svg>;
    case "upload":
      return <svg {...shared}><path d="M12 20V9" /><path d="m8.5 12.5 3.5-3.5 3.5 3.5" /><path d="M5 20h14" /></svg>;
    case "calendar":
      return <svg {...shared}><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4" /><path d="M16 4v4" /><path d="M4 10h16" /></svg>;
    case "historyClock":
      return <svg {...shared}><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 5v5h5" /><path d="M12 8v4l3 2" /></svg>;
    case "arrowRight":
      return <svg {...shared}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case "stethoscope":
      return <svg {...shared}><path d="M8 4v5a4 4 0 1 0 8 0V4" /><path d="M12 13v3a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="13" r="2" /></svg>;
    case "bag":
      return <svg {...shared}><path d="M6 8h12l-1 11H7L6 8Z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></svg>;
    case "wallet":
      return <svg {...shared}><path d="M4 7h13a3 3 0 0 1 3 3v7H7a3 3 0 0 1-3-3V7Z" /><path d="M4 7V6a2 2 0 0 1 2-2h11" /><path d="M16 12h4" /></svg>;
    case "crown":
      return <svg {...shared}><path d="m4 8 4 4 4-6 4 6 4-4-2 10H6L4 8Z" /></svg>;
    case "target":
      return <svg {...shared}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
    case "checkSquare":
      return <svg {...shared}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.3 2.3 4.7-4.8" /></svg>;
    case "heart":
      return <svg {...shared}><path d="M12 20s-6.5-4.2-8.5-7.5A4.9 4.9 0 0 1 12 7a4.9 4.9 0 0 1 8.5 5.5C18.5 15.8 12 20 12 20Z" /><path d="M9 12h6" /><path d="M12 9v6" /></svg>;
    case "currency":
      return <svg {...shared}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6" /><path d="M12 7v10" /><path d="M9 13h6" /></svg>;
    case "bell":
      return <svg {...shared}><path d="M12 4a4 4 0 0 1 4 4v2.5c0 .8.3 1.5.8 2.1l1.2 1.4H6l1.2-1.4c.5-.6.8-1.3.8-2.1V8a4 4 0 0 1 4-4Z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>;
    case "chartBars":
      return <svg {...shared}><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19V8" /><path d="M4 19h17" /></svg>;
    case "folder":
      return <svg {...shared}><path d="M4 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" /></svg>;
    case "lock":
      return <svg {...shared}><rect x="6" y="11" width="12" height="9" rx="2" /><path d="M9 11V8a3 3 0 0 1 6 0v3" /></svg>;
    default:
      return <svg {...shared}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

function ActionGlyph({ kind, className }: { kind: "save" | "upload"; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className,
  };

  if (kind === "save") {
    return (
      <svg {...shared}>
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M9 18h6" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M12 20V9" />
      <path d="m8.5 12.5 3.5-3.5 3.5 3.5" />
      <path d="M5 20h14" />
    </svg>
  );
}
