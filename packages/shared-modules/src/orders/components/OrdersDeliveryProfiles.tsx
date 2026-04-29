import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Icon,
  PageHeader,
  SectionCard,
  Switch,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useOrdersDeliveryProfiles,
  useOrdersDeliveryProfilesCount,
  useUpdateOrdersDeliveryProfileStatus,
} from "../queries/orders";
import {
  buildOrdersDeliveryProfileCreateHref,
  buildOrdersDeliveryProfileDetailsHref,
  buildOrdersDeliveryProfileEditHref,
} from "../services/orders";
import { AssignDeliveryProfileDialog } from "./AssignDeliveryProfileDialog";
import { SharedOrdersLayout } from "./shared";

export function OrdersDeliveryProfiles() {
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [searchName, setSearchName] = useState("");
  
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "deliveryProfiles",
    defaultPageSize: 10,
  });

  const { data: profiles, isLoading } = useOrdersDeliveryProfiles(page, pageSize, { name: searchName });
  const { data: totalCount } = useOrdersDeliveryProfilesCount({ name: searchName });

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ encId: string; name: string } | null>(null);

  const statusMutation = useUpdateOrdersDeliveryProfileStatus(""); // Dummy ID, will be overridden in mutate

  const handleStatusToggle = (encId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    statusMutation.mutate(nextStatus, {
      onSuccess: () => {}, // Query invalidation handled in hook
    });
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Profile Name",
        render: (row: any) => (
          <button
            className="font-medium text-indigo-600 hover:underline"
            onClick={() => navigate(buildOrdersDeliveryProfileDetailsHref(basePath, row.encId, product))}
          >
            {row.name}
          </button>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: any) => (
          <div className="flex items-center gap-3">
            <Badge variant={row.status === "Active" ? "success" : "secondary"}>
              {row.status}
            </Badge>
            <Switch
              checked={row.status === "Active"}
              onCheckedChange={() => handleStatusToggle(row.encId, row.status)}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-20",
        render: (row: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProfile({ encId: row.encId, name: row.name });
                setAssignDialogOpen(true);
              }}
            >
              <Icon name="link" className="mr-2 h-4 w-4" />
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(buildOrdersDeliveryProfileEditHref(basePath, row.encId, product))}
            >
              <Icon name="edit" className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [basePath, navigate]
  );

  return (
    <SharedOrdersLayout
      title="Delivery Profiles"
      subtitle="Configure delivery rules and shipping fees."
      actions={
        <Button
          variant="primary"
          onClick={() => navigate(buildOrdersDeliveryProfileCreateHref(basePath, product))}
        >
          <Icon name="plus" className="mr-2 h-4 w-4" />
          Create Profile
        </Button>
      }
    >
      <div className="space-y-6">
        <SectionCard>
          <div className="mb-4">
             <input
                type="text"
                placeholder="Search with name..."
                className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={searchName}
                onChange={(e) => {
                    setSearchName(e.target.value);
                    setPage(1);
                }}
             />
          </div>

          <DataTable
            columns={columns}
            data={profiles ?? []}
            isLoading={isLoading}
            pagination={{
              page,
              pageSize,
              total: totalCount ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
          />
        </SectionCard>

        <AssignDeliveryProfileDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          profileEncId={selectedProfile?.encId ?? null}
          profileName={selectedProfile?.name ?? null}
        />
      </div>
    </SharedOrdersLayout>
  );
}
