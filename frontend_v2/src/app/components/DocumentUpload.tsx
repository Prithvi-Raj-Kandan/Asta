import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { apiClient, GSTR1DraftRow, InvoiceRow, UploadDraftResponse, UploadResponse } from '../../api/client';

const FIELD_LABELS: Array<{ key: keyof GSTR1DraftRow; label: string }> = [
  { key: 'gstin_uin', label: 'GSTIN/UIN' },
  { key: 'trade_name', label: 'Trade Name' },
  { key: 'invoice_no', label: 'Invoice No' },
  { key: 'date_of_invoice', label: 'Date of Invoice' },
  { key: 'invoice_value', label: 'Invoice Value' },
  { key: 'gst_percent', label: 'GST %' },
  { key: 'taxable_value', label: 'Taxable Value' },
  { key: 'cess', label: 'CESS' },
  { key: 'place_of_supply', label: 'Place Of Supply' },
  { key: 'rcm_applicable', label: 'RCM Applicable' },
  { key: 'invoice_type', label: 'Invoice Type' },
  { key: 'e_commerce_gstin', label: 'E-Commerce GSTIN' },
];

const DOCUMENT_TYPES = [
  { value: 'sale_bill', label: 'Sale Bill' },
  { value: 'purchase_bill', label: 'Purchase Bill' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
];

export function DocumentUpload() {
  const [documentType, setDocumentType] = useState('sale_bill');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploads, setUploads] = useState<UploadResponse[]>([]);
  const [confirmedRows, setConfirmedRows] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<UploadDraftResponse | null>(null);
  const [draftRow, setDraftRow] = useState<GSTR1DraftRow | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [uploadData, invoiceData] = await Promise.all([
        apiClient.listUploads(),
        apiClient.listInvoices(),
      ]);
      setUploads(Array.isArray(uploadData) ? uploadData : []);
      setConfirmedRows(Array.isArray(invoiceData) ? invoiceData : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setUploads([]);
      setConfirmedRows([]);
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
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) {
            clearInterval(progressInterval);
            return 92;
          }
          return prev + Math.random() * 20;
        });
      }, 180);

      const response = await apiClient.uploadFile(file, documentType);

      clearInterval(progressInterval);
      setProgress(100);
      setDraft(response);
      setDraftRow(response.draft_row);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setDraft(null);
      setDraftRow(null);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const handleDraftChange = (field: keyof GSTR1DraftRow, value: string) => {
    setDraftRow((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleConfirm = async () => {
    if (!draft || !draftRow) return;

    setConfirming(true);
    setError('');

    try {
      const confirmed = await apiClient.confirmUpload(draft.id, draft.document_type, draftRow, draft.extraction_issues);
      setConfirmedRows((current) => [confirmed, ...current.filter((row) => row.id !== confirmed.id)]);
      setDraft(null);
      setDraftRow(null);
      await loadDashboardData();
      window.dispatchEvent(new Event('app:data-updated'));
      toast.success('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'uploaded':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{status}</Badge>;
      case 'review_required':
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{status}</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalConfirmedValue = useMemo(
    () => confirmedRows.reduce((sum, row) => sum + (row.total_value || 0), 0),
    [confirmedRows]
  );

  const normalizedUploads = uploads.map((upload) => ({
    ...upload,
    document_type: upload.document_type || 'sale_bill',
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Confirmed Rows</div>
            <div className="text-2xl font-bold text-gray-900">{confirmedRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Uploaded Files</div>
            <div className="text-2xl font-bold text-gray-900">{uploads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Total Confirmed Value</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalConfirmedValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload and OCR Review</CardTitle>
          <CardDescription>
            Select the document type, upload the file, review the extracted row, correct any mistakes, and confirm it into the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Document Type</label>
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                disabled={uploading || confirming}
              >
                {DOCUMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer block">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
                <p className="text-sm text-gray-500 mb-4">Supports PDF, JPG, JPEG, PNG</p>
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading || confirming}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                />
                <Button disabled={uploading || confirming}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing OCR...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload and Extract
                    </>
                  )}
                </Button>
              </label>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Uploading and extracting data...</span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {draft && draftRow && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Editable OCR Draft</CardTitle>
                <CardDescription>
                  {draft.filename} • {draft.ocr_engine} • {draft.status}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{draft.document_type}</Badge>
                <Badge variant="outline">{draft.extraction_issues.length} review items</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {FIELD_LABELS.map((field) => (
                      <TableHead key={String(field.key)} className="min-w-[180px]">{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {FIELD_LABELS.map((field) => (
                      <TableCell key={String(field.key)} className="align-top">
                        <Input
                          value={draftRow[field.key]}
                          onChange={(event) => handleDraftChange(field.key, event.target.value)}
                          className="min-w-[160px]"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {draft.extraction_issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Extraction review items</div>
                <div className="space-y-2">
                  {draft.extraction_issues.map((issue) => (
                    <div key={`${issue.field}-${issue.message}`} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div>
                        <div className="text-sm font-medium text-amber-900">{issue.field}</div>
                        <div className="text-sm text-amber-800">{issue.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setDraft(null); setDraftRow(null); }} disabled={confirming}>
                Clear Draft
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm and Save
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Database Rows</CardTitle>
              <CardDescription>All confirmed rows currently stored in the database</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { void loadDashboardData(); }} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : confirmedRows.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Trade Name</TableHead>
                    <TableHead>GSTIN/UIN</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Invoice Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.invoice_number}</TableCell>
                      <TableCell>{row.party_name || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-600">{row.party_gstin || '-'}</TableCell>
                      <TableCell>{row.invoice_date || '-'}</TableCell>
                      <TableCell className="text-right">₹{(row.taxable_value || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(row.total_value || 0).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No confirmed database rows yet. Upload an image and confirm the extracted row to save it here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { type: 'Sale Invoice', description: 'Primary GSTR-1 sales flow', icon: FileText, color: 'blue' },
          { type: 'Credit Note', description: 'Adjustments and reversals', icon: FileText, color: 'purple' },
          { type: 'Purchase Bill', description: 'Purchase-side review workflow', icon: FileText, color: 'orange' },
          { type: 'Debit Note', description: 'Additional charges and corrections', icon: FileText, color: 'green' },
          { type: 'Bank Statement', description: 'Reference and reconciliation support', icon: FileText, color: 'indigo' },
          { type: 'Payment Receipt', description: 'Payment confirmations for traceability', icon: FileText, color: 'pink' },
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>Your uploaded files and workflow status</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length > 0 ? (
            <div className="space-y-3">
              {normalizedUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
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
                    {getStatusBadge(upload.status)}
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
