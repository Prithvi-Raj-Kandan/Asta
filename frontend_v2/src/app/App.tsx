import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function ProtectedRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: React.ReactNode }) {
  // Allow bypass during local development by setting localStorage 'dev_bypass' = '1'
  const devBypass = typeof window !== 'undefined' && localStorage.getItem('dev_bypass') === '1';
  return isAuthenticated || devBypass ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showAuth, setShowAuth] = useState(false);
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

  const handleSwitchMode = (newMode: 'login' | 'signup') => {
    setAuthMode(newMode);
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

  if (showAuth) {
    return <AuthPage mode={authMode} onAuth={handleAuth} onBack={handleBackToLanding} onSwitchMode={handleSwitchMode} />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onGetStarted={handleGetStarted} onLogin={handleLogin} />} />
      <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuth} onBack={handleBackToLanding} onSwitchMode={handleSwitchMode} />} />
      <Route path="/signup" element={<AuthPage mode="signup" onAuth={handleAuth} onBack={handleBackToLanding} onSwitchMode={handleSwitchMode} />} />

      {/* Protected Routes - Dashboard and sub-pages */}
      <Route path="/dashboard" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <FinancialDashboard userName={userName} organizationName={organizationName} />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/sales" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <SalesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/purchases" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <PurchasesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/invoices" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <InvoicesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/upload" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <DocumentUpload />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/compliance" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <ComplianceTracker />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <AnalyticsPage userName={userName} organizationName={organizationName} />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/ai-assistant" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <AIAssistant />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <ProfilePage userName={userName} userEmail={userEmail} organizationName={organizationName} />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}