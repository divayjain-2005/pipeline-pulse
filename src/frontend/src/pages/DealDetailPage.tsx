/**
 * DealDetailPage — full view of a single deal.
 *
 * Reads the `dealId` route param, loads the deal and its risk record, and
 * composes the header, contributing-signals panel, AI reasoning panel,
 * stakeholder list, activity history, and edit form. Editing, stakeholder
 * changes, reasoning runs, and deletion all go through the shared pipeline
 * hooks so the risk score and forecast stay in sync.
 */

import { Layout } from "@/components/Layout";
import { ActivityHistoryPanel } from "@/components/deal-detail/ActivityHistoryPanel";
import {
  DealDetailError,
  DealDetailSkeleton,
  DealNotFound,
} from "@/components/deal-detail/DealDetailStates";
import { DealEditForm } from "@/components/deal-detail/DealEditForm";
import { DealHeader } from "@/components/deal-detail/DealHeader";
import { ReasoningPanel } from "@/components/deal-detail/ReasoningPanel";
import { RiskSignalsPanel } from "@/components/deal-detail/RiskSignalsPanel";
import { StakeholdersPanel } from "@/components/deal-detail/StakeholdersPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  useAddStakeholder,
  useDeal,
  useDealRisks,
  useDeleteDeal,
  useGenerateDealReasoning,
  useUpdateDeal,
  useUpdateStakeholder,
} from "@/hooks/use-pipeline";
import type { Deal, EngagementLevel, Stakeholder } from "@/lib/pipeline";
import { resultErrorMessage } from "@/lib/pipeline";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

function parseDealId(raw: string | undefined): bigint | null {
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export default function DealDetailPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const dealId = parseDealId(params.dealId);

  const dealQuery = useDeal(dealId);
  const risksQuery = useDealRisks();

  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const addStakeholder = useAddStakeholder();
  const updateStakeholder = useUpdateStakeholder();
  const generateReasoning = useGenerateDealReasoning();

  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null);
  const [reasoningError, setReasoningError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [stakeholderError, setStakeholderError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deal = dealQuery.data ?? null;
  const risk =
    dealId === null
      ? null
      : (risksQuery.data?.find((entry) => entry.dealId === dealId) ?? null);

  const isLoading = dealQuery.isLoading || risksQuery.isLoading;
  const loadError = dealQuery.error ?? risksQuery.error;

  function handleSave(next: Deal) {
    if (dealId === null) return;
    setUpdateError(null);
    updateDeal.mutate(
      { id: dealId, deal: next },
      {
        onSuccess: (result) => {
          const message = resultErrorMessage(result);
          if (message) setUpdateError(message);
        },
        onError: (error) => {
          setUpdateError(
            error instanceof Error
              ? error.message
              : "The deal could not be saved. Please try again.",
          );
        },
      },
    );
  }

  function handleRunReasoning() {
    if (dealId === null) return;
    setReasoningError(null);
    generateReasoning.mutate(dealId, {
      onSuccess: (result) => {
        const message = resultErrorMessage(result);
        if (message) setReasoningError(message);
      },
      onError: (error) => {
        setReasoningError(
          error instanceof Error
            ? error.message
            : "The reasoning could not be generated. Please try again.",
        );
      },
    });
  }

  function handleAddStakeholder(stakeholder: Stakeholder) {
    if (dealId === null) return;
    setStakeholderError(null);
    addStakeholder.mutate(
      { dealId, stakeholder },
      {
        onSuccess: (result) => {
          const message = resultErrorMessage(result);
          if (message) setStakeholderError(message);
        },
        onError: (error) => {
          setStakeholderError(
            error instanceof Error
              ? error.message
              : "The stakeholder could not be added. Please try again.",
          );
        },
      },
    );
  }

  function handleUpdateEngagement(index: number, engagement: EngagementLevel) {
    if (dealId === null || !deal) return;
    const existing = deal.stakeholders[index];
    if (!existing) return;
    setUpdatingIndex(index);
    setStakeholderError(null);
    updateStakeholder.mutate(
      {
        dealId,
        stakeholderIndex: BigInt(index),
        stakeholder: { ...existing, engagement },
      },
      {
        onSuccess: (result) => {
          const message = resultErrorMessage(result);
          if (message) setStakeholderError(message);
        },
        onError: (error) => {
          setStakeholderError(
            error instanceof Error
              ? error.message
              : "The stakeholder could not be updated. Please try again.",
          );
        },
        onSettled: () => setUpdatingIndex(null),
      },
    );
  }

  function handleDelete() {
    if (dealId === null) return;
    setDeleteError(null);
    deleteDeal.mutate(dealId, {
      onSuccess: (result) => {
        const message = resultErrorMessage(result);
        if (message) {
          setDeleteError(message);
          return;
        }
        void navigate({ to: "/deals" });
      },
      onError: (error) => {
        setDeleteError(
          error instanceof Error
            ? error.message
            : "The deal could not be deleted. Please try again.",
        );
      },
    });
  }

  const subtitle = deal ? `${deal.account} · ${deal.owner}` : "Deal detail";

  return (
    <Layout
      title={deal ? deal.name : "Deal detail"}
      subtitle={subtitle}
      actions={
        deal ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md text-destructive hover:text-destructive"
                data-ocid="deal_detail.delete_button"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-ocid="deal_detail.delete_dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deal.name} will be removed from the pipeline along with its
                  risk record. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-xs text-destructive">{deleteError}</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="rounded-md"
                  data-ocid="deal_detail.delete_dialog.cancel_button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteDeal.isPending}
                  className="rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid="deal_detail.delete_dialog.confirm_button"
                >
                  {deleteDeal.isPending ? "Deleting…" : "Delete deal"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined
      }
    >
      <div className="space-y-5" data-ocid="deal_detail.page">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-md text-muted-foreground"
          data-ocid="deal_detail.back_button"
        >
          <Link to="/deals">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to deals
          </Link>
        </Button>

        {isLoading ? (
          <DealDetailSkeleton />
        ) : loadError ? (
          <DealDetailError
            message={
              loadError instanceof Error
                ? loadError.message
                : "The deal could not be loaded."
            }
            onRetry={() => {
              void dealQuery.refetch();
              void risksQuery.refetch();
            }}
          />
        ) : !deal ? (
          <DealNotFound dealId={dealId?.toString() ?? "unknown"} />
        ) : (
          <>
            <DealHeader deal={deal} risk={risk} />

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <RiskSignalsPanel risk={risk} />
                <ReasoningPanel
                  risk={risk}
                  isPending={generateReasoning.isPending}
                  errorMessage={reasoningError}
                  onRun={handleRunReasoning}
                />
              </div>

              <div className="space-y-5">
                <ActivityHistoryPanel deal={deal} />
                <StakeholdersPanel
                  stakeholders={deal.stakeholders}
                  isAdding={addStakeholder.isPending}
                  updatingIndex={updatingIndex}
                  errorMessage={stakeholderError}
                  onAdd={handleAddStakeholder}
                  onUpdateEngagement={handleUpdateEngagement}
                />
              </div>
            </div>

            <DealEditForm
              key={`${deal.id.toString()}-${deal.stage}-${deal.amount.toString()}-${deal.expectedCloseDate.toString()}-${deal.lastActivityDate.toString()}-${deal.notes}`}
              deal={deal}
              isSaving={updateDeal.isPending}
              errorMessage={updateError}
              onSave={handleSave}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
