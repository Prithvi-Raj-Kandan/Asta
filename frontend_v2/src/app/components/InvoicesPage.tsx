import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Download, Filter, Plus, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  type: 'sales' | 'purchase' | 'credit' | 'debit';
  date: string;
  partyName: string;
  partyGSTIN: string;
  description: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  dueDate: string;
  documentRef: string;
}

const invoicesData: InvoiceRecord[] = [
  {
    id: '1',
    invoiceNo: 'INV-2026-001',
    type: 'sales',
    date: '2026-05-12',
    partyName: 'ABC Ltd.',
    partyGSTIN: '29ABCDE1234F1Z5',
    description: 'Software License - Annual Subscription',
    taxableAmount: 50000,
    cgst: 4500,
    sgst: 4500,
    igst: 0,
    totalAmount: 59000,
    status: 'paid',
    dueDate: '2026-06-11',
    documentRef: 'INV-001.pdf'
  },
  {
    id: '2',
    invoiceNo: 'INV-2026-002',
    type: 'sales',
    date: '2026-05-11',
    partyName: 'XYZ Industries',
    partyGSTIN: '27XYZAB5678G2H3',
    description: 'Consulting Services - May 2026',
    taxableAmount: 75000,
    cgst: 6750,
    sgst: 6750,
    igst: 0,
    totalAmount: 88500,
    status: 'sent',
    dueDate: '2026-06-10',
    documentRef: 'INV-002.pdf'
  },
  {
    id: '3',
    invoiceNo: 'CN-2026-001',
    type: 'credit',
    date: '2026-05-10',
    partyName: 'DEF Corp.',
    partyGSTIN: '24DEFGH3456I4J5',
    description: 'Product Return - Defective Items',
    taxableAmount: -15000,
    cgst: -1350,
    sgst: -1350,
    igst: 0,
    totalAmount: -17700,
    status: 'sent',
    dueDate: '2026-06-09',
    documentRef: 'CN-001.pdf'
  },
  {
    id: '4',
    invoiceNo: 'PUR-2026-001',
    type: 'purchase',
    date: '2026-05-11',
    partyName: 'XYZ Supplies',
    partyGSTIN: '29XYZAB1234C5D6',
    description: 'Office Supplies - Bulk Order',
    taxableAmount: 25000,
    cgst: 2250,
    sgst: 2250,
    igst: 0,
    totalAmount: 29500,
    status: 'paid',
    dueDate: '2026-06-10',
    documentRef: 'PUR-001.pdf'
  },
  {
    id: '5',
    invoiceNo: 'DN-2026-001',
    type: 'debit',
    date: '2026-05-09',
    partyName: 'GHI Logistics',
    partyGSTIN: '19GHIJK9012L3M4',
    description: 'Additional Freight Charges',
    taxableAmount: 5000,
    cgst: 450,
    sgst: 450,
    igst: 0,
    totalAmount: 5900,
    status: 'sent',
    dueDate: '2026-06-08',
    documentRef: 'DN-001.pdf'
  },
  {
    id: '6',
    invoiceNo: 'INV-2026-003',
    type: 'sales',
    date: '2026-05-08',
    partyName: 'JKL Tech',
    partyGSTIN: '29JKLMN7890O5P6',
    description: 'Cloud Services - Monthly Subscription',
    taxableAmount: 96000,
    cgst: 8640,
    sgst: 8640,
    igst: 0,
    totalAmount: 113280,
    status: 'paid',
    dueDate: '2026-06-07',
    documentRef: 'INV-003.pdf'
  },
  {
    id: '7',
    invoiceNo: 'INV-2026-004',
    type: 'sales',
    date: '2026-05-07',
    partyName: 'MNO Enterprises',
    partyGSTIN: '24MNOPQ1234R5S6',
    description: 'Hardware Equipment - Computers',
    taxableAmount: 180000,
    cgst: 16200,
    sgst: 16200,
    igst: 0,
    totalAmount: 212400,
    status: 'draft',
    dueDate: '2026-06-06',
    documentRef: 'INV-004.pdf'
  },
];

export function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredInvoices = invoicesData.filter(invoice => {
    const matchesSearch = invoice.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || invoice.type === activeTab;

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Sent</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'sales':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sales</Badge>;
      case 'purchase':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Purchase</Badge>;
      case 'credit':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Credit Note</Badge>;
      case 'debit':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Debit Note</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCGST = filteredInvoices.reduce((sum, inv) => sum + inv.cgst, 0);
  const totalSGST = filteredInvoices.reduce((sum, inv) => sum + inv.sgst, 0);
  const totalIGST = filteredInvoices.reduce((sum, inv) => sum + inv.igst, 0);

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
            <div className="text-sm text-gray-600 mb-1">Total CGST</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalCGST.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total SGST</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalSGST.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total IGST</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalIGST.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices & Documents</CardTitle>
              <CardDescription>Centralized database of invoices, credit notes, and debit notes</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
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
              <TabsTrigger value="sales">Sales Invoices</TabsTrigger>
              <TabsTrigger value="purchase">Purchase Bills</TabsTrigger>
              <TabsTrigger value="credit">Credit Notes</TabsTrigger>
              <TabsTrigger value="debit">Debit Notes</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number, party name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Taxable Amount</TableHead>
                  <TableHead className="text-right">Tax (GST)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {invoice.invoiceNo}
                    </TableCell>
                    <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.partyName}</TableCell>
                    <TableCell className="text-xs text-gray-600">{invoice.partyGSTIN}</TableCell>
                    <TableCell className="max-w-xs truncate">{invoice.description}</TableCell>
                    <TableCell className="text-right">₹{invoice.taxableAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(invoice.cgst + invoice.sgst + invoice.igst).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₹{invoice.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
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
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Showing {filteredInvoices.length} of {invoicesData.length} records</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
