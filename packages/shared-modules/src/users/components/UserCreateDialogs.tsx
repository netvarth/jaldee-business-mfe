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
import { useAssignUserLocations, useChangeUserLoginId, useCreateUser, useUserDepartments, useUserDetail, useUserLocations, useUserLoginId } from "../queries/users";
import type { CreateUserInput } from "../types";

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
      data-testid="dlgCreateUser_SM_Users"
    >
      <div className="space-y-4">
        {createMutation.error ? (
          <Alert variant="danger" title="User creation failed">
            {String(createMutation.error)}
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id="txtCreateFirstName_SM_Users"
            data-testid="txtCreateFirstName_SM_Users"
            label="First Name"
            value={values.firstName}
            onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
          />
          <Input
            id="txtCreateLastName_SM_Users"
            data-testid="txtCreateLastName_SM_Users"
            label="Last Name"
            value={values.lastName}
            onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
          />
          <Input
            id="txtCreateEmail_SM_Users"
            data-testid="txtCreateEmail_SM_Users"
            label="Email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            id="txtCreateEmployeeId_SM_Users"
            data-testid="txtCreateEmployeeId_SM_Users"
            label="Employee ID"
            value={values.employeeId}
            onChange={(event) => setValues((current) => ({ ...current, employeeId: event.target.value }))}
          />
          <Select
            label="User Type"
            testId="selectCreateUserType_SM_Users"
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
            testId="selectCreateDepartment_SM_Users"
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
            id="phoneCreatePhone_SM_Users"
            data-testid="phoneCreatePhone_SM_Users"
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
        <Button
          variant="ghost"
          id="btnCancelCreateUser_SM_Users"
          data-testid="btnCancelCreateUser_SM_Users"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          id="btnSubmitCreateUser_SM_Users"
          data-testid="btnSubmitCreateUser_SM_Users"
          data-state={createMutation.isPending ? "loading" : "ready"}
          onClick={() => void handleSubmit()}
          loading={createMutation.isPending}
        >
          Create User
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
      data-testid="dlgAssignLocations_SM_Users"
    >
      <div className="space-y-4">
        {assignMutation.error ? (
          <Alert variant="danger" title="Location assignment failed">
            {String(assignMutation.error)}
          </Alert>
        ) : null}

        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">Select Locations *</div>
          <div className="space-y-2" data-testid="listAssignLocations_SM_Users">
            {(locationsQuery.data ?? []).map((location) => {
              const checked = selectedLocationIds.includes(location.id);
              return (
                <label
                  key={location.id}
                  data-testid={`chkLocation_${location.id}_SM_Users`}
                  data-state={checked ? "checked" : "unchecked"}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleLocation(location.id)}
                    aria-label={location.name}
                  />
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
        <Button
          variant="ghost"
          id="btnCancelAssignLocations_SM_Users"
          data-testid="btnCancelAssignLocations_SM_Users"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          id="btnSaveAssignLocations_SM_Users"
          data-testid="btnSaveAssignLocations_SM_Users"
          data-state={assignMutation.isPending ? "loading" : !selectedLocationIds.length ? "disabled" : "ready"}
          onClick={() => void handleSubmit()}
          loading={assignMutation.isPending}
          disabled={!selectedLocationIds.length || detailQuery.isLoading}
        >
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
      data-testid="dlgChangeLoginId_SM_Users"
    >
      <div className="space-y-4">
        {changeMutation.error ? (
          <Alert variant="danger" title="Login ID update failed">
            {String(changeMutation.error)}
          </Alert>
        ) : null}

        <div className="text-sm text-slate-600" data-testid="txtCurrentLoginId_SM_Users">
          <span className="font-medium text-slate-700">Current Login ID :</span>{" "}
          <span>{loginIdQuery.data || "-"}</span>
        </div>

        <div className="space-y-2">
          <Input
            id="txtNewLoginId_SM_Users"
            data-testid="txtNewLoginId_SM_Users"
            label="New Login ID"
            placeholder="Enter Login ID"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
          <div className="text-sm text-slate-500">5-45 characters; no spaces; only @ _ . allowed</div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          id="btnCancelChangeLoginId_SM_Users"
          data-testid="btnCancelChangeLoginId_SM_Users"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          id="btnSaveChangeLoginId_SM_Users"
          data-testid="btnSaveChangeLoginId_SM_Users"
          data-state={changeMutation.isPending ? "loading" : !isValid ? "disabled" : "ready"}
          onClick={() => void handleSubmit()}
          loading={changeMutation.isPending}
          disabled={!isValid}
        >
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
