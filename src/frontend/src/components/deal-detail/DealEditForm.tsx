/**
 * DealEditForm — edit the deal's stage, amount, expected close date, last
 * activity date, and notes.
 *
 * The draft is local UI state seeded once from the loaded deal. Saving calls
 * the update mutation; the parent invalidates the pipeline queries so the risk
 * score and forecast refresh. A failed save keeps the draft and shows why.
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
import { Textarea } from "@/components/ui/textarea";
import { toDate } from "@/lib/format";
import {
  type Deal,
  type DealStage,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/pipeline";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useState } from "react";

export interface DealEditFormProps {
  deal: Deal;
  isSaving: boolean;
  errorMessage: string | null;
  onSave: (deal: Deal) => void;
}

/** Epoch ms → "yyyy-mm-dd" for a native date input. */
function toDateInput(value: bigint): string {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "yyyy-mm-dd" → epoch ms at local midnight. */
function fromDateInput(value: string, fallback: bigint): bigint {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : BigInt(parsed.getTime());
}

export function DealEditForm({
  deal,
  isSaving,
  errorMessage,
  onSave,
}: DealEditFormProps) {
  const [stage, setStage] = useState<DealStage>(deal.stage);
  const [amount, setAmount] = useState(deal.amount.toString());
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    toDateInput(deal.expectedCloseDate),
  );
  const [lastActivityDate, setLastActivityDate] = useState(
    toDateInput(deal.lastActivityDate),
  );
  const [notes, setNotes] = useState(deal.notes);

  const amountValue = Number(amount);
  const amountValid =
    amount.trim().length > 0 && Number.isFinite(amountValue) && amountValue > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amountValid || isSaving) return;
    onSave({
      ...deal,
      stage,
      amount: BigInt(Math.round(amountValue)),
      expectedCloseDate: fromDateInput(
        expectedCloseDate,
        deal.expectedCloseDate,
      ),
      lastActivityDate: fromDateInput(lastActivityDate, deal.lastActivityDate),
      notes: notes.trim(),
    });
  }

  return (
    <section
      className="rounded-lg border border-border bg-card shadow-subtle"
      aria-label="Edit deal"
      data-ocid="deal_detail.edit_panel"
    >
      <header className="border-b border-border px-4 py-3">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Edit deal
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Saving re-scores the deal and refreshes the forecast.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="deal-stage">Stage</Label>
            <Select
              value={stage}
              onValueChange={(value) => setStage(value as DealStage)}
            >
              <SelectTrigger
                id="deal-stage"
                className="w-full rounded-md"
                data-ocid="deal_detail.edit_form.stage_select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STAGE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-amount">Amount (USD)</Label>
            <Input
              id="deal-amount"
              type="number"
              min={1}
              step={1000}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={!amountValid}
              className="rounded-md font-mono"
              data-ocid="deal_detail.edit_form.amount_input"
            />
            {!amountValid && (
              <p
                className="text-xs text-destructive"
                data-ocid="deal_detail.edit_form.amount_error"
              >
                Enter an amount greater than zero.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-expected-close">Expected close date</Label>
            <Input
              id="deal-expected-close"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
              className="rounded-md"
              data-ocid="deal_detail.edit_form.expected_close_input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-last-activity">Last activity date</Label>
            <Input
              id="deal-last-activity"
              type="date"
              value={lastActivityDate}
              onChange={(event) => setLastActivityDate(event.target.value)}
              className="rounded-md"
              data-ocid="deal_detail.edit_form.last_activity_input"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deal-notes">Notes</Label>
          <Textarea
            id="deal-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Context the team should know about this deal"
            className="rounded-md"
            data-ocid="deal_detail.edit_form.notes_textarea"
          />
        </div>

        {errorMessage && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            data-ocid="deal_detail.edit_form.error_state"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-foreground">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={!amountValid || isSaving}
            className="rounded-md"
            data-ocid="deal_detail.edit_form.save_button"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
