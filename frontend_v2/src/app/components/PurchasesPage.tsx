import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient, InvoiceRow } from '../../api/client';
import { InvoiceRowActions } from './invoices/InvoiceRowActions';
import { ManualInvoiceDialog } from './invoices/ManualInvoiceDialog';
import { ListToolbar, FilterOptions } from './invoices/ListToolbar';

type PurchaseRecord = {
  id: string;
  billNo: string;
  date: string;
  vendorName: string;
  vendorGSTIN: string;
  items: string;
  quantity: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  paymentStatus: string;
  documentRef: string;
  sourceType: string;
};

export function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: sessionStorage.getItem('purchases-list-sort') || 'date',
    sortDirection: (sessionStorage.getItem('purchases-list-sortDir') as 'asc' | 'desc') || 'desc',
  });

  useEffect(() => {
    void loadPurchases();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadPurchases();
    };

    window.addEventListener('app:data-updated', refresh);
    return () => window.removeEventListener('app:data-updated', refresh);
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await apiClient.listInvoices();
      const purchaseRows = (Array.isArray(data) ? data : [])
        .filter((row: InvoiceRow) => {
          const type = (row.document_type || '').toLowerCase();
          return type === 'purchase_bill' || type === 'purchase_invoice';
        })
        .map((row: InvoiceRow) => ({
          id: row.id,
          billNo: row.invoice_number || '-',
          date: row.invoice_date || '-',
          vendorName: row.party_name || '-',
          vendorGSTIN: row.party_gstin || '-',
          items: row.document_type.replace('_', ' '),
          quantity: 1,
          amount: row.taxable_value || 0,
          cgst: row.cgst_amount || 0,
          sgst: row.sgst_amount || 0,
          igst: row.igst_amount || 0,
          totalAmount: row.total_value || 0,
          paymentStatus: row.status,
          documentRef: row.id,
          sourceType: row.source_type,
        }));

      setRows(purchaseRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase rows');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    let result = rows.filter(purchase => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !searchLower || 
        purchase.billNo.toLowerCase().includes(searchLower) ||
        purchase.vendorName.toLowerCase().includes(searchLower) ||
        purchase.vendorGSTIN.toLowerCase().includes(searchLower);

      const matchesStatus = filters.status === 'all' || purchase.paymentStatus === filters.status;

      let matchesDate = true;
      if (filters.dateFrom && purchase.date && purchase.date !== '-') {
        matchesDate = matchesDate && new Date(purchase.date) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo && purchase.date && purchase.date !== '-') {
        matchesDate = matchesDate && new Date(purchase.date) <= new Date(filters.dateTo);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    result.sort((a, b) => {
      let valA: any = a.date !== '-' ? a.date : '';
      let valB: any = b.date !== '-' ? b.date : '';

      switch (filters.sortBy) {
        case 'total':
          valA = a.totalAmount || 0;
          valB = b.totalAmount || 0;
          break;
        case 'party_name':
          valA = a.vendorName.toLowerCase();
          valB = b.vendorName.toLowerCase();
          break;
        case 'invoice_number':
          valA = a.billNo.toLowerCase();
          valB = b.billNo.toLowerCase();
          break;
        case 'date':
        default:
          valA = a.date !== '-' ? a.date : '';
          valB = b.date !== '-' ? b.date : '';
          break;
      }

      if (valA < valB) return filters.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return filters.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, filters]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid/Confirmed</Badge>;
      case 'review_required':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Review</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSort = (field: string) => {
    setFilters((prev) => {
      const isAsc = prev.sortBy === field && prev.sortDirection === 'asc';
      return { ...prev, sortBy: field, sortDirection: isAsc ? 'desc' : 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline-block text-gray-400" />;
    return filters.sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline-block" /> : <ArrowDown className="w-3 h-3 ml-1 inline-block" />;
  };

  const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Purchases</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalPurchases.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Records</CardTitle>
              <CardDescription>Complete database of all purchase transactions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ManualInvoiceDialog defaultType="purchase_bill" onSuccess={loadPurchases}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Purchase
                </Button>
              </ManualInvoiceDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <ListToolbar filters={filters} onFilterChange={setFilters} pageKey="purchases-list" />

          <div className="border rounded-lg">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading purchase rows...</div>
            ) : (
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('invoice_number')}>
                      Bill No. <SortIcon field="invoice_number" />
                    </TableHead>
                    <TableHead className="w-[110px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('date')}>
                      Date <SortIcon field="date" />
                    </TableHead>
                    <TableHead className="w-[180px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('party_name')}>
                      Vendor <SortIcon field="party_name" />
                    </TableHead>
                    <TableHead className="w-[160px]">GSTIN</TableHead>
                    <TableHead className="w-[120px]">Items</TableHead>
                    <TableHead className="w-[70px] text-right">Qty</TableHead>
                    <TableHead className="w-[110px] text-right">Amount</TableHead>
                    <TableHead className="w-[110px] text-right cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total')}>
                      Total <SortIcon field="total" />
                    </TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium max-w-[130px] truncate">{purchase.billNo}</TableCell>
                      <TableCell>{purchase.date}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={purchase.vendorName}>{purchase.vendorName}</TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[160px] truncate" title={purchase.vendorGSTIN}>{purchase.vendorGSTIN}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{purchase.items}</TableCell>
                      <TableCell className="text-right">{purchase.quantity}</TableCell>
                      <TableCell className="text-right">₹{purchase.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">₹{purchase.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(purchase.paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <InvoiceRowActions invoiceId={purchase.id} sourceType={purchase.sourceType} onDeleteSuccess={loadPurchases} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {rows.length === 0 && !loading && (
              <div className="border-t p-4 text-sm text-gray-500">
                No purchase rows exist yet. Create one manually or upload a purchase bill document.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Showing {filteredPurchases.length} of {rows.length} records</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
