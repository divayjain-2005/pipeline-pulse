/**
 * DealsFilterBar — stage / owner / risk bucket / amount-range filters.
 *
 * Fully controlled: every value comes from the page's URL search state and
 * every change is written straight back to the URL.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DealStage,
  RISK_LABELS,
  RISK_ORDER,
  type RiskBucket,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/pipeline";
import { X } from "lucide-react";

const ALL = "all";

export interface DealsFilterBarProps {
  stage: DealStage | null;
  owner: string | null;
  bucket: RiskBucket | null;
  minAmount: string;
  maxAmount: string;
  owners: string[];
  onStageChange: (value: DealStage | null) => void;
  onOwnerChange: (value: string | null) => void;
  onBucketChange: (value: RiskBucket | null) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function DealsFilterBar({
  stage,
  owner,
  bucket,
  minAmount,
  maxAmount,
  owners,
  onStageChange,
  onOwnerChange,
  onBucketChange,
  onMinAmountChange,
  onMaxAmountChange,
  onClear,
  hasActiveFilters,
}: DealsFilterBarProps) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
      aria-label="Filter deals"
      data-ocid="deals.filter_panel"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[10rem] flex-col gap-1.5">
          <Label htmlFor="deals-filter-stage" className="label-section">
            Stage
          </Label>
          <Select
            value={stage ?? ALL}
            onValueChange={(value) =>
              onStageChange(value === ALL ? null : (value as DealStage))
            }
          >
            <SelectTrigger
              id="deals-filter-stage"
              className="w-full rounded-md"
              data-ocid="deals.filter.stage"
            >
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All stages</SelectItem>
              {STAGE_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {STAGE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[10rem] flex-col gap-1.5">
          <Label htmlFor="deals-filter-owner" className="label-section">
            Owner
          </Label>
          <Select
            value={owner ?? ALL}
            onValueChange={(value) =>
              onOwnerChange(value === ALL ? null : value)
            }
          >
            <SelectTrigger
              id="deals-filter-owner"
              className="w-full rounded-md"
              data-ocid="deals.filter.owner"
            >
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All owners</SelectItem>
              {owners.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[10rem] flex-col gap-1.5">
          <Label htmlFor="deals-filter-bucket" className="label-section">
            Risk bucket
          </Label>
          <Select
            value={bucket ?? ALL}
            onValueChange={(value) =>
              onBucketChange(value === ALL ? null : (value as RiskBucket))
            }
          >
            <SelectTrigger
              id="deals-filter-bucket"
              className="w-full rounded-md"
              data-ocid="deals.filter.bucket"
            >
              <SelectValue placeholder="All risk levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All risk levels</SelectItem>
              {RISK_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {RISK_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deals-filter-min" className="label-section">
            Amount range
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="deals-filter-min"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="Min"
              value={minAmount}
              onChange={(event) => onMinAmountChange(event.target.value)}
              className="w-28 rounded-md font-mono tabular-nums"
              data-ocid="deals.filter.min_amount"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              id="deals-filter-max"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="Max"
              value={maxAmount}
              onChange={(event) => onMaxAmountChange(event.target.value)}
              className="w-28 rounded-md font-mono tabular-nums"
              data-ocid="deals.filter.max_amount"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!hasActiveFilters}
            className="rounded-md"
            data-ocid="deals.filter.clear_button"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      </div>
    </section>
  );
}
