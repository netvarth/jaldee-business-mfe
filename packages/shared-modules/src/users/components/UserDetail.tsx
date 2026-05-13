import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Divider,
  EmptyState,
  Input,
  PhoneInput,
  RadioGroup,
  SectionCard,
  Select,
  SkeletonCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUserDepartments, useUserDetail } from "../queries/users";
import {
  UserAccountPanel,
  UserNonWorkingDaysPanel,
  UserQueuesPanel,
  UserSchedulesPanel,
  UserServicesPanel,
} from "./UserFeaturePanels";
import { UserAvatar, UsersPageShell } from "./shared";

type DetailSectionKey =
  | "personal-details"
  | "my-account"
  | "services"
  | "queues"
  | "schedules"
  | "non-working-days";

type UserDetailFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: { countryCode: string; number: string; e164Number?: string };
  whatsappNumber: { countryCode: string; number: string; e164Number?: string };
  telegramNumber: { countryCode: string; number: string; e164Number?: string };
  userType: string;
  departmentId: string;
  employeeId: string;
  pinCode: string;
  adminPrivilege: boolean;
  showPatientsList: boolean;
  showBusinessProfile: boolean;
  showFinanceManager: boolean;
  showInventoryManager: boolean;
  gender: string;
  dob: string;
  bookingColor: string;
};

const DETAIL_SECTIONS: { key: DetailSectionKey; label: string }[] = [
  { key: "personal-details", label: "Personal Details" },
  { key: "my-account", label: "My Account" },
  { key: "services", label: "Services" },
  { key: "queues", label: "Queues" },
  { key: "schedules", label: "Schedules" },
  { key: "non-working-days", label: "Non Working Days" },
];

const SECTION_DESCRIPTIONS: Record<DetailSectionKey, string> = {
  "personal-details": "Identity, communication, department, and privilege settings.",
  "my-account": "Account-level preferences, login controls, and role-linked settings.",
  services: "Assigned services and user-level service configuration.",
  queues: "Queue access, waitlist responsibilities, and queue-specific capabilities.",
  schedules: "Schedule ownership, availability, and booking-related configuration.",
  "non-working-days": "Holiday and leave windows for this user.",
};

