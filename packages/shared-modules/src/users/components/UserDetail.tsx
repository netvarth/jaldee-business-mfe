import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import { UserAvatar, UsersPageShell } from "./shared";

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

const USER_TYPE_OPTIONS = [
  { value: "PROVIDER", label: "Doctor" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
];

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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function UserDetailView({
  userId,
  standalone = false,
}: {
  userId: string;
  section?: string | null;
  standalone?: boolean;
}) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const detailQuery = useUserDetail(userId);
  const departmentsQuery = useUserDepartments();
  const detail = detailQuery.data;
  const [formState, setFormState] = useState<UserDetailFormState>(() => buildInitialFormState());

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
    () =>
      [
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

  const pageTitle = standalone ? "User Details" : "Users";
  const pageSubtitle = standalone
    ? ""
    : detail?.name
      ? `Manage ${detail.name}`
      : "Manage user details and feature access";

  return (
    <UsersPageShell title={pageTitle} subtitle={pageSubtitle} onBack={() => navigate(basePath)}>
      {detailQuery.isLoading && <SkeletonCard />}
      {detailQuery.isError && (
        <SectionCard className="border-slate-200 shadow-none">
          <EmptyState
            title="User details could not load"
            description="The live user detail API returned an error."
            action={<Button onClick={() => detailQuery.refetch()}>Retry</Button>}
          />
        </SectionCard>
      )}

      {!detailQuery.isLoading && !detailQuery.isError && detail && (
        <div className="space-y-5">
          {/* Profile Header Card */}
          <SectionCard className="border-slate-200 bg-white shadow-none" padding={false}>
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:gap-6">
              <div className="shrink-0">
                <UserAvatar name={detail.name} subtitle={detail.roleName || detail.userType} size="lg" prominent />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-semibold text-slate-900">{detail.name}</div>
                {detail.roleName || detail.userType ? (
                  <div className="mt-0.5 text-sm text-slate-500">{detail.roleName || detail.userType}</div>
                ) : null}
                {detail.email ? (
                  <div className="mt-1 text-sm text-slate-400">{detail.email}</div>
                ) : null}
              </div>
              {detail.digitalSignatureUrl && (
                <div className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(detail.digitalSignatureUrl, "_blank", "noopener,noreferrer")}
                  >
                    View Digital Signature
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Personal Details Form */}
          <SectionCard className="border-slate-200 bg-white shadow-none" padding={false}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Personal Details</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Profile information, communication channels, department assignment, and user privileges.
              </p>
            </div>

            <div className="space-y-8 p-6">
              {/* Identity */}
              <FormSection title="Identity" description="Basic identification and role information.">
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
                    label="Employee ID"
                    value={formState.employeeId}
                    onChange={(event) => setFormState((current) => ({ ...current, employeeId: event.target.value }))}
                  />
                  <Input
                    label="PIN Code"
                    value={formState.pinCode}
                    onChange={(event) => setFormState((current) => ({ ...current, pinCode: event.target.value }))}
                  />
                </div>
              </FormSection>

              <Divider />

              {/* Contact */}
              <FormSection title="Contact" description="Communication channels for this user.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Email"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  />
                  <DatePicker
                    label="Date of Birth"
                    value={formState.dob}
                    onChange={(event) => setFormState((current) => ({ ...current, dob: event.target.value }))}
                  />
                  <PhoneInput
                    label="Phone Number"
                    value={formState.phoneNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, phoneNumber: value }))}
                  />
                  <PhoneInput
                    label="WhatsApp Number"
                    value={formState.whatsappNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, whatsappNumber: value }))}
                  />
                  <PhoneInput
                    label="Telegram Number"
                    value={formState.telegramNumber}
                    onChange={(value) => setFormState((current) => ({ ...current, telegramNumber: value }))}
                  />
                </div>
              </FormSection>

              <Divider />

              {/* Role & Department */}
              <FormSection title="Role & Department" description="Organisational assignment and booking preferences.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="User Type"
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Gender */}
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

                  {/* Booking Color */}
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Booking Color</div>
                    <p className="text-xs text-slate-500">Color used for this user's booking presence.</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formState.bookingColor}
                        onChange={(event) => setFormState((current) => ({ ...current, bookingColor: event.target.value }))}
                        className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                      <span
                        className="inline-flex rounded-md px-3 py-2 text-xs font-semibold text-white"
                        style={bookingColorPreviewStyle}
                      >
                        Preview
                      </span>
                    </div>
                  </div>
                </div>
              </FormSection>

              <Divider />

              {/* Access Controls */}
              <FormSection
                title="Access Controls"
                description="Toggle the privileges and visibility options assigned to this user."
              >
                <div className="grid gap-4 md:grid-cols-2">
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
                </div>
              </FormSection>

              <Divider />

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    standalone ? navigate(basePath) : setFormState(buildInitialFormState(detail))
                  }
                >
                  Cancel
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={() => {}}>
                  Save Changes
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </UsersPageShell>
  );
}
