/**
 * DealDetailStates — loading, not-found, and error surfaces for the deal
 * detail view. Each query region renders one of these instead of a blank area.
 */

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  FileQuestion,
  RefreshCw,
} from "lucide-react";

const SKELETON_IDS = Array.from(
  { length: 8 },
  (_, index) => `deal-detail-skeleton-${index}`,
);

export function DealDetailSkeleton() {
  return (
    <div className="space-y-4" data-ocid="deal_detail.loading_state">
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="space-y-3">
        {SKELETON_IDS.slice(0, 4).map((id) => (
          <Skeleton key={id} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function DealDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
      data-ocid="deal_detail.error_state"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div>
          <p className="font-display text-sm font-semibold text-foreground">
            Could not load this deal
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-md"
            data-ocid="deal_detail.error_state.retry_button"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        )}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-md"
          data-ocid="deal_detail.error_state.back_button"
        >
          <Link to="/deals">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to deals
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DealNotFound({ dealId }: { dealId: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center"
      data-ocid="deal_detail.not_found_state"
    >
      <FileQuestion
        className="size-6 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="font-display text-base font-semibold text-foreground">
        Deal not found
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        No deal matches ID{" "}
        <span className="font-mono text-foreground" data-numeric>
          {dealId}
        </span>
        . It may have been removed from the pipeline.
      </p>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-1 rounded-md"
        data-ocid="deal_detail.not_found_state.back_button"
      >
        <Link to="/deals">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to deals
        </Link>
      </Button>
    </div>
  );
}
