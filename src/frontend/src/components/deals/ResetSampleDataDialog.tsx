/**
 * ResetSampleDataDialog — confirmation for regenerating the synthetic dataset.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ResetSampleDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ResetSampleDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: ResetSampleDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-ocid="deals.reset_dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset to sample data?</AlertDialogTitle>
          <AlertDialogDescription>
            This replaces every deal, stakeholder, and risk score with a fresh
            synthetic CRM dataset. Any changes you have made will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-md"
            data-ocid="deals.reset_cancel_button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-md"
            onClick={onConfirm}
            data-ocid="deals.reset_confirm_button"
          >
            Reset data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
