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

export function SalesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: sessionStorage.getItem('sales-list-sort') || 'date',
    sortDirection: (sessionStorage.getItem('sales-list-sortDir') as 'asc' | 'desc') || 'desc',
  });

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

  const filteredSales = useMemo(() => {
    let result = rows.filter((sale) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !searchLower || 
        sale.invoice_number.toLowerCase().includes(searchLower) ||
        (sale.party_name || '').toLowerCase().includes(searchLower) ||
        (sale.party_gstin || '').toLowerCase().includes(searchLower);

      const matchesStatus = filters.status === 'all' || sale.status === filters.status;

      let matchesDate = true;
      if (filters.dateFrom && sale.invoice_date) {
        matchesDate = matchesDate && new Date(sale.invoice_date) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo && sale.invoice_date) {
        matchesDate = matchesDate && new Date(sale.invoice_date) <= new Date(filters.dateTo);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    result.sort((a, b) => {
      let valA: any = a.invoice_date || '';
      let valB: any = b.invoice_date || '';

      switch (filters.sortBy) {
        case 'total':
          valA = a.total_value || 0;
          valB = b.total_value || 0;
          break;
        case 'party_name':
          valA = (a.party_name || '').toLowerCase();
          valB = (b.party_name || '').toLowerCase();
          break;
        case 'invoice_number':
          valA = a.invoice_number.toLowerCase();
          valB = b.invoice_number.toLowerCase();
          break;
        case 'date':
        default:
          valA = a.invoice_date || '';
          valB = b.invoice_date || '';
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
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmed</Badge>;
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

  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_value || 0), 0);

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
              <ManualInvoiceDialog defaultType="sale_bill" onSuccess={loadSales}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sale
                </Button>
              </ManualInvoiceDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <ListToolbar filters={filters} onFilterChange={setFilters} pageKey="sales-list" />

          <div className="border rounded-lg">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading sales rows...</div>
            ) : (
              <>
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('invoice_number')}>
                        Invoice No. <SortIcon field="invoice_number" />
                      </TableHead>
                      <TableHead className="w-[120px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('date')}>
                        Date <SortIcon field="date" />
                      </TableHead>
                      <TableHead className="w-[200px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('party_name')}>
                        Customer <SortIcon field="party_name" />
                      </TableHead>
                      <TableHead className="w-[160px]">GSTIN/UIN</TableHead>
                      <TableHead className="w-[120px] text-right">Taxable Value</TableHead>
                      <TableHead className="w-[120px] text-right cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total')}>
                        Total <SortIcon field="total" />
                      </TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium max-w-[140px] truncate">{sale.invoice_number}</TableCell>
                        <TableCell>{sale.invoice_date || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={sale.party_name || '-'}>
                          {sale.party_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[160px] truncate" title={sale.party_gstin || '-'}>
                          {sale.party_gstin || '-'}
                        </TableCell>
                        <TableCell className="text-right">₹{(sale.taxable_value || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">₹{(sale.total_value || 0).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        <TableCell className="text-right">
                          <InvoiceRowActions invoiceId={sale.id} sourceType={sale.source_type} onDeleteSuccess={loadSales} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length === 0 && !loading && (
                  <div className="border-t p-4 text-sm text-gray-500">
                    No sales rows exist yet. Create one manually or upload a sale bill document.
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
