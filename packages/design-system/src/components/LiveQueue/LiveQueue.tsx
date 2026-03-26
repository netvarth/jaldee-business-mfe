import { cn } from "../../utils";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";

export interface LiveQueueItem {
  id: string;
  token: string;
  name: string;
  status: "waiting" | "in-progress" | "done" | "critical" | "on-hold";
  subtitle?: string;
  eta?: string;
}

export interface LiveQueueProps {
  title?: string;
  currentToken?: string;
  currentLabel?: string;
  items: LiveQueueItem[];
  onCallNext?: () => void;
  onRecall?: (item: LiveQueueItem) => void;
  onHold?: (item: LiveQueueItem) => void;
  className?: string;
  "data-testid"?: string;
}

const statusVariantMap = {
  waiting: "warning",
  "in-progress": "info",
  done: "success",
  critical: "danger",
  "on-hold": "neutral",
} as const;

export function LiveQueue({
  title = "Live Queue",
  currentToken,
  currentLabel,
  items,
  onCallNext,
  onRecall,
  onHold,
  className,
  "data-testid": testId = "live-queue",
}: LiveQueueProps) {
  return (
    <section
      data-testid={testId}
      className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
        <div>
          <h3 className="m-0 text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentToken
              ? `Now serving ${currentToken}${currentLabel ? ` - ${currentLabel}` : ""}`
              : "Queue is waiting for the next call"}
          </p>
        </div>
        {onCallNext && (
          <Button size="sm" onClick={onCallNext} data-testid={`${testId}-call-next`}>
            Call Next
          </Button>
        )}
      </header>

      <div className="divide-y divide-gray-100">
        {items.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-500">No tokens in queue.</div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`${testId}-item-${item.id}`}
            className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 min-w-[52px] items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-800">
                {item.token}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-sm font-semibold text-gray-900">{item.name}</p>
                  <Badge variant={statusVariantMap[item.status]} dot>
                    {item.status}
                  </Badge>
                </div>
                {(item.subtitle || item.eta) && (
                  <p className="mt-1 text-xs text-gray-500">
                    {item.subtitle}
                    {item.subtitle && item.eta ? " . " : ""}
                    {item.eta ? `ETA ${item.eta}` : ""}
                  </p>
                )}
              </div>
            </div>

            {(onRecall || onHold) && (
              <div className="flex flex-wrap items-center gap-2">
                {onRecall && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecall(item)}
                    data-testid={`${testId}-recall-${item.id}`}
                  >
                    Recall
                  </Button>
                )}
                {onHold && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onHold(item)}
                    data-testid={`${testId}-hold-${item.id}`}
                  >
                    Hold
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
