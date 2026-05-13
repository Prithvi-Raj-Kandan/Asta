import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { FileText, Sparkles, Calendar, BarChart3, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">CompliancePro</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onLogin}>Login</Button>
            <Button onClick={onGetStarted}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Compliance Management
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            All-in-One Compliance Platform for SMEs
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Manage financial data, track compliance deadlines, and generate GST returns with AI assistance.
            Everything you need in one powerful platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onGetStarted}>
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for Compliance Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: FileText,
              title: 'Document Management',
              description: 'Upload invoices, bills, and receipts. AI automatically extracts and categorizes data.',
              color: 'blue'
            },
            {
              icon: Calendar,
              title: 'Deadline Tracking',
              description: 'Never miss a compliance deadline. Get alerts for GSTR-1, GSTR-3B, TDS, and more.',
              color: 'purple'
            },
            {
              icon: Sparkles,
              title: 'AI Assistant',
              description: 'Generate compliance documents instantly. Get answers to tax and regulatory questions.',
              color: 'pink'
            },
            {
              icon: BarChart3,
              title: 'Financial Analytics',
              description: 'Track revenue, expenses, and profit trends. Make data-driven business decisions.',
              color: 'green'
            },
            {
              icon: Shield,
              title: 'Compliance Score',
              description: 'Monitor your compliance health in real-time with actionable insights.',
              color: 'orange'
            },
            {
              icon: CheckCircle2,
              title: 'Auto-Generation',
              description: 'Generate GST returns, TDS forms, and other compliance documents with one click.',
              color: 'indigo'
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-lg bg-${feature.color}-100 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Why SMEs Choose CompliancePro</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div>
                <div className="text-4xl font-bold mb-2">85%</div>
                <p className="text-blue-100">Time Saved on Compliance</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <p className="text-blue-100">Accurate Data Extraction</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <p className="text-blue-100">SMEs Trust Us</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Simplify Your Compliance?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join hundreds of SMEs who trust CompliancePro for their compliance needs.
          </p>
          <Button size="lg" onClick={onGetStarted}>
            Start Your Free Trial
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <p>&copy; 2026 CompliancePro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