const USER_TYPE_OPTIONS = [
  { value: "PROVIDER", label: "Doctor" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
];

function ChevronDownGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function normalizeDateInput(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function buildPhoneValue(countryCode?: string, number?: string) {
  return {
    countryCode: countryCode || "+91",
    number: number || "",
    e164Number: number ? `${countryCode || "+91"}${number}` : undefined,
  };
}

function buildInitialFormState(detail?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  whatsappNumber?: string;
  telegramNumber?: string;
  userType?: string;
  departmentId?: string;
  employeeId?: string;
  pinCode?: string;
  adminPrivilege?: boolean;
  showPatientsList?: boolean;
  showBusinessProfile?: boolean;
  showFinanceManager?: boolean;
  showInventoryManager?: boolean;
  gender?: string;
  dob?: string;
  bookingColor?: string;
  phoneCountryCode?: string;
  whatsappCountryCode?: string;
  telegramCountryCode?: string;
}): UserDetailFormState {
  return {
    firstName: detail?.firstName || "",
    lastName: detail?.lastName || "",
    email: detail?.email || "",
    phoneNumber: buildPhoneValue(detail?.phoneCountryCode, detail?.mobile),
    whatsappNumber: buildPhoneValue(detail?.whatsappCountryCode, detail?.whatsappNumber),
    telegramNumber: buildPhoneValue(detail?.telegramCountryCode, detail?.telegramNumber),
    userType: detail?.userType || "PROVIDER",
    departmentId: detail?.departmentId || "",
    employeeId: detail?.employeeId || "",
    pinCode: detail?.pinCode || "",
    adminPrivilege: detail?.adminPrivilege ?? false,
    showPatientsList: detail?.showPatientsList ?? false,
    showBusinessProfile: detail?.showBusinessProfile ?? true,
    showFinanceManager: detail?.showFinanceManager ?? false,
    showInventoryManager: detail?.showInventoryManager ?? false,
    gender: detail?.gender || "",
    dob: normalizeDateInput(detail?.dob),
    bookingColor: detail?.bookingColor || "#33009C",
  };
}

export function UserDetailView({
  userId,
  section,
  standalone = false,
}: {
  userId: string;
  section?: string | null;
  standalone?: boolean;
}) {
  const { basePath, routeParams } = useSharedModulesContext();
  const subview = section ?? routeParams?.subview ?? null;
  const navigate = useSharedNavigate();
  const detailQuery = useUserDetail(userId);
  const departmentsQuery = useUserDepartments();
  const detail = detailQuery.data;
  const [activeSection, setActiveSection] = useState<DetailSectionKey>("personal-details");
  const [formState, setFormState] = useState<UserDetailFormState>(() => buildInitialFormState());

  useEffect(() => {
    const nextSection = DETAIL_SECTIONS.some((item) => item.key === subview)
      ? (subview as DetailSectionKey)
      : "personal-details";
    setActiveSection(nextSection);
  }, [subview]);

  useEffect(() => {
    if (detail) {
      setFormState(buildInitialFormState(detail));
    }
  }, [detail]);

  const departmentOptions = useMemo(
    () => [
      { value: "", label: "Select Department" },
      ...(departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: department.name,
      })),
    ],
    [departmentsQuery.data]
  );

  const bookingColorPreviewStyle = useMemo(
    () => ({
      backgroundColor: formState.bookingColor || "#33009C",
    }),
    [formState.bookingColor]
  );

  const privilegeItems = useMemo(
    () => [
      {
        key: "adminPrivilege",
        label: "Admin Privileges",
        description: "This privilege allows the user to create new user, modify existing user etc.",
      },
      {
        key: "showPatientsList",
        label: "Show Patients List",
        description: "This privilege allows the user to see patients data based.",
      },
      {
        key: "showBusinessProfile",
        label: "Allow Business Profile",
        description: "This privilege will allow the user to create their own profile.",
      },
      {
        key: "showFinanceManager",
        label: "Show Finance Manager",
        description: "This privilege will allow the user to see finance manager.",
      },
      {
        key: "showInventoryManager",
        label: "Show Inventory Manager",
        description: "This privilege will allow the user to see inventory manager.",
      },
    ] as const,
    []
  );

  function openSection(nextSection: DetailSectionKey) {
    setActiveSection(nextSection);
    navigate(`${basePath}/${nextSection}/${userId}`);
  }

  const showSidebar = !standalone;
  const pageTitle = standalone ? "User Details" : "Users";
  const pageSubtitle = standalone
    ? undefined
    : detail?.name
      ? `Manage ${detail.name}`
      : "Manage user details and feature access";

  return (
    <UsersPageShell title={pageTitle} subtitle={pageSubtitle} onBack={() => navigate(basePath)}>
      {detailQuery.isLoading && <SkeletonCard />}
      {detailQuery.isError && (
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="User details could not load"
            description="The live user detail API returned an error."
            action={<Button onClick={() => detailQuery.refetch()}>Retry</Button>}
          />
        </SectionCard>
      )}

      {!detailQuery.isLoading && !detailQuery.isError && detail && (
        <div className={`grid gap-6 ${showSidebar ? "xl:grid-cols-[320px_minmax(0,1fr)]" : ""}`}>
          {showSidebar ? (
            <SectionCard className="border-slate-200 bg-white shadow-sm" padding={false}>
              <div className="flex flex-col items-center border-b border-slate-200 px-6 py-8 text-center">
                <UserAvatar name={detail.name} subtitle={detail.roleName || detail.userType} />
                <div className="mt-3 text-sm font-semibold text-slate-900">{detail.name}</div>
              </div>
              <div className="divide-y divide-slate-100">
                {DETAIL_SECTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openSection(item.key)}
                    className={`w-full px-5 py-4 text-left transition ${
                      activeSection === item.key
                        ? "bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] font-medium text-[var(--color-primary)]"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{SECTION_DESCRIPTIONS[item.key]}</div>
                  </button>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {activeSection === "personal-details" ? (
            <SectionCard className="border-slate-200 bg-white shadow-sm" padding={false}>
              <div className={`space-y-8 ${standalone ? "p-5 md:p-6" : "p-5"}`}>
                {!standalone ? (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
                      <p className="text-sm text-slate-500">
                        Manage profile information, communication channels, department assignment, and user privileges.
                      </p>
                    </div>
                    <Divider />
                  </>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="First Name *"
                    value={formState.firstName}
                    onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))}
                  />
                  <Input
                    label="Last Name *"
                    value={formState.lastName}
                    onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))}
                  />
                  <Input
                    label="Email"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  />
                  <PhoneInput
                    label="Phone Number"
                    value={formState.phoneNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, phoneNumber: value }))}
                  />
                  <PhoneInput
                    label="Whatsapp Number"
                    value={formState.whatsappNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, whatsappNumber: value }))}
                  />
                  <PhoneInput
                    label="Telegram Number"
                    value={formState.telegramNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, telegramNumber: value }))}
                  />
                  <Select
                    label="Usertype"
                    value={formState.userType}
                    onChange={(event) => setFormState((current) => ({ ...current, userType: event.target.value }))}
                    options={USER_TYPE_OPTIONS}
                  />
                  <Select
                    label="Department"
                    value={formState.departmentId}
                    onChange={(event) => setFormState((current) => ({ ...current, departmentId: event.target.value }))}
                    options={departmentOptions}
                  />
                  <Input
                    label="Employee Id"
                    value={formState.employeeId}
                    onChange={(event) => setFormState((current) => ({ ...current, employeeId: event.target.value }))}
                  />
                  <Input
                    label="Pincode"
                    value={formState.pinCode}
                    onChange={(event) => setFormState((current) => ({ ...current, pinCode: event.target.value }))}
                  />
                </div>

                <div className="rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700"
                  >
                    <span>Additional details</span>
                    <span className="text-slate-400">
                      <ChevronDownGlyph />
                    </span>
                  </button>
                </div>

                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">Access Controls</h3>
                      <p className="text-xs text-slate-500">
                        Toggle the privileges and visibility options assigned to this user.
                      </p>
                    </div>

                    {privilegeItems.map((item) => (
                      <Checkbox
                        key={item.key}
                        checked={formState[item.key]}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            [item.key]: event.target.checked,
                          }))
                        }
                        label={item.label}
                        description={item.description}
                        labelClassName="text-sm font-medium text-slate-800"
                      />
                    ))}

                    <DatePicker
                      label="Date of Birth"
                      value={formState.dob}
                      onChange={(event) => setFormState((current) => ({ ...current, dob: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">Booking Color</div>
                      <p className="text-xs text-slate-500">Preview the color used for this user's booking presence.</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formState.bookingColor}
                          onChange={(event) => setFormState((current) => ({ ...current, bookingColor: event.target.value }))}
                          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1"
                        />
                        <span
                          className="inline-flex rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm"
                          style={bookingColorPreviewStyle}
                        >
                          Preview
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (detail.digitalSignatureUrl) {
                            window.open(detail.digitalSignatureUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={!detail.digitalSignatureUrl}
                      >
                        {detail.digitalSignatureUrl ? "Open Digital Signature" : "Add Digital Signature"}
                      </Button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <RadioGroup
                        label="Gender"
                        name="user-gender"
                        value={formState.gender}
                        onChange={(value) => setFormState((current) => ({ ...current, gender: value }))}
                        options={[
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                          { value: "Other", label: "Other" },
                        ]}
                        className="gap-3"
                        optionClassName="flex-row items-center"
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                <div className="flex justify-start gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => (standalone ? navigate(basePath) : setFormState(buildInitialFormState(detail)))}
                  >
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={() => {}}>
                    Save
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === "my-account" ? <UserAccountPanel userId={userId} /> : null}
          {activeSection === "services" ? <UserServicesPanel userId={userId} /> : null}
          {activeSection === "queues" ? <UserQueuesPanel userId={userId} /> : null}
          {activeSection === "schedules" ? <UserSchedulesPanel userId={userId} /> : null}
          {activeSection === "non-working-days" ? <UserNonWorkingDaysPanel userId={userId} /> : null}
        </div>
      )}
    </UsersPageShell>
  );
}
