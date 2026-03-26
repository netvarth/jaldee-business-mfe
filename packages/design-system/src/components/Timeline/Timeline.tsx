import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface TimelineEvent {
  date:         string;
  title:        string;
  description?: string;
  icon?:        ReactNode;
  variant?:     "success" | "warning" | "danger" | "info" | "neutral";
}

export interface TimelineProps {
  events:     TimelineEvent[];
  className?: string;
}

const variantMap = {
  success: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  danger:  "bg-red-100   text-red-700   border-red-200",
  info:    "bg-blue-100  text-blue-700  border-blue-200",
  neutral: "bg-gray-100  text-gray-600  border-gray-200",
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div
      data-testid="timeline"
      className={cn("relative", className)}
    >
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-4">
        {events.map((event, i) => (
          <div
            key={i}
            data-testid={`timeline-event-${i}`}
            className="relative flex gap-4 pl-10"
          >
            {/* Icon */}
            <div
              className={cn(
                "absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0",
                variantMap[event.variant ?? "neutral"]
              )}
            >
              {event.icon ?? "•"}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800 m-0">{event.title}</p>
                <time className="text-xs text-gray-400 flex-shrink-0">{event.date}</time>
              </div>
              {event.description && (
                <p className="text-xs text-gray-500 mt-0.5 m-0">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}