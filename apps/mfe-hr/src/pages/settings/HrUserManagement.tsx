import { useMemo, useState } from "react";
import { Plus, Search, Filter, ShieldCheck, UserCheck, UserX, Mail, Phone, Lock, Edit3, Eye, MoreVertical, RefreshCw, AlertCircle, CheckCircle2, X, LayoutGrid, Table as Rows3 } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Input, Select, Dialog, Checkbox, Popover, PopoverSection, Drawer, SectionCard, PhoneInput, phoneStringToValue, phoneValueToE164, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { useHrUsers, HR_ROLES, type HrUserProfile, type HrRole, type CreateHrUserPayload } from "../../services/useHrUsers";
import { useEmployees } from "../../services/useEmployees";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";

export function HrUserManagement() {
  const { eventBus } = useMFEProps();
  const {
    data: hrUsers,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalElements,
    createHrUser,
    updateHrUserRoles,
    updateHrUserStatus,
    load,
  } = useHrUsers();

  const { data: employees } = useEmployees({ enabled: true });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedRoles, setSelectedRoles] = useState<HrRole[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editRolesUser, setEditRolesUser] = useState<HrUserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // Create Form State
  const [createMode, setCreateMode] = useState<"NEW" | "EXISTING">("NEW");
  const [form, setForm] = useState<{
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneE164: string;
    allowLogin: boolean;
    primaryRole: HrRole;
    roles: HrRole[];
  }>({
    uid: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneE164: "",
    allowLogin: true,
    primaryRole: "HR_EXECUTIVE",
    roles: ["HR_EXECUTIVE"],
  });

  // Edit Roles Form State
  const [editForm, setEditForm] = useState<{
    primaryRole: HrRole;
    roles: HrRole[];
  }>({
    primaryRole: "HR_EXECUTIVE",
    roles: ["HR_EXECUTIVE"],
  });

  // Filter items locally for fast search
  const filteredUsers = useMemo(() => {
    return hrUsers.filter((u) => {
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (selectedRoles.length > 0 && !selectedRoles.includes(u.primaryRole)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = u.tenantUser?.displayName?.toLowerCase() || "";
        const email = u.tenantUser?.email?.toLowerCase() || "";
        const phone = u.tenantUser?.phoneE164?.toLowerCase() || "";
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [hrUsers, search, statusFilter, selectedRoles]);

  const activeCount = useMemo(() => hrUsers.filter((u) => u.status === "ACTIVE").length, [hrUsers]);

  const handleCreateSubmit = async () => {
    setFormMsg(null);

    if (createMode === "NEW") {
      if (!form.firstName || !form.lastName || !form.email) {
        setFormMsg("First name, last name, and email are required.");
        return;
      }
    } else {
      if (!form.uid) {
        setFormMsg("Please select an existing employee.");
        return;
      }
    }

    if (!form.roles.includes(form.primaryRole)) {
      setFormMsg("Primary role must be included in assigned roles.");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateHrUserPayload = {
        tenantUser: createMode === "NEW"
          ? {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              phoneE164: form.phoneE164,
              allowLogin: form.allowLogin,
            }
          : {
              uid: form.uid,
            },
        primaryRole: form.primaryRole,
        roles: form.roles,
      };

      await createHrUser(payload);
      await load();
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "HR User Management",
        message: "HR User registered successfully.",
      });
      setCreateOpen(false);
      setForm({
        uid: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneE164: "",
        allowLogin: true,
        primaryRole: "HR_EXECUTIVE",
        roles: ["HR_EXECUTIVE"],
      });
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "Failed to register HR User.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRolesSubmit = async () => {
    if (!editRolesUser) return;
    setFormMsg(null);
    if (!editForm.roles.includes(editForm.primaryRole)) {
      setFormMsg("Primary role must be included in assigned roles.");
      return;
    }

    setSaving(true);
    try {
      await updateHrUserRoles(editRolesUser.uid, {
        primaryRole: editForm.primaryRole,
        roles: editForm.roles,
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "HR User Management",
        message: "User roles updated successfully.",
      });
      setEditRolesUser(null);
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "Failed to update roles.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: HrUserProfile) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateHrUserStatus(user.uid, nextStatus);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "HR User Management",
        message: `HR User set to ${nextStatus.toLowerCase()}.`,
      });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "HR User Management",
        message: e instanceof Error ? e.message : "Failed to update status.",
      });
    }
  };

  const columns = useMemo<ColumnDef<HrUserProfile>[]>(
    () => [
      {
        key: "user",
        header: "HR User",
        width: "28%",
        render: (u) => {
          const tu = u.tenantUser;
          const name = tu?.displayName || `${tu?.firstName || ""} ${tu?.lastName || ""}`.trim() || "HR Staff";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-extrabold text-xs border border-teal-200">
                {initials || "HR"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 truncate">{name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                  {tu?.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-slate-400 shrink-0" />
                      {tu.email}
                    </span>
                  )}
                  {tu?.phoneE164 && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      {tu.phoneE164}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "primaryRole",
        header: "Primary Role",
        width: "20%",
        render: (u) => {
          const roleMeta = HR_ROLES.find((r) => r.key === u.primaryRole);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                roleMeta?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              <ShieldCheck size={11} /> {roleMeta?.label || u.primaryRole}
            </span>
          );
        },
      },
      {
        key: "roles",
        header: "Assigned Roles",
        width: "22%",
        render: (u) => {
          const allRoles = u.roles && u.roles.length > 0 ? u.roles : [u.primaryRole];
          const extraCount = allRoles.length - 1;
          const primaryMeta = HR_ROLES.find((r) => r.key === u.primaryRole);

          return (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-900"
                title={primaryMeta?.description}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span className="truncate">{primaryMeta?.label || u.primaryRole}</span>
              </span>

              {extraCount > 0 && (
                <Popover
                  data-testid={`hr-user-roles-popover-${u.uid}`}
                  align="start"
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      +{extraCount} more
                    </button>
                  }
                >
                  <PopoverSection>
                    <div className="p-2 space-y-1 min-w-[180px]">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 py-0.5">
                        Additional HR Roles
                      </div>
                      {allRoles
                        .filter((r) => r !== u.primaryRole)
                        .map((roleKey) => {
                          const meta = HR_ROLES.find((r) => r.key === roleKey);
                          return (
                            <div
                              key={roleKey}
                              className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-800 rounded-md hover:bg-slate-50"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              <span>{meta?.label || roleKey}</span>
                            </div>
                          );
                        })}
                    </div>
                  </PopoverSection>
                </Popover>
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Status & Access",
        width: "16%",
        render: (u) => {
          const isActive = u.status === "ACTIVE";
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id={`hr-user-status-toggle-${u.uid}`}
                data-testid={`hr-user-status-toggle-${u.uid}`}
                onClick={() => handleToggleStatus(u)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  isActive ? "bg-teal-600" : "bg-slate-200"
                )}
                title={isActive ? "Deactivate HR User" : "Activate HR User"}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    isActive ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isActive ? "text-emerald-700" : "text-slate-400"
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        align: "right",
        render: (u) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              id={`hr-user-edit-roles-btn-${u.uid}`}
              data-testid={`hr-user-edit-roles-btn-${u.uid}`}
              variant="outline"
              size="sm"
              icon={<Edit3 size={13} />}
              onClick={() => {
                setEditRolesUser(u);
                setEditForm({
                  primaryRole: u.primaryRole,
                  roles: u.roles || [u.primaryRole],
                });
                setFormMsg(null);
              }}
              title="Edit User Roles"
            >
              Edit Roles
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <section id="hr-user-directory-page" data-testid="hr-user-directory-page" className="page-section active hr-page-shell space-y-3.5">
      <PageHeader
        title="HR User Directory"
        subtitle="Manage tenant HR profiles, assign module operational roles, and grant system login permissions."
        className="!mb-1 sm:!mb-2"
        stackOnMobile={false}
        actions={
          <Button
            id="hr-users-add-button"
            data-testid="hr-users-add-button"
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => {
              setFormMsg(null);
              setCreateOpen(true);
            }}
            size="sm"
            className="whitespace-nowrap"
          >
            Add HR User
          </Button>
        }
      />

      {/* Toolbar & Filter Bar */}
      <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-3 sm:p-4">
          <Input
            id="hr-users-search"
            data-testid="hr-users-search"
            placeholder="Search HR users by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
            className="!h-8.5 text-xs placeholder:text-xs"
            containerClassName="min-w-0 flex-1 sm:max-w-md"
          />

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button
              type="button"
              id="hr-users-filter-btn"
              data-testid="hr-users-filter-btn"
              variant={selectedRoles.length > 0 || statusFilter !== "ALL" ? "primary" : "outline"}
              icon={<Filter size={15} />}
              size="sm"
              onClick={() => setFiltersOpen(true)}
              className="!h-8.5 text-xs px-3"
            >
              Filter {selectedRoles.length > 0 ? `(${selectedRoles.length})` : ""}
            </Button>

            {/* View Mode Toggle */}
            <div data-view-toggle="table-card" className="inline-flex h-8.5 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
              <button
                type="button"
                id="hr-users-view-table"
                data-testid="hr-users-view-table"
                data-active={viewMode === "table"}
                onClick={() => setViewMode("table")}
                className="inline-flex items-center justify-center border-0 cursor-pointer h-7 w-7 rounded"
                aria-label="Table view"
                title="Table view"
              >
                <Rows3 size={15} />
              </button>
              <button
                type="button"
                id="hr-users-view-cards"
                data-testid="hr-users-view-cards"
                data-active={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
                className="inline-flex items-center justify-center border-0 cursor-pointer h-7 w-7 rounded"
                aria-label="Card view"
                title="Card view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table or Grid View */}
        {viewMode === "table" ? (
          <DataTable
            data-testid="hr-users-table"
            data={filteredUsers}
            columns={columns}
            getRowId={(u) => u.uid}
            loading={loading}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="w-full min-w-[800px]"
            emptyState={
              <EmptyState
                icon={<UserCheck size={36} strokeWidth={1.5} />}
                title="No HR Users Found"
                description="Register new HR personnel or link existing CRM employees to grant operational permissions."
              />
            }
          />
        ) : (
          <div className="p-5 sm:p-6 bg-slate-50/40">
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={<UserCheck size={36} strokeWidth={1.5} />}
                title="No HR Users Found"
                description="Register new HR personnel or link existing CRM employees to grant operational permissions."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUsers.map((u) => {
                  const tu = u.tenantUser;
                  const name = tu?.displayName || `${tu?.firstName || ""} ${tu?.lastName || ""}`.trim() || "HR Staff";
                  const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const roleMeta = HR_ROLES.find((r) => r.key === u.primaryRole);
                  const allRoles = u.roles && u.roles.length > 0 ? u.roles : [u.primaryRole];
                  const isActive = u.status === "ACTIVE";

                  return (
                    <div
                      key={u.uid}
                      id={`hr-user-card-${u.uid}`}
                      data-testid={`hr-user-card-${u.uid}`}
                      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-extrabold text-sm border border-teal-200">
                            {initials || "HR"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate m-0">{name}</h4>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider mt-1",
                                roleMeta?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              <ShieldCheck size={10} /> {roleMeta?.label || u.primaryRole}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          id={`hr-user-card-status-toggle-${u.uid}`}
                          data-testid={`hr-user-card-status-toggle-${u.uid}`}
                          onClick={() => handleToggleStatus(u)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            isActive ? "bg-teal-600" : "bg-slate-200"
                          )}
                          title={isActive ? "Deactivate HR User" : "Activate HR User"}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                              isActive ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {tu?.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{tu.email}</span>
                          </div>
                        )}
                        {tu?.phoneE164 && (
                          <div className="flex items-center gap-2 truncate">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <span>{tu.phoneE164}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {allRoles.map((rk) => {
                            const rMeta = HR_ROLES.find((r) => r.key === rk);
                            return (
                              <span
                                key={rk}
                                className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                              >
                                {rMeta?.label || rk}
                              </span>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Edit3 size={12} />}
                          onClick={() => {
                            setEditRolesUser(u);
                            setEditForm({
                              primaryRole: u.primaryRole,
                              roles: u.roles || [u.primaryRole],
                            });
                            setFormMsg(null);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* CREATE HR USER MODAL */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        testId="hr-users-create-modal"
        hideHeader
        contentClassName="max-w-[620px] p-0 overflow-hidden flex flex-col"
      >
        <div className="p-5 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 m-0">Add HR User</h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">Register a new profile or link an existing CRM user.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Link Existing Employee mode hidden for now */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="hr-user-first-name"
                  data-testid="hr-user-first-name"
                  label="First Name"
                  placeholder="e.g. Sarah"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
                <Input
                  id="hr-user-last-name"
                  data-testid="hr-user-last-name"
                  label="Last Name"
                  placeholder="e.g. Jenkins"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>

              <Input
                id="hr-user-email"
                data-testid="hr-user-email"
                label="Email Address"
                placeholder="sarah.jenkins@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />

              <PhoneInput
                id="hr-user-phone"
                testId="hr-user-phone"
                label="Mobile Phone"
                value={phoneStringToValue(form.phoneE164)}
                onChange={(phone) => setForm({ ...form, phoneE164: phoneValueToE164(phone) })}
                preferredCountries={["in", "us", "gb"]}
              />

              <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Lock size={14} className="text-teal-700" /> Allow System Login Access
                  </div>
                  <div className="text-[11px] text-teal-800/80 mt-0.5">
                    Enables login credentials in core-auth-service via OTP / password.
                  </div>
                </div>
                <Checkbox
                  id="hr-user-allow-login"
                  data-testid="hr-user-allow-login"
                  checked={form.allowLogin}
                  onChange={(e) => setForm({ ...form, allowLogin: e.target.checked })}
                />
              </div>
            </div>

          {/* Primary Role Selector */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <Select
              id="hr-user-primary-role"
              testId="hr-user-primary-role"
              label="Primary Operational Role"
              value={form.primaryRole}
              onChange={(e) => {
                const newPrimary = e.target.value as HrRole;
                const otherRoles = form.roles.filter((r) => r !== form.primaryRole);
                const nextRoles = Array.from(new Set([newPrimary, ...otherRoles]));
                setForm({ ...form, primaryRole: newPrimary, roles: nextRoles });
              }}
              options={HR_ROLES.map((r) => ({
                value: r.key,
                label: `${r.label} — ${r.description}`,
              }))}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Role Permissions (Select All Applicable)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HR_ROLES.map((role) => {
                  const isChecked = form.roles.includes(role.key);
                  const isPrimary = form.primaryRole === role.key;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          const nextRoles = form.roles.filter((r) => r !== role.key);
                          if (nextRoles.length === 0) return;
                          const nextPrimary = isPrimary ? nextRoles[0] : form.primaryRole;
                          setForm({ ...form, primaryRole: nextPrimary, roles: nextRoles });
                        } else {
                          const nextRoles = Array.from(new Set([...form.roles, role.key]));
                          setForm({ ...form, roles: nextRoles });
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5",
                        isChecked
                          ? "bg-teal-50/70 border-teal-300 text-teal-950 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-0.5 h-3.5 w-3.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {role.label}
                          {isPrimary && (
                            <span className="text-[9px] font-black text-teal-700 uppercase bg-teal-100 px-1.5 py-0.2 rounded border border-teal-300">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{role.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {formMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{formMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} loading={saving} className="bg-teal-700 hover:bg-teal-800">
              Submit & Register
            </Button>
          </div>
        </div>
      </Dialog>

      {/* EDIT ROLES MODAL */}
      <Dialog
        open={Boolean(editRolesUser)}
        onClose={() => setEditRolesUser(null)}
        testId="hr-users-edit-roles-modal"
        hideHeader
        contentClassName="max-w-[540px] p-0 overflow-hidden"
      >
        <div className="p-5 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 m-0">
              Edit HR Roles — {editRolesUser?.tenantUser?.displayName || "HR User"}
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">Update primary role and module permissions.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditRolesUser(null)}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Select
            id="hr-user-edit-primary-role"
            testId="hr-user-edit-primary-role"
            label="Primary Role"
            value={editForm.primaryRole}
            onChange={(e) => {
              const newPrimary = e.target.value as HrRole;
              const otherRoles = editForm.roles.filter((r) => r !== editForm.primaryRole);
              const nextRoles = Array.from(new Set([newPrimary, ...otherRoles]));
              setEditForm({ primaryRole: newPrimary, roles: nextRoles });
            }}
            options={HR_ROLES.map((r) => ({
              value: r.key,
              label: `${r.label} — ${r.description}`,
            }))}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assigned Permissions
            </label>
            <div className="space-y-2">
              {HR_ROLES.map((role) => {
                const isChecked = editForm.roles.includes(role.key);
                const isPrimary = editForm.primaryRole === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        const nextRoles = editForm.roles.filter((r) => r !== role.key);
                        if (nextRoles.length === 0) return;
                        const nextPrimary = isPrimary ? nextRoles[0] : editForm.primaryRole;
                        setEditForm({ primaryRole: nextPrimary, roles: nextRoles });
                      } else {
                        const nextRoles = Array.from(new Set([...editForm.roles, role.key]));
                        setEditForm({ ...editForm, roles: nextRoles });
                      }
                    }}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3",
                      isChecked
                        ? "bg-teal-50/70 border-teal-300 text-teal-950 font-semibold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-3.5 w-3.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-bold">{role.label}</span>
                    </div>
                    {isPrimary && (
                      <span className="text-[9px] font-black text-teal-700 uppercase bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                        Primary
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {formMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{formMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setEditRolesUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditRolesSubmit} loading={saving} className="bg-teal-700 hover:bg-teal-800">
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* FILTER DRAWER */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter HR Users"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                HR Status
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "py-1.5 text-xs font-bold rounded-lg border-0 cursor-pointer transition-all",
                      statusFilter === st ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 bg-transparent"
                    )}
                  >
                    {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Primary Roles
              </label>
              <div className="space-y-1.5">
                {HR_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role.key);
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => {
                        const next = isChecked
                          ? selectedRoles.filter((r) => r !== role.key)
                          : [...selectedRoles, role.key];
                        setSelectedRoles(next);
                      }}
                      className={cn(
                        "w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                        isChecked ? "bg-teal-50 border-teal-300 text-teal-900 font-bold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-xs">{role.label}</span>
                      {isChecked && <CheckCircle2 size={15} className="text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStatusFilter("ALL");
                setSelectedRoles([]);
                setFiltersOpen(false);
              }}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 bg-teal-700 hover:bg-teal-800"
              onClick={() => setFiltersOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
