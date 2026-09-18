/**
 * StakeholdersPanel — the buying committee for a single deal.
 *
 * Lists each stakeholder with role, engagement, and last-contacted date, and
 * lets the user add a new stakeholder or change an existing one's engagement
 * inline. Engagement changes save immediately through the update mutation.
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
import { formatDate, initials } from "@/lib/format";
import {
  ENGAGEMENT_LABELS,
  ENGAGEMENT_ORDER,
  type EngagementLevel,
  ROLE_LABELS,
  ROLE_ORDER,
  type Stakeholder,
  type StakeholderRole,
  engagementLabel,
  roleLabel,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { useState } from "react";

export interface StakeholdersPanelProps {
  stakeholders: Stakeholder[];
  isAdding: boolean;
  updatingIndex: number | null;
  errorMessage: string | null;
  onAdd: (stakeholder: Stakeholder) => void;
  onUpdateEngagement: (index: number, engagement: EngagementLevel) => void;
}

const ENGAGEMENT_CHIP: Record<EngagementLevel, string> = {
  high: "signal-low",
  medium: "signal-medium",
  low: "signal-medium",
  none: "signal-high",
};

function StakeholderRow({
  stakeholder,
  index,
  isUpdating,
  onUpdateEngagement,
}: {
  stakeholder: Stakeholder;
  index: number;
  isUpdating: boolean;
  onUpdateEngagement: (index: number, engagement: EngagementLevel) => void;
}) {
  return (
    <li
      className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 first:border-t-0"
      data-ocid={`deal_detail.stakeholder.item.${index + 1}`}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-display text-[11px] font-semibold text-secondary-foreground"
        aria-hidden="true"
      >
        {initials(stakeholder.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {stakeholder.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {roleLabel(stakeholder.role)} · Last contacted{" "}
          {formatDate(stakeholder.lastContacted)}
        </p>
      </div>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
          ENGAGEMENT_CHIP[stakeholder.engagement] ?? "signal-low",
        )}
        data-ocid={`deal_detail.stakeholder.engagement.${index + 1}`}
      >
        {engagementLabel(stakeholder.engagement)}
      </span>

      <div className="flex items-center gap-2">
        {isUpdating && (
          <Loader2
            className="size-3.5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Select
          value={stakeholder.engagement}
          onValueChange={(value) =>
            onUpdateEngagement(index, value as EngagementLevel)
          }
          disabled={isUpdating}
        >
          <SelectTrigger
            size="sm"
            className="w-[132px] rounded-md"
            aria-label={`Update engagement for ${stakeholder.name}`}
            data-ocid={`deal_detail.stakeholder.engagement_select.${index + 1}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENGAGEMENT_ORDER.map((level) => (
              <SelectItem key={level} value={level}>
                {ENGAGEMENT_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}

export function StakeholdersPanel({
  stakeholders,
  isAdding,
  updatingIndex,
  errorMessage,
  onAdd,
  onUpdateEngagement,
}: StakeholdersPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StakeholderRole>(ROLE_ORDER[0]);
  const [engagement, setEngagement] = useState<EngagementLevel>(
    ENGAGEMENT_ORDER[0],
  );

  const canSubmit = name.trim().length > 0 && !isAdding;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const draft: Stakeholder = {
      name: name.trim(),
      role,
      engagement,
      lastContacted: BigInt(Date.now()),
    };
    setName("");
    setRole(ROLE_ORDER[0]);
    setEngagement(ENGAGEMENT_ORDER[0]);
    setShowForm(false);
    onAdd(draft);
  }

  return (
    <section
      className="rounded-lg border border-border bg-card shadow-subtle"
      aria-label="Stakeholders"
      data-ocid="deal_detail.stakeholders_panel"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <UserPlus
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Stakeholders
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm((open) => !open)}
          className="rounded-md"
          data-ocid="deal_detail.add_stakeholder_button"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add stakeholder
        </Button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-b border-border bg-muted/30 px-4 py-4"
          data-ocid="deal_detail.stakeholder_form"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-name">Name</Label>
              <Input
                id="stakeholder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Dana Whitfield"
                className="rounded-md"
                data-ocid="deal_detail.stakeholder_form.name_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as StakeholderRole)}
              >
                <SelectTrigger
                  id="stakeholder-role"
                  className="w-full rounded-md"
                  data-ocid="deal_detail.stakeholder_form.role_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stakeholder-engagement">Engagement</Label>
              <Select
                value={engagement}
                onValueChange={(value) =>
                  setEngagement(value as EngagementLevel)
                }
              >
                <SelectTrigger
                  id="stakeholder-engagement"
                  className="w-full rounded-md"
                  data-ocid="deal_detail.stakeholder_form.engagement_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ENGAGEMENT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="rounded-md"
              data-ocid="deal_detail.stakeholder_form.submit_button"
            >
              {isAdding && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Add stakeholder
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="rounded-md"
              data-ocid="deal_detail.stakeholder_form.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {errorMessage && (
        <p
          className="border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-foreground"
          data-ocid="deal_detail.stakeholders_panel.error_state"
        >
          {errorMessage}
        </p>
      )}

      {stakeholders.length === 0 ? (
        <div
          className="px-4 py-8 text-center"
          data-ocid="deal_detail.stakeholders_panel.empty_state"
        >
          <p className="text-sm text-muted-foreground">
            No stakeholders are recorded for this deal. Add the buying committee
            to make the risk picture complete.
          </p>
        </div>
      ) : (
        <ul>
          {stakeholders.map((stakeholder, index) => (
            <StakeholderRow
              key={`${stakeholder.name}-${index}`}
              stakeholder={stakeholder}
              index={index}
              isUpdating={updatingIndex === index}
              onUpdateEngagement={onUpdateEngagement}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
