import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Bell } from 'lucide-react';
import { Progress } from './ui/progress';
import { apiClient } from '../../api/client';

const chartConfig = {
  revenue: { label: 'Revenue', color: '#22c55e' },
};

interface FinancialDashboardProps {
  userName: string;
  organizationName: string;
}

export function FinancialDashboard({ userName, organizationName }: FinancialDashboardProps) {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setSummary(await apiClient.getAnalyticsSummary());
      } catch {
        setSummary(null);
      }
    };
    void load();
    window.addEventListener('app:data-updated', load);
    return () => window.removeEventListener('app:data-updated', load);
  }, []);

  const complianceScore = summary?.health_score?.score ?? 0;
  const getScoreColor = (score: number) => {
    if (score < 30) return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-600' };
    if (score < 70) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-600' };
    return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-600' };
  };
  const scoreColors = getScoreColor(complianceScore);
  const chartData = (summary?.sales_by_month || []).map((m: any) => ({
    month: m.month,
    revenue: Number(m.total || 0),
  }));
  const alerts = summary?.alerts || [];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl">
                {userName.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
              <p className="text-gray-600">{organizationName}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by month</h3>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500">Confirm invoices to see trends.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance health</CardTitle>
            <CardDescription>From open GST obligations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${scoreColors.bg} ${scoreColors.text}`}>
              Score {complianceScore}
            </div>
            <Progress value={complianceScore} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{Number(summary?.sales_total || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">{summary?.sales_count || 0} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-gray-500">No due-soon or overdue items.</p>}
            {alerts.slice(0, 4).map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <span>
                  {a.obligation_type} due {a.due_date} ({a.status})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
