import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
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
import { NewsPage } from './components/NewsPage';
import { Toaster } from 'sonner';

function ProtectedRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: React.ReactNode }) {
  // Allow bypass during local development by setting localStorage 'dev_bypass' = '1'
  const devBypass = typeof window !== 'undefined' && localStorage.getItem('dev_bypass') === '1';
  return isAuthenticated || devBypass ? children : <Navigate to="/login" replace />;
}

const USER_STORAGE_KEY = 'asta_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return { name: '', email: '', organization: '' };
    const parsed = JSON.parse(raw) as { name?: string; email?: string; organization?: string };
    return {
      name: parsed.name || '',
      email: parsed.email || '',
      organization: parsed.organization || '',
    };
  } catch {
    return { name: '', email: '', organization: '' };
  }
}

function AppContent() {
  const storedUser = readStoredUser();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showAuth, setShowAuth] = useState(false);
  const [userName, setUserName] = useState(storedUser.name);
  const [userEmail, setUserEmail] = useState(storedUser.email);
  const [organizationName, setOrganizationName] = useState(storedUser.organization);

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
    const nextName = name?.trim() || email.split('@')[0] || 'User';
    const nextOrg = org?.trim() || '';
    setUserEmail(email);
    setUserName(nextName);
    if (org) setOrganizationName(nextOrg);
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ name: nextName, email, organization: nextOrg || organizationName })
    );

    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleBackToLanding = () => {
    setShowAuth(false);
  };

  useEffect(() => {
    if (!isAuthenticated || (userName && userEmail)) return;
    void apiClient
      .getCurrentUser()
      .then((user: { email?: string; business_name?: string }) => {
        const nextEmail = user.email || '';
        const nextName = user.business_name || nextEmail.split('@')[0] || 'User';
        const nextOrg = user.business_name || '';
        setUserEmail(nextEmail);
        setUserName(nextName);
        setOrganizationName(nextOrg);
        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({ name: nextName, email: nextEmail, organization: nextOrg })
        );
      })
      .catch(() => {
        /* keep empty labels if the session cannot be restored */
      });
  }, [isAuthenticated, userName, userEmail]);

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
      <Route path="/news" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <DashboardLayout userName={userName} userEmail={userEmail}>
            <NewsPage />
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
      <Toaster richColors position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}