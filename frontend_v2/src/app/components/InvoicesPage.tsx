import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { apiClient, InvoiceRow } from '../../api/client';
import { InvoiceRowActions } from './invoices/InvoiceRowActions';
import { ManualInvoiceDialog } from './invoices/ManualInvoiceDialog';
import { ListToolbar, FilterOptions } from './invoices/ListToolbar';

export function InvoicesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: sessionStorage.getItem('invoices-list-sort') || 'date',
    sortDirection: (sessionStorage.getItem('invoices-list-sortDir') as 'asc' | 'desc') || 'desc',
  });

  useEffect(() => {
    void loadInvoices();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadInvoices();
    };

    window.addEventListener('app:data-updated', refresh);
    return () => window.removeEventListener('app:data-updated', refresh);
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await apiClient.listInvoices();
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = rows.filter((invoice) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !searchLower || 
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        (invoice.party_name || '').toLowerCase().includes(searchLower) ||
        (invoice.party_gstin || '').toLowerCase().includes(searchLower);

      const normalizedType = (invoice.document_type || '').toLowerCase();
      const mappedType =
        normalizedType === 'sales_invoice' ? 'sale_bill' :
        normalizedType === 'purchase_invoice' ? 'purchase_bill' :
        normalizedType;
      const matchesTab = activeTab === 'all' || mappedType === activeTab;

      const matchesStatus = filters.status === 'all' || invoice.status === filters.status;

      let matchesDate = true;
      if (filters.dateFrom && invoice.invoice_date) {
        matchesDate = matchesDate && new Date(invoice.invoice_date) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo && invoice.invoice_date) {
        matchesDate = matchesDate && new Date(invoice.invoice_date) <= new Date(filters.dateTo);
      }

      return matchesSearch && matchesTab && matchesStatus && matchesDate;
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
  }, [rows, filters, activeTab]);

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

  const getTypeBadge = (type: string) => {
    const normalizedType = type.toLowerCase();
    switch (type) {
      case 'sale_bill':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sale Bill</Badge>;
      case 'purchase_bill':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Purchase Bill</Badge>;
      case 'credit_note':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Credit Note</Badge>;
      case 'debit_note':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Debit Note</Badge>;
      default:
        return <Badge variant="outline">{normalizedType || type}</Badge>;
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

  const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);
  const totalTaxable = filteredInvoices.reduce((sum, inv) => sum + (inv.taxable_value || 0), 0);
  const totalCount = filteredInvoices.length;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalInvoices.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Taxable Value</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalTaxable.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Rows</div>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Database Rows</div>
            <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices & Documents</CardTitle>
              <CardDescription>Centralized database of confirmed OCR rows and manual entries</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ManualInvoiceDialog onSuccess={loadInvoices}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </ManualInvoiceDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="sale_bill">Sales Bills</TabsTrigger>
              <TabsTrigger value="purchase_bill">Purchase Bills</TabsTrigger>
              <TabsTrigger value="credit_note">Credit Notes</TabsTrigger>
              <TabsTrigger value="debit_note">Debit Notes</TabsTrigger>
            </TabsList>
          </Tabs>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <ListToolbar filters={filters} onFilterChange={setFilters} pageKey="invoices-list" />

          <div className="border rounded-lg">
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('invoice_number')}>
                    Invoice No. <SortIcon field="invoice_number" />
                  </TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[110px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('date')}>
                    Date <SortIcon field="date" />
                  </TableHead>
                  <TableHead className="w-[180px] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('party_name')}>
                    Party Name <SortIcon field="party_name" />
                  </TableHead>
                  <TableHead className="w-[160px]">GSTIN/UIN</TableHead>
                  <TableHead className="w-[110px] text-right">Taxable Value</TableHead>
                  <TableHead className="w-[90px] text-right">CGST</TableHead>
                  <TableHead className="w-[90px] text-right">SGST</TableHead>
                  <TableHead className="w-[90px] text-right">IGST</TableHead>
                  <TableHead className="w-[110px] text-right cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total')}>
                    Total <SortIcon field="total" />
                  </TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium max-w-[140px] truncate" title={invoice.invoice_number}>
                      <span className="inline-flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{invoice.invoice_number}</span>
                      </span>
                    </TableCell>
                    <TableCell>{getTypeBadge(invoice.document_type)}</TableCell>
                    <TableCell>{invoice.invoice_date || '-'}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={invoice.party_name || '-'}>
                      {invoice.party_name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-[160px] truncate" title={invoice.party_gstin || '-'}>
                      {invoice.party_gstin || '-'}
                    </TableCell>
                    <TableCell className="text-right">₹{(invoice.taxable_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.cgst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.sgst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.igst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₹{(invoice.total_value || 0).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <InvoiceRowActions invoiceId={invoice.id} sourceType={invoice.source_type} onDeleteSuccess={loadInvoices} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 && !loading && (
              <div className="border-t p-4 text-sm text-gray-500">No invoice rows exist yet. Create one manually or upload a document.</div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Showing {filteredInvoices.length} of {rows.length} records</div>
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
