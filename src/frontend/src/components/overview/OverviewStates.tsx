/**
 * OverviewStates — shared loading, empty, and error surfaces for the
 * leadership dashboard. Every query on the Overview page renders one of these
 * instead of a blank region.
 */

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

const SKELETON_IDS = Array.from(
  { length: 6 },
  (_, index) => `overview-skeleton-${index}`,
);

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  const ids = SKELETON_IDS.slice(0, rows);
  return (
    <div className="space-y-3" data-ocid="overview.loading_state">
      {ids.map((id) => (
        <Skeleton key={id} className="h-9 w-full rounded-md" />
      ))}
    </div>
  );
}

export function PanelError({
  message,
  onRetry,
  ocid = "overview.error_state",
}: {
  message: string;
  onRetry?: () => void;
  ocid?: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
      data-ocid={ocid}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed text-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="rounded-md"
          data-ocid={`${ocid}.retry_button`}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function PanelEmpty({
  title,
  description,
  ocid = "overview.empty_state",
}: {
  title: string;
  description: string;
  ocid?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-6 py-10 text-center"
      data-ocid={ocid}
    >
      <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="font-display text-sm font-semibold text-foreground">
        {title}
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
