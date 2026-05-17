import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, AlertCircle, CheckCircle2, Clock, FileDown, Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';

export function ComplianceTracker() {
  const upcomingCompliances = [
    {
      name: 'GSTR-1',
      description: 'Outward supplies return',
      dueDate: '2026-05-15',
      daysLeft: 2,
      status: 'pending',
      priority: 'high',
      completionRate: 75
    },
    {
      name: 'GSTR-3B',
      description: 'Summary return and tax payment',
      dueDate: '2026-05-20',
      daysLeft: 7,
      status: 'pending',
      priority: 'high',
      completionRate: 45
    },
    {
      name: 'TDS Return',
      description: 'Quarterly TDS filing',
      dueDate: '2026-05-31',
      daysLeft: 18,
      status: 'in-progress',
      priority: 'medium',
      completionRate: 60
    },
    {
      name: 'Income Tax Advance',
      description: 'Advance tax payment',
      dueDate: '2026-06-15',
      daysLeft: 33,
      status: 'pending',
      priority: 'medium',
      completionRate: 20
    },
  ];

  const completedCompliances = [
    { name: 'GSTR-1 (Apr)', date: '2026-04-11', filedOn: '2026-04-10' },
    { name: 'GSTR-3B (Apr)', date: '2026-04-20', filedOn: '2026-04-19' },
    { name: 'ESI Return (Mar)', date: '2026-04-21', filedOn: '2026-04-20' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Alert Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900">Urgent: 3 Deadlines Approaching</h4>
          <p className="text-sm text-red-700 mt-1">You have 3 compliance filings due within the next 7 days. Review and complete them to avoid penalties.</p>
        </div>
      </div>

      {/* Upcoming Compliances */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Compliance Deadlines</CardTitle>
          <CardDescription>Track and manage your regulatory filing requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingCompliances.map((compliance, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{compliance.name}</h4>
                    <Badge variant={getPriorityColor(compliance.priority)}>
                      {compliance.priority}
                    </Badge>
                    {compliance.daysLeft <= 3 && (
                      <Badge variant="destructive" className="animate-pulse">
                        Due Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{compliance.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {compliance.dueDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {compliance.daysLeft} days left
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <FileDown className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button size="sm">
                    <Sparkles className="w-4 h-4 mr-1" />
                    AI Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Data Completion</span>
                  <span>{compliance.completionRate}%</span>
                </div>
                <Progress value={compliance.completionRate} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Compliance Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Calendar</CardTitle>
            <CardDescription>Monthly overview of filing requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-600 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const hasDeadline = [15, 20, 31].includes(day);
                  const isToday = day === 13;
                  return (
                    <div
                      key={day}
                      className={`aspect-square flex items-center justify-center text-sm rounded-lg border ${
                        isToday
                          ? 'bg-blue-600 text-white border-blue-600'
                          : hasDeadline
                          ? 'bg-red-50 text-red-700 border-red-200 font-semibold'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
            <CardDescription>Successfully filed compliance documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedCompliances.map((compliance, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{compliance.name}</p>
                    <p className="text-sm text-gray-600">
                      Filed on {compliance.filedOn} (Due: {compliance.date})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">12</div>
              <p className="text-sm text-gray-600 mt-1">Compliances This Year</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">8</div>
              <p className="text-sm text-gray-600 mt-1">Filed On Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">4</div>
              <p className="text-sm text-gray-600 mt-1">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
