import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, AlertCircle, CheckCircle2, Clock, FileDown, Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';
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

type Obligation = {
  id: string;
  obligation_type: string;
  period_label?: string;
  due_date?: string;
  days_left?: number;
  status: string;
  data_complete?: boolean;
  filed_on?: string | null;
};

export function ComplianceTracker() {
  const [upcoming, setUpcoming] = useState<Obligation[]>([]);
  const [completed, setCompleted] = useState<Obligation[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [health, setHealth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<Obligation | null>(null);

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

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Compliance Deadlines</CardTitle>
          <CardDescription>Live obligations from your compliance calendar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && upcoming.length === 0 && (
            <p className="text-sm text-gray-500">No open obligations. Click refresh to seed GSTR-1 / GSTR-3B.</p>
          )}
          {upcoming.map((compliance) => {
            const priority = getPriority(compliance);
            const completionRate = compliance.data_complete ? 100 : compliance.status === 'due_soon' ? 60 : 35;
            return (
              <div key={compliance.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {compliance.obligation_type}{compliance.period_label ? ` (${compliance.period_label})` : ''}
                      </h4>
                      <Badge variant={getPriorityColor(priority)}>{priority}</Badge>
                      <Badge variant="outline">{compliance.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">GST compliance obligation</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {compliance.due_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {compliance.days_left} days left
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {compliance.obligation_type === 'GSTR-1' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exportingId === compliance.id}
                        onClick={() => void handleExport(compliance)}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        AI Generate
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setPendingFile(compliance)}>
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
                  <Progress value={completionRate} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

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
              </div>
              <span className="text-sm text-gray-500">Filed: {item.filed_on || '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
