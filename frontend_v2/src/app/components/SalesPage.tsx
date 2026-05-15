import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Download, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';

interface SaleRecord {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerGSTIN: string;
  items: string;
  quantity: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  documentRef: string;
}

const salesData: SaleRecord[] = [
  {
    id: '1',
    invoiceNo: 'INV-2026-001',
    date: '2026-05-12',
    customerName: 'ABC Ltd.',
    customerGSTIN: '29ABCDE1234F1Z5',
    items: 'Software License',
    quantity: 5,
    amount: 50000,
    cgst: 4500,
    sgst: 4500,
    igst: 0,
    totalAmount: 59000,
    paymentStatus: 'paid',
    documentRef: 'DOC-001.pdf'
  },
  {
    id: '2',
    invoiceNo: 'INV-2026-002',
    date: '2026-05-11',
    customerName: 'XYZ Industries',
    customerGSTIN: '27XYZAB5678G2H3',
    items: 'Consulting Services',
    quantity: 10,
    amount: 75000,
    cgst: 6750,
    sgst: 6750,
    igst: 0,
    totalAmount: 88500,
    paymentStatus: 'pending',
    documentRef: 'DOC-002.pdf'
  },
  {
    id: '3',
    invoiceNo: 'INV-2026-003',
    date: '2026-05-09',
    customerName: 'GHI Enterprises',
    customerGSTIN: '19GHIJK9012L3M4',
    items: 'Hardware Equipment',
    quantity: 3,
    amount: 120000,
    cgst: 0,
    sgst: 0,
    igst: 21600,
    totalAmount: 141600,
    paymentStatus: 'paid',
    documentRef: 'DOC-003.pdf'
  },
  {
    id: '4',
    invoiceNo: 'INV-2026-004',
    date: '2026-05-08',
    customerName: 'DEF Corporation',
    customerGSTIN: '24DEFGH3456I4J5',
    items: 'Training Program',
    quantity: 15,
    amount: 45000,
    cgst: 4050,
    sgst: 4050,
    igst: 0,
    totalAmount: 53100,
    paymentStatus: 'overdue',
    documentRef: 'DOC-004.pdf'
  },
  {
    id: '5',
    invoiceNo: 'INV-2026-005',
    date: '2026-05-07',
    customerName: 'JKL Tech',
    customerGSTIN: '29JKLMN7890O5P6',
    items: 'Cloud Subscription',
    quantity: 12,
    amount: 96000,
    cgst: 8640,
    sgst: 8640,
    igst: 0,
    totalAmount: 113280,
    paymentStatus: 'paid',
    documentRef: 'DOC-005.pdf'
  },
];

export function SalesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSales = salesData.filter(sale =>
    sale.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customerGSTIN.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Sales</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Records</CardTitle>
              <CardDescription>Complete database of all sales transactions</CardDescription>
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
                Add Sale
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {/* CGST/SGST/IGST columns removed */}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.invoiceNo}</TableCell>
                    <TableCell>{sale.date}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell className="text-xs text-gray-600">{sale.customerGSTIN}</TableCell>
                    <TableCell>{sale.items}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">₹{sale.amount.toLocaleString()}</TableCell>
                    {/* Tax columns removed */}
                    <TableCell className="text-right font-semibold">₹{sale.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(sale.paymentStatus)}</TableCell>
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
            <div>Showing {filteredSales.length} of {salesData.length} records</div>
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
