/**
 * AddDealDialog — create a deal from the At-Risk Deals page.
 *
 * The draft is local UI state owned by this dialog. Submitting calls the
 * create mutation; the parent invalidates the pipeline queries so the risk
 * score and forecast refresh. A failed save keeps the draft and shows why.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  type Deal,
  type DealStage,
  OPEN_STAGES,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/pipeline";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { useState } from "react";

export interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  errorMessage: string | null;
  onSubmit: (deal: Deal) => void;
}

/** "yyyy-mm-dd" → epoch ms at local midnight, or null when empty/invalid. */
function fromDateInput(value: string): bigint | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : BigInt(parsed.getTime());
}

const EMPTY_DRAFT = {
  name: "",
  account: "",
  owner: "",
  stage: OPEN_STAGES[0],
  amount: "",
  expectedCloseDate: "",
  lastActivityDate: "",
  notes: "",
};

export function AddDealDialog({
  open,
  onOpenChange,
  isSaving,
  errorMessage,
  onSubmit,
}: AddDealDialogProps) {
  const [name, setName] = useState(EMPTY_DRAFT.name);
  const [account, setAccount] = useState(EMPTY_DRAFT.account);
  const [owner, setOwner] = useState(EMPTY_DRAFT.owner);
  const [stage, setStage] = useState<DealStage>(EMPTY_DRAFT.stage);
  const [amount, setAmount] = useState(EMPTY_DRAFT.amount);
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    EMPTY_DRAFT.expectedCloseDate,
  );
  const [lastActivityDate, setLastActivityDate] = useState(
    EMPTY_DRAFT.lastActivityDate,
  );
  const [notes, setNotes] = useState(EMPTY_DRAFT.notes);

  const amountValue = Number(amount);
  const amountValid =
    amount.trim().length > 0 && Number.isFinite(amountValue) && amountValue > 0;
  const nameValid = name.trim().length > 0;
  const accountValid = account.trim().length > 0;
  const ownerValid = owner.trim().length > 0;
  const canSubmit =
    nameValid && accountValid && ownerValid && amountValid && !isSaving;

  function resetDraft() {
    setName(EMPTY_DRAFT.name);
    setAccount(EMPTY_DRAFT.account);
    setOwner(EMPTY_DRAFT.owner);
    setStage(EMPTY_DRAFT.stage);
    setAmount(EMPTY_DRAFT.amount);
    setExpectedCloseDate(EMPTY_DRAFT.expectedCloseDate);
    setLastActivityDate(EMPTY_DRAFT.lastActivityDate);
    setNotes(EMPTY_DRAFT.notes);
  }

  function handleOpenChange(next: boolean) {
    if (!next && isSaving) return;
    if (!next) resetDraft();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const now = BigInt(Date.now());
    const closeDate = fromDateInput(expectedCloseDate) ?? now;
    const lastActivity = fromDateInput(lastActivityDate) ?? now;
    onSubmit({
      id: 0n,
      name: name.trim(),
      account: account.trim(),
      owner: owner.trim(),
      stage,
      amount: BigInt(Math.round(amountValue)),
      expectedCloseDate: closeDate,
      lastActivityDate: lastActivity,
      notes: notes.trim(),
      createdDate: now,
      closeDatePushes: 0n,
      activityLast30Days: 0n,
      activityPrior30Days: 0n,
      stakeholders: [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-lg sm:max-w-2xl"
        data-ocid="deals.add_dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Add a deal</DialogTitle>
          <DialogDescription>
            New deals enter the pipeline immediately and are scored on the next
            forecast refresh.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-deal-name">Deal name</Label>
              <Input
                id="add-deal-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Enterprise renewal"
                aria-invalid={!nameValid}
                className="rounded-md"
                data-ocid="deals.add_form.name_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-deal-account">Account</Label>
              <Input
                id="add-deal-account"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="e.g. Northwind Logistics"
                aria-invalid={!accountValid}
                className="rounded-md"
                data-ocid="deals.add_form.account_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-deal-owner">Owner</Label>
              <Input
                id="add-deal-owner"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="e.g. Priya Raman"
                aria-invalid={!ownerValid}
                className="rounded-md"
                data-ocid="deals.add_form.owner_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-deal-stage">Stage</Label>
              <Select
                value={stage}
                onValueChange={(value) => setStage(value as DealStage)}
              >
                <SelectTrigger
                  id="add-deal-stage"
                  className="w-full rounded-md"
                  data-ocid="deals.add_form.stage_select"
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
              <Label htmlFor="add-deal-amount">Amount (USD)</Label>
              <Input
                id="add-deal-amount"
                type="number"
                min={1}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 120000"
                aria-invalid={!amountValid}
                className="rounded-md font-mono"
                data-ocid="deals.add_form.amount_input"
              />
              {!amountValid && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="deals.add_form.amount_error"
                >
                  Enter an amount greater than zero.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-deal-expected-close">
                Expected close date
              </Label>
              <Input
                id="add-deal-expected-close"
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
                className="rounded-md"
                data-ocid="deals.add_form.expected_close_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-deal-last-activity">Last activity date</Label>
              <Input
                id="add-deal-last-activity"
                type="date"
                value={lastActivityDate}
                onChange={(event) => setLastActivityDate(event.target.value)}
                className="rounded-md"
                data-ocid="deals.add_form.last_activity_input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-deal-notes">Notes</Label>
            <Textarea
              id="add-deal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Context the team should know about this deal"
              className="rounded-md"
              data-ocid="deals.add_form.notes_textarea"
            />
          </div>

          {errorMessage && (
            <div
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
              data-ocid="deals.add_form.error_state"
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

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
              className="rounded-md"
              data-ocid="deals.add_form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="rounded-md"
              data-ocid="deals.add_form.submit_button"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              {isSaving ? "Adding…" : "Add deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
