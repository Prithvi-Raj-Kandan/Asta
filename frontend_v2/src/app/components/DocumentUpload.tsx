import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = () => {
    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setUploading(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Financial Documents</CardTitle>
          <CardDescription>
            Upload invoices, bills, credit notes, and other financial documents. Our AI will automatically extract and categorize the data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
            <p className="text-sm text-gray-500 mb-4">Supports PDF, JPG, PNG (Max 10MB per file)</p>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </>
              )}
            </Button>
          </div>

          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Uploading and extracting data...</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { type: 'Sale Invoice', description: 'Customer invoices and receipts', icon: FileText, color: 'blue' },
          { type: 'Purchase Bill', description: 'Vendor bills and expenses', icon: FileText, color: 'orange' },
          { type: 'Credit Note', description: 'Credit memos and adjustments', icon: FileText, color: 'purple' },
          { type: 'Debit Note', description: 'Debit memos and charges', icon: FileText, color: 'green' },
          { type: 'Bank Statement', description: 'Bank transactions and statements', icon: FileText, color: 'indigo' },
          { type: 'Payment Receipt', description: 'Payment confirmations', icon: FileText, color: 'pink' },
        ].map((doc) => (
          <Card key={doc.type} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className={`w-12 h-12 rounded-lg bg-${doc.color}-50 flex items-center justify-center mb-4`}>
                <doc.icon className={`w-6 h-6 text-${doc.color}-600`} />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{doc.type}</h4>
              <p className="text-sm text-gray-500">{doc.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>Documents processed in the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Invoice_ABC_May2026.pdf', type: 'Sale Invoice', date: '2026-05-12', status: 'success', amount: '₹15,000' },
              { name: 'Bill_XYZ_Supplies.pdf', type: 'Purchase Bill', date: '2026-05-11', status: 'success', amount: '₹8,500' },
              { name: 'Credit_Note_DEF.pdf', type: 'Credit Note', date: '2026-05-10', status: 'processing', amount: '₹2,000' },
              { name: 'Invoice_GHI_Industries.pdf', type: 'Sale Invoice', date: '2026-05-09', status: 'success', amount: '₹22,000' },
              { name: 'Bank_Statement_May.pdf', type: 'Bank Statement', date: '2026-05-08', status: 'error', amount: '-' },
            ].map((upload, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{upload.name}</p>
                    <p className="text-sm text-gray-500">{upload.type} • {upload.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900">{upload.amount}</span>
                  {upload.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {upload.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
