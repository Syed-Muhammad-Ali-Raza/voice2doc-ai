import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicLayout } from './components/PublicLayout'
import { AboutPage } from './pages/AboutPage'
import { BillingPage } from './pages/BillingPage'
import { ContactPage } from './pages/ContactPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { EditorPage } from './pages/EditorPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { PricingPage } from './pages/PricingPage'
import { ProcessingPage } from './pages/ProcessingPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecordPage } from './pages/RecordPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { UploadPage } from './pages/UploadPage'
import { WorkspacesPage } from './pages/WorkspacesPage'
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { HelpCenterPage } from './pages/HelpCenterPage'
import { MemoryPage } from './pages/MemoryPage'
import { AtelierPage } from './pages/AtelierPage'
import { CompliancePage } from './pages/CompliancePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="help" element={<HelpCenterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="workspaces" element={<WorkspacesPage />} />
            <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
            <Route path="record" element={<RecordPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="processing" element={<ProcessingPage />} />
            <Route path="editor/:id" element={<EditorPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="memory" element={<MemoryPage />} />
            <Route path="atelier" element={<AtelierPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
