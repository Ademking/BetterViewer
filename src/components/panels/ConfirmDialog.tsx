import { create } from "zustand";
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

interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

const useConfirmStore = create<{ request: ConfirmRequest | null }>()(() => ({
  request: null,
}));

/** Ask for confirmation before a destructive action. */
export const confirmAction = (request: ConfirmRequest) =>
  useConfirmStore.setState({ request });

export function ConfirmDialog() {
  const request = useConfirmStore((s) => s.request);
  const close = () => useConfirmStore.setState({ request: null });
  return (
    <AlertDialog onOpenChange={(d) => !d.open && close()} open={!!request}>
      <AlertDialogContent className="glass" size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              request?.onConfirm();
              close();
            }}
            size="sm"
            variant={request?.destructive ? "destructive" : "default"}
          >
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
