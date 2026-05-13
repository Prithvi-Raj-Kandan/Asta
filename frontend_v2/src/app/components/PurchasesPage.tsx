import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Download, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';

interface PurchaseRecord {
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
}

const purchasesData: PurchaseRecord[] = [
  {
    id: '1',
    billNo: 'PUR-2026-001',
    date: '2026-05-11',
    vendorName: 'XYZ Supplies',
    vendorGSTIN: '29XYZAB1234C5D6',
    items: 'Office Supplies',
    quantity: 50,
    amount: 25000,
    cgst: 2250,
    sgst: 2250,
    igst: 0,
    totalAmount: 29500,
    paymentStatus: 'paid',
    documentRef: 'PUR-001.pdf'
  },
  {
    id: '2',
    billNo: 'PUR-2026-002',
    date: '2026-05-10',
    vendorName: 'ABC Equipment',
    vendorGSTIN: '27ABCDE5678F7G8',
    items: 'Computer Hardware',
    quantity: 10,
    amount: 150000,
    cgst: 13500,
    sgst: 13500,
    igst: 0,
    totalAmount: 177000,
    paymentStatus: 'pending',
    documentRef: 'PUR-002.pdf'
  },
  {
    id: '3',
    billNo: 'PUR-2026-003',
    date: '2026-05-08',
    vendorName: 'JKL Traders',
    vendorGSTIN: '19JKLMN9012P8Q9',
    items: 'Raw Materials',
    quantity: 200,
    amount: 80000,
    cgst: 0,
    sgst: 0,
    igst: 14400,
    totalAmount: 94400,
    paymentStatus: 'paid',
    documentRef: 'PUR-003.pdf'
  },
  {
    id: '4',
    billNo: 'PUR-2026-004',
    date: '2026-05-07',
    vendorName: 'DEF Services',
    vendorGSTIN: '24DEFGH3456I9J0',
    items: 'Maintenance Services',
    quantity: 1,
    amount: 35000,
    cgst: 3150,
    sgst: 3150,
    igst: 0,
    totalAmount: 41300,
    paymentStatus: 'paid',
    documentRef: 'PUR-004.pdf'
  },
  {
    id: '5',
    billNo: 'PUR-2026-005',
    date: '2026-05-05',
    vendorName: 'PQR Logistics',
    vendorGSTIN: '29PQRST7890U0V1',
    items: 'Transportation',
    quantity: 5,
    amount: 45000,
    cgst: 4050,
    sgst: 4050,
    igst: 0,
    totalAmount: 53100,
    paymentStatus: 'overdue',
    documentRef: 'PUR-005.pdf'
  },
];

export function PurchasesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPurchases = purchasesData.filter(purchase =>
    purchase.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.vendorGSTIN.toLowerCase().includes(searchQuery.toLowerCase())
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

  const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  const totalCGST = filteredPurchases.reduce((sum, purchase) => sum + purchase.cgst, 0);
  const totalSGST = filteredPurchases.reduce((sum, purchase) => sum + purchase.sgst, 0);
  const totalIGST = filteredPurchases.reduce((sum, purchase) => sum + purchase.igst, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Purchases</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalPurchases.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">CGST Paid</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalCGST.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">SGST Paid</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalSGST.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">IGST Paid</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalIGST.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Records</CardTitle>
              <CardDescription>Complete database of all purchase transactions</CardDescription>
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
                Add Purchase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.billNo}</TableCell>
                    <TableCell>{purchase.date}</TableCell>
                    <TableCell>{purchase.vendorName}</TableCell>
                    <TableCell className="text-xs text-gray-600">{purchase.vendorGSTIN}</TableCell>
                    <TableCell>{purchase.items}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right">₹{purchase.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{purchase.cgst.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{purchase.sgst.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{purchase.igst.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₹{purchase.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(purchase.paymentStatus)}</TableCell>
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
            <div>Showing {filteredPurchases.length} of {purchasesData.length} records</div>
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
