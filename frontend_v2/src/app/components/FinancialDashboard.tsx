import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Bell } from 'lucide-react';
import { Progress } from './ui/progress';

const profitLossData = [
  { month: 'Jan', profit: 13000, loss: -5000 },
  { month: 'Feb', profit: 17000, loss: -3000 },
  { month: 'Mar', profit: 15000, loss: -4000 },
  { month: 'Apr', profit: 23000, loss: -2000 },
  { month: 'May', profit: 19000, loss: -3500 },
  { month: 'Jun', profit: 27000, loss: -1500 },
  { month: 'Jul', profit: 21000, loss: -2800 },
  { month: 'Aug', profit: 25000, loss: -2200 },
  { month: 'Sep', profit: 22000, loss: -3100 },
  { month: 'Oct', profit: 28000, loss: -1800 },
  { month: 'Nov', profit: 24000, loss: -2600 },
  { month: 'Dec', profit: 30000, loss: -2000 },
];

const chartConfig = {
  profit: {
    label: 'Profit',
    color: '#22c55e',
  },
  loss: {
    label: 'Loss',
    color: '#ef4444',
  },
};

interface FinancialDashboardProps {
  userName: string;
  organizationName: string;
}

export function FinancialDashboard({ userName, organizationName }: FinancialDashboardProps) {
  const complianceScore = 85;
  const getScoreColor = (score: number) => {
    if (score < 30) return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-600' };
    if (score < 70) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-600' };
    return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-600' };
  };
  const scoreColors = getScoreColor(complianceScore);

  return (
    <div className="p-6 space-y-6">
      {/* User Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
              <p className="text-gray-600">{organizationName}</p>
            </div>
          </div>

          {/* Net Profit/Loss Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Annual Profit & Loss Overview</h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLossData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="loss" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Health & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Compliance Health Score
            </CardTitle>
            <CardDescription>Your current compliance performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`${scoreColors.bg} rounded-lg p-6 text-center mb-4`}>
              <div className={`text-5xl font-bold ${scoreColors.text} mb-2`}>{complianceScore}%</div>
              <p className={`text-sm ${scoreColors.text}`}>
                {complianceScore >= 70 ? 'Excellent' : complianceScore >= 30 ? 'Moderate' : 'Needs Attention'}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">On-time Filings</span>
                  <span className="font-medium text-gray-900">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">Document Accuracy</span>
                  <span className="font-medium text-gray-900">88%</span>
                </div>
                <Progress value={88} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">Data Completeness</span>
                  <span className="font-medium text-gray-900">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Government Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Regulatory Announcements
            </CardTitle>
            <CardDescription>Latest updates from government portals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: 'GST Rate Changes for Q2 2026',
                  date: '2026-05-10',
                  source: 'GST Council',
                  priority: 'high',
                  description: 'New GST rates applicable from June 1, 2026'
                },
                {
                  title: 'Extended Deadline for GSTR-1',
                  date: '2026-05-08',
                  source: 'CBIC',
                  priority: 'medium',
                  description: 'May filing deadline extended to 15th May'
                },
                {
                  title: 'New E-invoice Schema Update',
                  date: '2026-05-05',
                  source: 'NIC',
                  priority: 'medium',
                  description: 'Schema version 1.1 mandatory from July 2026'
                },
                {
                  title: 'TDS Compliance Reminder',
                  date: '2026-05-02',
                  source: 'Income Tax Dept',
                  priority: 'low',
                  description: 'Quarterly TDS return due on May 31, 2026'
                },
              ].map((announcement, index) => (
                <div key={index} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r">
                  <div className="flex items-start gap-3">
                    {announcement.priority === 'high' && (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{announcement.title}</h4>
                      <p className="text-xs text-gray-600 mb-2">{announcement.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{announcement.source}</span>
                        <span>•</span>
                        <span>{announcement.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
