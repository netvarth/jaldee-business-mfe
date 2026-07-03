import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  DatePicker,
  DescriptionList,
  Dialog,
  DialogFooter,
  Divider,
  EmptyState,
  FormSection,
  Input,
  PhoneInput,
  SkeletonCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUserDetail, useUpdateTenantUser } from "../queries/users";
import { UserStatusBadge, UsersPageShell } from "./shared";

const USER_PROFILE_UPDATED_EVENT = "jaldee:user-profile-updated";

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
  standalone = false,
}: {
  userId: string;
  section?: string | null;
  standalone?: boolean;
  /** @deprecated edit is now a modal — this prop is ignored */
  mode?: "view" | "edit";
}) {
  const { basePath, eventBus } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const detailQuery = useUserDetail(userId);
  const updateUserMutation = useUpdateTenantUser(userId);
  const detail = detailQuery.data;

  const [formState, setFormState] = useState<UserDetailFormState>(() => buildInitialFormState());
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (detail) setFormState(buildInitialFormState(detail));
  }, [detail]);

  function openEdit() {
    if (detail) setFormState(buildInitialFormState(detail));
    setEditOpen(true);
  }

  async function saveEdit() {
    const payload = {
      firstName: formState.firstName.trim() || null,
      lastName: formState.lastName.trim() || null,
      email: formState.email.trim() || "",
      employeeId: formState.employeeId.trim() || null,
      pinCode: formState.pinCode.trim() || null,
      dob: formState.dob || null,
      primaryPhoneNumber: formState.phoneNumber.number.trim()
        ? {
            countryCode: formState.phoneNumber.countryCode || "+91",
            number: formState.phoneNumber.number.trim(),
          }
        : null,
      whatsappNumber: formState.whatsappNumber.number.trim()
        ? {
            countryCode: formState.whatsappNumber.countryCode || "+91",
            number: formState.whatsappNumber.number.trim(),
          }
        : null,
      telegramNumber: formState.telegramNumber.number.trim()
        ? {
            countryCode: formState.telegramNumber.countryCode || "+91",
            number: formState.telegramNumber.number.trim(),
          }
        : null,
    };

    await updateUserMutation.mutateAsync(payload);
    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();
    eventBus?.emit(USER_PROFILE_UPDATED_EVENT, {
      userId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email: formState.email.trim(),
    });
    setEditOpen(false);
  }

  const pageTitle = standalone ? "User Details" : detail?.name || "User Details";
  const pageSubtitle = standalone ? "" : "User profile and details";

  return (
    <UsersPageShell
      title={pageTitle}
      subtitle={pageSubtitle}
      onBack={() => navigate(basePath)}
      actions={
        detail ? (
          <Button
            variant="secondary"
            id="btnEditUser_SM_Users"
            data-testid="btnEditUser_SM_Users"
            onClick={openEdit}
          >
            Edit
          </Button>
        ) : undefined
      }
    >
      {/* Loading */}
      {detailQuery.isLoading && <SkeletonCard />}

      {/* Error */}
      {detailQuery.isError && (
        <div className="bg-white rounded-2xl shadow-sm border-0 p-8 flex items-center justify-center">
          <EmptyState
            title="User details could not load"
            description="The live user detail API returned an error."
            action={
              <Button
                id="btnRetryUserDetail_SM_Users"
                data-testid="btnRetryUserDetail_SM_Users"
                onClick={() => detailQuery.refetch()}
              >
                Retry
              </Button>
            }
          />
        </div>
      )}

      {/* Detail View */}
      {!detailQuery.isLoading && !detailQuery.isError && detail && (
        <div className="w-full animate-fade-in" data-testid="user-detail-container">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">

            {/* Left — Profile card + Org */}
            <div className="space-y-6">
              <div
                data-testid="user-profile-card"
                className="bg-white rounded-2xl shadow-sm border-0 p-6 flex flex-col items-center text-center space-y-4"
              >
                <Avatar name={detail.name} size="lg" />
                <div className="space-y-1">
                  <h2
                    className="text-lg font-bold text-slate-800 leading-tight"
                    data-testid="user-detail-name"
                  >
                    {detail.name}
                  </h2>
                  <p
                    className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    data-testid="user-detail-role"
                  >
                    {detail.roleName || detail.userType || "User"}
                  </p>
                </div>
                <div className="pt-1" data-testid="user-detail-status">
                  <UserStatusBadge status={detail.status} />
                </div>
                {detail.digitalSignatureUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    id="btnViewDigitalSignature_SM_Users"
                    data-testid="btnViewDigitalSignature_SM_Users"
                    onClick={() =>
                      window.open(detail.digitalSignatureUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    View Digital Signature
                  </Button>
                )}
              </div>

              <div
                data-testid="user-org-info-card"
                className="bg-white rounded-2xl shadow-sm border-0 p-6 space-y-4"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Organization
                </h3>
                <DescriptionList
                  columns={1}
                  items={[
                    { label: "User Type", value: detail.userType || "—" },
                    { label: "Employee ID", value: detail.employeeId || "—" },
                    { label: "PIN Code", value: detail.pinCode || "—" },
                  ]}
                />
              </div>
            </div>

            {/* Right — Personal + Contact */}
            <div className="bg-white rounded-2xl shadow-sm border-0 p-8 space-y-8">
              <div className="space-y-4" data-testid="user-personal-details-section">
                <h3 className="text-sm font-semibold text-slate-800">Personal Details</h3>
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "First Name", value: detail.firstName || "—" },
                    { label: "Last Name", value: detail.lastName || "—" },
                    { label: "Date of Birth", value: normalizeDateInput(detail.dob) || "—" },
                  ]}
                />
              </div>

              <Divider />

              <div className="space-y-4" data-testid="user-contact-details-section">
                <h3 className="text-sm font-semibold text-slate-800">Contact Information</h3>
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Email Address", value: detail.email || "—" },
                    {
                      label: "Phone Number",
                      value: detail.mobile
                        ? `${detail.phoneCountryCode || "+91"} ${detail.mobile}`.trim()
                        : "—",
                    },
                    {
                      label: "WhatsApp Number",
                      value: detail.whatsappNumber
                        ? `${detail.whatsappCountryCode || "+91"} ${detail.whatsappNumber}`.trim()
                        : "—",
                    },
                    {
                      label: "Telegram Number",
                      value: detail.telegramNumber
                        ? `${detail.telegramCountryCode || "+91"} ${detail.telegramNumber}`.trim()
                        : "—",
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Edit Modal */}
          <Dialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            testId="dlgEditUser_SM_Users"
            title="Edit User"
            description="Update identification and contact details."
            size="lg"
          >
            <div className="space-y-6">
              {/* Identity section — uses design system FormSection */}
              <FormSection
                title="Identity"
                description="Name, date of birth, and workplace identifiers."
              >
                <Input
                  label="First Name *"
                  id="txtFirstName_SM_Users"
                  data-testid="txtFirstName_SM_Users"
                  value={formState.firstName}
                  onChange={(e) => setFormState((s) => ({ ...s, firstName: e.target.value }))}
                />
                <Input
                  label="Last Name *"
                  id="txtLastName_SM_Users"
                  data-testid="txtLastName_SM_Users"
                  value={formState.lastName}
                  onChange={(e) => setFormState((s) => ({ ...s, lastName: e.target.value }))}
                />
                <DatePicker
                  label="Date of Birth"
                  id="dpDob_SM_Users"
                  data-testid="dpDob_SM_Users"
                  value={formState.dob}
                  onChange={(e) => setFormState((s) => ({ ...s, dob: e.target.value }))}
                />
                <Input
                  label="Employee ID"
                  id="txtEmployeeId_SM_Users"
                  data-testid="txtEmployeeId_SM_Users"
                  value={formState.employeeId}
                  onChange={(e) => setFormState((s) => ({ ...s, employeeId: e.target.value }))}
                />
                <Input
                  label="PIN Code"
                  id="txtPinCode_SM_Users"
                  data-testid="txtPinCode_SM_Users"
                  value={formState.pinCode}
                  onChange={(e) => setFormState((s) => ({ ...s, pinCode: e.target.value }))}
                />
              </FormSection>

              {/* Contact section */}
              <FormSection
                title="Contact"
                description="Email address and phone numbers."
              >
                <Input
                  label="Email"
                  id="txtEmail_SM_Users"
                  data-testid="txtEmail_SM_Users"
                  value={formState.email}
                  onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                />
                <PhoneInput
                  label="Phone Number"
                  id="phonePhone_SM_Users"
                  data-testid="phonePhone_SM_Users"
                  value={formState.phoneNumber}
                  onChange={(v) => setFormState((s) => ({ ...s, phoneNumber: v }))}
                />
                <PhoneInput
                  label="WhatsApp Number"
                  id="phoneWhatsapp_SM_Users"
                  data-testid="phoneWhatsapp_SM_Users"
                  value={formState.whatsappNumber}
                  onChange={(v) => setFormState((s) => ({ ...s, whatsappNumber: v }))}
                />
                <PhoneInput
                  label="Telegram Number"
                  id="phoneTelegram_SM_Users"
                  data-testid="phoneTelegram_SM_Users"
                  value={formState.telegramNumber}
                  onChange={(v) => setFormState((s) => ({ ...s, telegramNumber: v }))}
                />
              </FormSection>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                id="btnCancelEditUser_SM_Users"
                data-testid="btnCancelEditUser_SM_Users"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                id="btnSaveUser_SM_Users"
                data-testid="btnSaveUser_SM_Users"
                onClick={saveEdit}
                loading={updateUserMutation.isPending}
                disabled={updateUserMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </Dialog>
        </div>
      )}
    </UsersPageShell>
  );
}
