import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { apiClient } from '../../../api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface ManualInvoiceDialogProps {
  children: React.ReactNode;
  defaultType?: string;
  onSuccess: () => void;
}

export function ManualInvoiceDialog({ children, defaultType = 'sale_bill', onSuccess }: ManualInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    document_type: defaultType,
    invoice_number: '',
    invoice_date: '',
    party_name: '',
    party_gstin: '',
    taxable_value: '',
    cgst_amount: '',
    sgst_amount: '',
    igst_amount: '',
    total_value: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        taxable_value: parseFloat(formData.taxable_value) || 0,
        cgst_amount: parseFloat(formData.cgst_amount) || 0,
        sgst_amount: parseFloat(formData.sgst_amount) || 0,
        igst_amount: parseFloat(formData.igst_amount) || 0,
        total_value: parseFloat(formData.total_value) || 0,
      };

      await apiClient.createInvoice(payload);
      setOpen(false);
      onSuccess();
      setFormData({
        document_type: defaultType,
        invoice_number: '',
        invoice_date: '',
        party_name: '',
        party_gstin: '',
        taxable_value: '',
        cgst_amount: '',
        sgst_amount: '',
        igst_amount: '',
        total_value: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Manual Record</DialogTitle>
            <DialogDescription>
              Create a record without an OCR scan. This will immediately show up in your compliance reports.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="my-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="document_type">Document Type</Label>
              <select
                id="document_type"
                name="document_type"
                value={formData.document_type}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="sale_bill">Sale Bill</option>
                <option value="purchase_bill">Purchase Bill</option>
                <option value="credit_note">Credit Note</option>
                <option value="debit_note">Debit Note</option>
              </select>
            </div>
            
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="invoice_number">Invoice / Doc Number *</Label>
              <Input id="invoice_number" name="invoice_number" required value={formData.invoice_number} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="invoice_date">Date *</Label>
              <Input id="invoice_date" name="invoice_date" type="date" required value={formData.invoice_date} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="party_name">Party / Customer Name *</Label>
              <Input id="party_name" name="party_name" required value={formData.party_name} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="party_gstin">GSTIN (Optional)</Label>
              <Input id="party_gstin" name="party_gstin" value={formData.party_gstin} onChange={handleChange} placeholder="e.g. 29ABCDE1234F1Z5" />
            </div>

            <div className="col-span-2 border-t mt-2 pt-4"><p className="text-sm font-semibold text-gray-700">Financials</p></div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="taxable_value">Taxable Value *</Label>
              <Input id="taxable_value" name="taxable_value" type="number" step="0.01" required value={formData.taxable_value} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="total_value">Total Value *</Label>
              <Input id="total_value" name="total_value" type="number" step="0.01" required value={formData.total_value} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="cgst_amount">CGST Amount</Label>
              <Input id="cgst_amount" name="cgst_amount" type="number" step="0.01" value={formData.cgst_amount} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="sgst_amount">SGST Amount</Label>
              <Input id="sgst_amount" name="sgst_amount" type="number" step="0.01" value={formData.sgst_amount} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="igst_amount">IGST Amount</Label>
              <Input id="igst_amount" name="igst_amount" type="number" step="0.01" value={formData.igst_amount} onChange={handleChange} />
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
