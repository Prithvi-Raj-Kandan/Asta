import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { DashboardLayout } from './components/DashboardLayout';
import { FinancialDashboard } from './components/FinancialDashboard';
import { SalesPage } from './components/SalesPage';
import { PurchasesPage } from './components/PurchasesPage';
import { InvoicesPage } from './components/InvoicesPage';
import { DocumentUpload } from './components/DocumentUpload';
import { ComplianceTracker } from './components/ComplianceTracker';
import { AIAssistant } from './components/AIAssistant';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { AnalyticsPage } from './components/AnalyticsPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleAuth = (email: string, name?: string, org?: string) => {
    setUserEmail(email);
    if (name) setUserName(name);
    if (org) setOrganizationName(org);

    if (authMode === 'login') {
      setUserName('John Doe');
      setOrganizationName('Acme Corporation');
    }

    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleBackToLanding = () => {
    setShowAuth(false);
  };

  if (!isAuthenticated && !showAuth) {
    return <LandingPage onGetStarted={handleGetStarted} onLogin={handleLogin} />;
  }

  if (showAuth) {
    return <AuthPage mode={authMode} onAuth={handleAuth} onBack={handleBackToLanding} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <FinancialDashboard userName={userName} organizationName={organizationName} />;
      case 'sales':
        return <SalesPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'upload':
        return <DocumentUpload />;
      case 'compliance':
        return <ComplianceTracker />;
      case 'analytics':
        return <AnalyticsPage userName={userName} organizationName={organizationName} />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'profile':
        return <ProfilePage userName={userName} userEmail={userEmail} organizationName={organizationName} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <FinancialDashboard userName={userName} organizationName={organizationName} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={userName}
      userEmail={userEmail}
    >
      {renderContent()}
    </DashboardLayout>
  );
}