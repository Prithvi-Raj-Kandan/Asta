import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { apiClient, UploadResponse } from '../../api/client';

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploads, setUploads] = useState<UploadResponse[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const data = await apiClient.listUploads();
      setUploads(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load uploads');
      setUploads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      const response = await apiClient.uploadFile(file);

      clearInterval(progressInterval);
      setProgress(100);

      // Reload uploads list
      setTimeout(() => {
        loadUploads();
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <label className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer block">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
            <p className="text-sm text-gray-500 mb-4">Supports PDF, JPG, PNG (Max 10MB per file)</p>
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button disabled={uploading}>
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
          </label>

          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Uploading and extracting data...</span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
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
          <CardDescription>Your uploaded documents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : uploads.length > 0 ? (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{upload.filename}</p>
                      <p className="text-sm text-gray-500">
                        {upload.filetype} • {new Date(upload.upload_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{(upload.filesize / 1024).toFixed(1)} KB</span>
                    {upload.status === 'uploaded' && (
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
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No uploads yet. Upload a document to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
