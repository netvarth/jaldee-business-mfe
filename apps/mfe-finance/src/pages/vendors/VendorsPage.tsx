import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Popover,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { FinanceFeatureLayout } from "../../components/FinancePageLayout";

export default function VendorsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Array<{
    id: string;
    date: string;
    name: string;
    category: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadVendors() {
      setLoading(true);
      try {
        const response = await financeApi.vendors.search<any>({
          page: page - 1,
          size: pageSize,
          sort: [
            {
              field: "createdAt",
              direction: "DESC",
            },
          ],
          view: "SUMMARY",
        });

        if (!active) {
          return;
        }

        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.content)
            ? (response.data as any).content
            : Array.isArray((response.data as any)?.data)
              ? (response.data as any).data
              : Array.isArray((response.data as any)?.data?.content)
                ? (response.data as any).data.content
                : [];

        setTotalRecords(Number((response.data as any)?.totalElements ?? (response.data as any)?.total ?? records.length ?? 0) || 0);
        setVendors(
          records.map((item: any, index: number) => {
            const rawDate = item.createdDate ?? item.createdOn ?? item.createdAt ?? item.updatedDate ?? item.date;
            return {
              id: String(item.uid ?? item.id ?? item.vendorId ?? `vendor-${index}`),
              date: rawDate
                ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "-",
              name: String(item.name ?? item.vendorName ?? "-"),
              category: String(item.vendorCategoryName ?? item.categoryName ?? item.vendorCategory ?? item.category ?? "-"),
              status: String(item.vendorStatusName ?? item.statusName ?? item.vendorStatus ?? item.status ?? "-"),
            };
          }),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendors", error);
        if (active) {
          setVendors([]);
          setTotalRecords(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVendors();
    return () => {
      active = false;
    };
  }, [page, pageSize]);

  const columns = useMemo<ColumnDef<(typeof vendors)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "status", header: "Status" },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(row.id)}>
              View
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 text-slate-700"
                  aria-label={`More actions for ${row.name}`}
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                >
                </Button>
              }
            >
              <div className="grid min-w-[200px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => navigate(`edit/${row.id}`)}
                >
                  Edit
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Vendors"
      subtitle="Vendor directory for finance operations."
      actions={<Button onClick={() => navigate("create")}>Create Vendor</Button>}
      main={
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 text-xl font-semibold text-slate-900">{`Vendors(${vendors.length})`}</div>
          <DataTable
            data={vendors}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            pagination={{
              page,
              pageSize,
              total: totalRecords,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No vendors" description={loading ? "Loading vendors..." : "Vendor records will appear here."} />}
          />
        </SectionCard>
      }
    />
  );
}
