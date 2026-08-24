import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AnalyticsPageProps {
  userName: string;
  organizationName: string;
}

export function AnalyticsPage({ userName, organizationName }: AnalyticsPageProps) {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setSummary(await apiClient.getAnalyticsSummary());
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    };
    void load();
    window.addEventListener('app:data-updated', load);
    return () => window.removeEventListener('app:data-updated', load);
  }, []);

  const salesTotal = summary?.sales_total ?? 0;
  const purchaseTotal = summary?.purchase_total ?? 0;
  const taxOut = summary?.tax_outward ?? 0;
  const chartData = (summary?.sales_by_month || []).map((m: any) => ({
    month: m.month,
    revenue: m.total,
  }));

  const chartConfig = {
    revenue: { label: 'Revenue', color: '#3b82f6' },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{organizationName} analytics</h2>
        <p className="text-sm text-gray-600">Live totals for {userName}</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sales total</p>
                <p className="text-2xl font-bold">₹{Number(salesTotal).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{summary?.sales_count ?? 0} invoices</p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Purchases total</p>
                <p className="text-2xl font-bold">₹{Number(purchaseTotal).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{summary?.purchase_count ?? 0} invoices</p>
              </div>
              <ShoppingCart className="w-6 h-6 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Outward tax</p>
                <p className="text-2xl font-bold">₹{Number(taxOut).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open obligations</p>
                <p className="text-2xl font-bold">{summary?.obligations_open ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Health {summary?.health_score?.score ?? '—'}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by month</CardTitle>
          <CardDescription>From confirmed invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500">No dated sales invoices yet.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
