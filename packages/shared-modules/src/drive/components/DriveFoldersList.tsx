import { useMemo, useState } from "react";
import { Button, EmptyState, Input, SkeletonTable } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useDriveFolders } from "../queries/drive";
import { DrivePageShell, FolderGlyph } from "./shared";

type DriveFoldersListProps = {
  type: "staff" | "customers";
};

export function DriveFoldersList({ type }: DriveFoldersListProps) {
  const [search, setSearch] = useState("");
  const { account, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const isStaff = type === "staff";
  const label = isStaff ? account.labels.staff || "Staff member" : account.labels.customer || "Customer";
  const folderName = isStaff ? "public" : "shared";
  const folders = useDriveFolders(folderName);

  const filteredFolders = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return folders.data ?? [];
    return (folders.data ?? []).filter((folder) => folder.name.toLowerCase().includes(text));
  }, [folders.data, search]);

  return (
    <DrivePageShell
      title={`${label}s Folders/Files`}
      subtitle={`Manage the files uploaded by the ${label}s!`}
      onBack={() => navigate(`${basePath}/shared`)}
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-end border-b border-slate-100 px-5 py-4">
          <Input
            className="h-10"
            containerClassName="max-w-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${label}`}
            value={search}
          />
        </div>

        {folders.isLoading && <SkeletonTable rows={4} columns={2} />}

        {folders.isError && (
          <EmptyState
            title="Folders could not load"
            description="The drive folders API returned an error."
            action={<Button onClick={() => folders.refetch()}>Retry</Button>}
          />
        )}

        {!folders.isLoading && !folders.isError && filteredFolders.length === 0 && (
          <EmptyState title="No folders found" description={`No ${label.toLowerCase()} folders are available.`} />
        )}

        {!folders.isLoading && !folders.isError && filteredFolders.length > 0 && (
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-sm text-slate-950">
                <th className="px-5 py-4 font-semibold">Folders</th>
                <th className="px-5 py-4 font-semibold">Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredFolders.map((folder) => (
                <tr key={folder.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                  <td className="px-5 py-5">
                    <button
                      className="inline-flex items-center gap-3 text-left font-medium text-slate-950 hover:text-violet-700"
                      onClick={() =>
                        navigate(`${basePath}/shared/${type}/${encodeURIComponent(folder.id)}?name=${encodeURIComponent(folder.name)}`)
                      }
                      type="button"
                    >
                      <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50">
                        <FolderGlyph className="h-3.5 w-5 rounded-sm" />
                      </span>
                      <span className="min-w-0 truncate">{folder.name}</span>
                    </button>
                  </td>
                  <td className="px-5 py-5 text-slate-950">{folder.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DrivePageShell>
  );
}
