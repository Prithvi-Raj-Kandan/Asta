import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, AlertCircle, CheckCircle2, Clock, FileDown, Sparkles, ExternalLink, BookOpen, FileText, Info } from 'lucide-react';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';

type Obligation = {
  id: string;
  obligation_type: string;
  category: string;
  period_label?: string;
  due_date?: string;
  days_left?: number;
  status: string;
  data_complete?: boolean;
  filed_on?: string | null;
  due_rule?: string;
  data_required?: string;
  portal_name?: string;
  portal_url?: string;
  guide_url?: string;
  instructions?: string;
};

type GeneratedDocument = {
  id: string;
  document_type: string;
  document_path: string;
  generated_date: string;
  extraction_job_id?: string;
};

export function ComplianceTracker() {
  const [upcoming, setUpcoming] = useState<Obligation[]>([]);
  const [completed, setCompleted] = useState<Obligation[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [health, setHealth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<Obligation | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [vaultDocs, setVaultDocs] = useState<GeneratedDocument[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      await apiClient.seedObligations(3);
      const data = await apiClient.listObligations();
      const obligations: Obligation[] = data.obligations || [];
      setUpcoming(obligations.filter((o) => o.status !== 'filed'));
      setCompleted(obligations.filter((o) => o.status === 'filed'));
      setAlertsCount((data.alerts || []).length);
      setHealth(data.health_score?.score ?? null);
      
      const docs = await apiClient.getAllGeneratedDocuments();
      setVaultDocs(docs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const getPriority = (o: Obligation) => {
    if (o.status === 'overdue' || (o.days_left != null && o.days_left <= 3)) return 'high';
    if (o.status === 'due_soon') return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const handleExport = async (o: Obligation) => {
    if (!o.period_label) return;
    try {
      setExportingId(o.id);
      const blob = await apiClient.exportGstr1(o.period_label, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gstr1_${o.period_label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('GSTR-1 CSV downloaded');
      
      // Reload to update the vault
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingId(null);
    }
  };

  const confirmMarkFiled = async () => {
    if (!pendingFile) return;
    const o = pendingFile;
    setPendingFile(null);
    try {
      await apiClient.markObligationFiled(o.id);
      toast.success(`${o.obligation_type} marked filed`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const renderUpcoming = (categoryFilter: string) => {
    const items = upcoming.filter((o) => categoryFilter === 'all' || o.category === categoryFilter);
    if (loading) return <p className="text-sm text-gray-500 p-4">Loading…</p>;
    if (items.length === 0) return <p className="text-sm text-gray-500 p-4">No open obligations for this category.</p>;

    return items.map((compliance) => {
      const priority = getPriority(compliance);
      const completionRate = compliance.data_complete ? 100 : compliance.status === 'due_soon' ? 60 : 35;
      
      return (
        <div key={compliance.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 cursor-pointer group" onClick={() => setSelectedObligation(compliance)}>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {compliance.obligation_type}{compliance.period_label ? ` (${compliance.period_label})` : ''}
                </h4>
                <Badge variant={getPriorityColor(priority)}>{priority}</Badge>
                <Badge variant="outline">{compliance.status}</Badge>
                {compliance.category === 'export' && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">Export</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate max-w-[80%]">{compliance.instructions || 'Compliance obligation'}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Due: {compliance.due_date || 'N/A'}
                </span>
                {compliance.days_left != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {compliance.days_left} days left
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {compliance.obligation_type === 'GSTR-1' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingId === compliance.id}
                  onClick={(e) => { e.stopPropagation(); void handleExport(compliance); }}
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  AI Generate
                </Button>
              )}
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setPendingFile(compliance); }}>
                <Sparkles className="w-4 h-4 mr-1" />
                Mark Filed
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Data Completion</span>
              <span>{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        </div>
      );
    });
  };

  return (
    <div className="p-6 space-y-6">
      {alertsCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900">Urgent: {alertsCount} Deadline{alertsCount > 1 ? 's' : ''} Approaching</h4>
            <p className="text-sm text-red-700 mt-1">
              Review filings due soon or overdue. Compliance health score: {health ?? '—'}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>Refresh</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All Obligations</TabsTrigger>
            <TabsTrigger value="gst">GST Filings</TabsTrigger>
            <TabsTrigger value="export">Export Compliances</TabsTrigger>
          </TabsList>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Click any row to view filing instructions and required data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-slate-50/50 pt-4 rounded-b-xl border-t border-slate-100">
            <TabsContent value="all" className="m-0 space-y-4">
              {renderUpcoming('all')}
            </TabsContent>
            <TabsContent value="gst" className="m-0 space-y-4">
              {renderUpcoming('gst')}
            </TabsContent>
            <TabsContent value="export" className="m-0 space-y-4">
              {renderUpcoming('export')}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Filing Vault (Documents Generated)</CardTitle>
          <CardDescription>Portal-ready JSONs and PDFs will appear here when generated</CardDescription>
        </CardHeader>
        <CardContent>
          {vaultDocs.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No generated documents yet.</p>
              <p className="text-xs text-slate-400 mt-1">When you use "AI Generate", your export files will be securely saved here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vaultDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded">
                      <FileDown className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{doc.document_type || 'Generated File'}</p>
                      <p className="text-xs text-gray-500">{new Date(doc.generated_date).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const url = doc.document_path.startsWith('http') ? doc.document_path : `http://localhost:8000${doc.document_path.startsWith('/') ? doc.document_path : `/${doc.document_path}`}`;
                    window.open(url, '_blank');
                  }}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed Filings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {completed.length === 0 && <p className="text-sm text-gray-500">No filed obligations yet.</p>}
          {completed.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  {item.obligation_type}{item.period_label ? ` (${item.period_label})` : ''}
                </span>
                {item.category === 'export' && (
                  <Badge variant="outline" className="text-xs ml-2">Export</Badge>
                )}
              </div>
              <span className="text-sm text-gray-500">Filed: {item.filed_on || '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Expanded Obligation Details Drawer */}
      <Sheet open={!!selectedObligation} onOpenChange={(open) => !open && setSelectedObligation(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedObligation && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl">
                  {selectedObligation.obligation_type}
                </SheetTitle>
                <SheetDescription>
                  {selectedObligation.period_label ? `Period: ${selectedObligation.period_label}` : 'Filing Details'}
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Instructions
                  </h4>
                  <p className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    {selectedObligation.instructions || 'No detailed instructions available.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Due Rule</span>
                    <span className="text-sm font-medium">{selectedObligation.due_rule || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Status</span>
                    <Badge variant={selectedObligation.status === 'filed' ? 'outline' : 'secondary'}>
                      {selectedObligation.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Required Data</h4>
                  <p className="text-sm text-gray-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedObligation.data_required || 'Standard sales and purchase documents.'}
                  </p>
                </div>

                {selectedObligation.portal_name && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Filing Portal</h4>
                    <a
                      href={selectedObligation.portal_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors w-full justify-between"
                    >
                      {selectedObligation.portal_name}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {selectedObligation.guide_url && (
                  <div>
                    <a
                      href={selectedObligation.guide_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Info className="w-4 h-4" />
                      Read the official guide
                    </a>
                  </div>
                )}
                
                <div className="pt-6 border-t flex flex-col gap-2">
                  <Button className="w-full" onClick={() => {
                    setPendingFile(selectedObligation);
                    setSelectedObligation(null);
                  }}>
                    Mark as Filed
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setSelectedObligation(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Mark Filed Dialog */}
      <AlertDialog open={!!pendingFile} onOpenChange={(open) => !open && setPendingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this filing as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFile
                ? `${pendingFile.obligation_type}${pendingFile.period_label ? ` (${pendingFile.period_label})` : ''} will be marked as filed. This cannot be undone from the app.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmMarkFiled()}>Yes, mark filed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
