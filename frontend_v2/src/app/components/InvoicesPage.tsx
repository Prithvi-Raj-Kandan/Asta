import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Download, Filter, Plus, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiClient, InvoiceRow } from '../../api/client';
import { toast } from 'sonner';

export function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

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
      const rows = Array.isArray(data) ? data : [];
      setRows(rows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return rows.filter((invoice) => {
      const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invoice.party_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invoice.party_gstin || '').toLowerCase().includes(searchQuery.toLowerCase());

      const normalizedType = (invoice.document_type || '').toLowerCase();
      const mappedType =
        normalizedType === 'sales_invoice' ? 'sale_bill' :
        normalizedType === 'purchase_invoice' ? 'purchase_bill' :
        normalizedType;
      const matchesTab = activeTab === 'all' || mappedType === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [rows, searchQuery, activeTab]);

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

  const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);
  const totalTaxable = filteredInvoices.reduce((sum, inv) => sum + (inv.taxable_value || 0), 0);
  const totalCount = filteredInvoices.length;

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
      {/* Summary Cards */}
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

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices & Documents</CardTitle>
              <CardDescription>Centralized database of confirmed OCR rows and manual entries</CardDescription>
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
                Create Invoice
              </Button>
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

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number, party name, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>GSTIN/UIN</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{getTypeBadge(invoice.document_type)}</TableCell>
                    <TableCell>{invoice.invoice_date || '-'}</TableCell>
                    <TableCell>{invoice.party_name || '-'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{invoice.party_gstin || '-'}</TableCell>
                    <TableCell className="text-right">₹{(invoice.taxable_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.cgst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.sgst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.igst_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₹{(invoice.total_value || 0).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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
              <div className="border-t p-4 text-sm text-gray-500">No invoice rows exist yet. Confirm an OCR draft to create the first record.</div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Showing {filteredInvoices.length} of {rows.length} records</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
              {rows.length === 0 && !loading && (
                <div className="border-t p-4 text-sm text-gray-500">No invoice rows exist yet. Confirm an OCR draft to create the first record.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
