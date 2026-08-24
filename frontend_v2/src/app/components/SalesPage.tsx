import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Download, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { apiClient, InvoiceRow } from '../../api/client';
import { toast } from 'sonner';

export function SalesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void loadSales();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadSales();
    };

    window.addEventListener('app:data-updated', refresh);
    return () => window.removeEventListener('app:data-updated', refresh);
  }, []);

  const loadSales = async () => {
    try {
      const data = await apiClient.listInvoices();
      const invoiceRows = Array.isArray(data) ? data : [];
      setRows(invoiceRows.filter((row) => {
        const type = (row.document_type || '').toLowerCase();
        return type === 'sale_bill' || type === 'sales_invoice' || type === 'export_invoice';
      }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales rows');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(
    () =>
      rows.filter(
        (sale) =>
          sale.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sale.party_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sale.party_gstin || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [rows, searchQuery]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmed</Badge>;
      case 'review_required':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Review</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_value || 0), 0);

  const handleExportGstr1 = async () => {
    const period = new Date().toISOString().slice(0, 7);
    try {
      setExporting(true);
      const blob = await apiClient.exportGstr1(period, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gstr1_${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported GSTR-1 for ${period}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Sales</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Records</CardTitle>
              <CardDescription>Confirmed sale-bill rows from the database</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExportGstr1()}>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting…' : 'Export GSTR-1'}
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Sale
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number, customer name, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading sales rows...</div>
            ) : (
              <>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[14%]">Invoice No.</TableHead>
                      <TableHead className="w-[12%]">Date</TableHead>
                      <TableHead className="w-[18%]">Customer</TableHead>
                      <TableHead className="w-[16%]">GSTIN/UIN</TableHead>
                      <TableHead className="w-[12%] text-right">Taxable Value</TableHead>
                      <TableHead className="w-[12%] text-right">Total</TableHead>
                      <TableHead className="w-[8%]">Status</TableHead>
                      <TableHead className="w-[8%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                        <TableCell>{sale.invoice_date || '-'}</TableCell>
                        <TableCell>{sale.party_name || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-600">{sale.party_gstin || '-'}</TableCell>
                        <TableCell className="text-right">₹{(sale.taxable_value || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">₹{(sale.total_value || 0).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length === 0 && !loading && (
                  <div className="border-t p-4 text-sm text-gray-500">
                    No sales rows exist yet. Confirm a sale bill upload to populate this page.
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
