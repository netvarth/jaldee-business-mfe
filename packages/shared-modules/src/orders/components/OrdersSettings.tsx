import { SectionCard } from "@jaldee/design-system";
import { SharedOrdersLayout } from "./shared";

const sections = [
  "Invoice types and order numbering",
  "Delivery profile and courier mapping",
  "Item variants, attributes, and remarks",
  "Store-specific stock and reorder controls",
];

export function OrdersSettings() {
  return (
    <SharedOrdersLayout
      title="Order Settings"
      subtitle="Settings areas generated from the legacy orders module structure."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            The Angular source splits settings across invoice types, delivery profile, item variants, and stock controls.
            This shared module exposes those areas as the next implementation surface.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {section}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </SharedOrdersLayout>
  );
}
