import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogFooter,
  Input,
  PhoneInput,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { useAssignUserLocations, useChangeUserLoginId, useCreateUser, useCreateUserTeam, useUserDepartments, useUserDetail, useUserLocations, useUserLoginId } from "../queries/users";
import type { CreateTeamInput, CreateUserInput } from "../types";

const EMPTY_USER: CreateUserInput = {
  firstName: "",
  lastName: "",
  email: "",
  employeeId: "",
  userType: "PROVIDER",
  departmentId: "",
  phoneCountryCode: "+91",
  phoneNumber: "",
};

const EMPTY_TEAM: CreateTeamInput = {
  name: "",
  description: "",
};

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (userId: string) => void;
}) {
  const [values, setValues] = useState<CreateUserInput>(EMPTY_USER);
  const departmentsQuery = useUserDepartments();
  const createMutation = useCreateUser();

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_USER);
    }
  }, [open]);

  async function handleSubmit() {
    const createdUserId = await createMutation.mutateAsync(values);
    onClose();
    if (createdUserId) {
      onCreated?.(createdUserId);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create User"
      description="Create a provider, assistant, admin, or user using the shared users module."
      size="lg"
    >
      <div className="space-y-4">
        {createMutation.error ? (
          <Alert variant="error" title="User creation failed">
            {String(createMutation.error)}
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="First Name" value={values.firstName} onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))} />
          <Input label="Last Name" value={values.lastName} onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))} />
          <Input label="Email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} />
          <Input label="Employee ID" value={values.employeeId} onChange={(event) => setValues((current) => ({ ...current, employeeId: event.target.value }))} />
          <Select
            label="User Type"
            value={values.userType}
            onChange={(event) => setValues((current) => ({ ...current, userType: event.target.value }))}
            options={[
              { value: "PROVIDER", label: "Provider" },
              { value: "ASSISTANT", label: "Assistant" },
              { value: "ADMIN", label: "Admin" },
              { value: "USER", label: "User" },
            ]}
          />
          <Select
            label="Department"
            value={values.departmentId}
            onChange={(event) => setValues((current) => ({ ...current, departmentId: event.target.value }))}
            options={[
              { value: "", label: "Select Department" },
              ...(departmentsQuery.data ?? []).map((department) => ({
                value: department.id,
                label: department.name,
              })),
            ]}
          />
          <PhoneInput
            label="Phone Number"
            value={{ countryCode: values.phoneCountryCode, number: values.phoneNumber }}
            onChange={(phone) =>
              setValues((current) => ({
                ...current,
                phoneCountryCode: phone.countryCode,
                phoneNumber: phone.number,
              }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSubmit()} loading={createMutation.isPending}>
          Create User
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function CreateTeamDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<CreateTeamInput>(EMPTY_TEAM);
  const createMutation = useCreateUserTeam();

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_TEAM);
    }
  }, [open]);

  async function handleSubmit() {
    await createMutation.mutateAsync(values);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Team"
      description="Create a user team group. Member assignment can be added next from the teams workflow."
      size="md"
    >
      <div className="space-y-4">
        {createMutation.error ? (
          <Alert variant="error" title="Team creation failed">
            {String(createMutation.error)}
          </Alert>
        ) : null}

        <Input label="Team Name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        <Textarea label="Description" rows={4} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSubmit()} loading={createMutation.isPending}>
          Create Team
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function AssignLocationsDialog({
  open,
  onClose,
  userId,
  userName,
  initialLocationIds,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userName?: string;
  initialLocationIds?: string[];
}) {
  const detailQuery = useUserDetail(open ? userId : null);
  const locationsQuery = useUserLocations();
  const assignMutation = useAssignUserLocations(userId);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedLocationIds([]);
      return;
    }

    const nextIds = initialLocationIds?.length
      ? initialLocationIds
      : (
      detailQuery.data?.businessLocations?.map((location) => location.id).filter(Boolean) ??
      detailQuery.data?.locationIds?.filter(Boolean) ??
      []
    );
    setSelectedLocationIds(nextIds);
  }, [detailQuery.data, initialLocationIds, open]);

  async function handleSubmit() {
    await assignMutation.mutateAsync(selectedLocationIds);
    onClose();
  }

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) =>
      current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId]
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign to Locations"
      description={userName ? `Select business locations for ${userName}.` : "Select business locations for this user."}
      size="md"
    >
      <div className="space-y-4">
        {assignMutation.error ? (
          <Alert variant="error" title="Location assignment failed">
            {String(assignMutation.error)}
          </Alert>
        ) : null}

        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">Select Locations *</div>
          <div className="space-y-2">
            {(locationsQuery.data ?? []).map((location) => {
              const checked = selectedLocationIds.includes(location.id);
              return (
                <label
                  key={location.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <Checkbox checked={checked} onChange={() => toggleLocation(location.id)} aria-label={location.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">{location.name}</div>
                    {location.status ? <div className="mt-1 text-xs text-slate-500">{location.status}</div> : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSubmit()} loading={assignMutation.isPending} disabled={!selectedLocationIds.length || detailQuery.isLoading}>
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

const LOGIN_ID_PATTERN = /^[A-Za-z0-9@_.]{5,45}$/;

export function ChangeLoginIdDialog({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}) {
  const loginIdQuery = useUserLoginId(open ? userId : null);
  const changeMutation = useChangeUserLoginId();
  const [loginId, setLoginId] = useState("");

  useEffect(() => {
    if (!open) {
      setLoginId("");
      return;
    }
    setLoginId("");
  }, [open]);

  const trimmedLoginId = loginId.trim();
  const isValid = LOGIN_ID_PATTERN.test(trimmedLoginId);

  async function handleSubmit() {
    if (!userId || !isValid) return;
    await changeMutation.mutateAsync({ userId, loginId: trimmedLoginId });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change Login ID"
      description=""
      size="md"
    >
      <div className="space-y-4">
        {changeMutation.error ? (
          <Alert variant="error" title="Login ID update failed">
            {String(changeMutation.error)}
          </Alert>
        ) : null}

        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Current Login ID :</span>{" "}
          <span>{loginIdQuery.data || "-"}</span>
        </div>

        <div className="space-y-2">
          <Input
            label="New Login ID"
            placeholder="Enter Login ID"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
          <div className="text-sm text-slate-500">5-45 characters; no spaces; only @ _ . allowed</div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSubmit()} loading={changeMutation.isPending} disabled={!isValid}>
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
