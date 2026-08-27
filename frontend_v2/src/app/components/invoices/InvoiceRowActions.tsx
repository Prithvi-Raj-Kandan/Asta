import { useState } from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { apiClient } from '../../../api/client';
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
} from '../ui/alert-dialog';

interface InvoiceRowActionsProps {
  invoiceId: string;
  sourceType: string;
  onDeleteSuccess: () => void;
}

export function InvoiceRowActions({ invoiceId, sourceType, onDeleteSuccess }: InvoiceRowActionsProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.deleteInvoice(invoiceId);
      onDeleteSuccess();
    } catch (err) {
      console.error('Failed to delete invoice', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1 min-w-[124px]">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" title="Delete Invoice">
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice, its line items, associated documents, and the source file from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
