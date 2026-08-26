import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { apiClient, InvoiceRow } from '../../api/client';

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
  paymentStatus: 'paid' | 'pending' | 'overdue';
  documentRef: string;
};

export function PurchasesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PurchaseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          paymentStatus: row.status === 'confirmed' ? 'paid' : 'pending' as const,
          documentRef: row.id,
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

  const filteredPurchases = useMemo(() => rows.filter(purchase =>
    purchase.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.vendorGSTIN.toLowerCase().includes(searchQuery.toLowerCase())
  ), [rows, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
              <Button variant="outline" size="sm" disabled title="Filter is not available yet">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" onClick={() => navigate('/upload')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Purchase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by bill number, vendor name, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading purchase rows...</div>
            ) : (
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Bill No.</TableHead>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="w-[180px]">Vendor</TableHead>
                    <TableHead className="w-[160px]">GSTIN</TableHead>
                    <TableHead className="w-[120px]">Items</TableHead>
                    <TableHead className="w-[70px] text-right">Qty</TableHead>
                    <TableHead className="w-[110px] text-right">Amount</TableHead>
                    <TableHead className="w-[110px] text-right">Total</TableHead>
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
                        <div className="flex items-center justify-end gap-1 min-w-[124px]">
                          <Button variant="ghost" size="sm" disabled title="View is not available yet">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled title="Edit is not available yet">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled title="Delete is not available yet">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
