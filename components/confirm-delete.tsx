"use client";

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
import { Trash2 } from "lucide-react";

interface ConfirmDeleteProps {
  onConfirm: () => void;
  /** override if you want to delete something other than the default label */
  label?: string;
}

export function ConfirmDelete({ onConfirm, label }: ConfirmDeleteProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 dark:text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            aria-label={`מחק ${label ?? ""}`}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Trash2 size={15} strokeWidth={1.8} />
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק{label ? ` את "${label}"` : ""}?{" "}
            פעולה זו בלתי הפיכה.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
          >
            מחק
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
