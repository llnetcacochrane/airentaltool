import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { TenantProvider } from './context/TenantContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { TenantLayout } from './components/TenantLayout';
import { NewLanding } from './pages/NewLanding';
import { Pricing } from './pages/Pricing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { NewOperationsCenter } from './pages/NewOperationsCenter';
import { BusinessesList } from './pages/BusinessesList';
import { BusinessDetail } from './pages/BusinessDetail';
import { Properties } from './pages/Properties';
import { Tenants } from './pages/Tenants';
import { Payments } from './pages/Payments';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Maintenance } from './pages/Maintenance';
import { RentOptimization } from './pages/RentOptimization';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SuperAdminUsers } from './pages/SuperAdminUsers';
import { SystemConfiguration } from './pages/SystemConfiguration';
import { PackageManagement } from './pages/PackageManagement';
import { OrganizationPackageSettings } from './pages/OrganizationPackageSettings';
import { TenantPortal } from './pages/TenantPortal';
import { TenantSignup } from './pages/TenantSignup';
import { ApplicationLanding } from './pages/ApplicationLanding';
import { ApplicationForm } from './pages/ApplicationForm';
import { Applications } from './pages/Applications';
import { Addons } from './pages/Addons';
import { About } from './pages/About';
import PropertyOwners from './pages/PropertyOwners';
import { DiagnosticPanel } from './pages/DiagnosticPanel';
import { AIApiKeys } from './pages/AIApiKeys';
import { EmailDiagnostics } from './pages/EmailDiagnostics';
import { GettingStarted } from './pages/GettingStarted';
import { Welcome } from './pages/Welcome';
import { QuickStart } from './pages/QuickStart';
import { Help } from './pages/Help';
import Agreements from './pages/Agreements';
import AgreementSigning from './pages/AgreementSigning';
import {
  TenantDashboard,
  TenantPayments,
  TenantMaintenance,
  TenantDocuments,
  TenantMessages,
  TenantProfile,
} from './pages/tenant';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortfolioProvider>
          <TenantProvider>
            <BrandingProvider>
              <ToastProvider>
              <Routes>
          <Route path="/" element={<NewLanding />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/diagnostics" element={<DiagnosticPanel />} />
          <Route path="/tenant-portal" element={<TenantPortal />} />
          <Route path="/tenant-signup" element={<TenantSignup />} />
          <Route path="/apply/:code" element={<ApplicationLanding />} />
          <Route path="/apply/:code/form" element={<ApplicationForm />} />
          <Route path="/agreement/:agreementId" element={<AgreementSigning />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quick-start"
            element={
              <ProtectedRoute>
                <QuickStart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/config"
            element={
              <ProtectedRoute>
                <SystemConfiguration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/packages"
            element={
              <ProtectedRoute>
                <PackageManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <ProtectedRoute>
                <SuperAdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/organizations/:organizationId/package"
            element={
              <ProtectedRoute>
                <OrganizationPackageSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/ai-keys"
            element={
              <ProtectedRoute>
                <AIApiKeys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/email-diagnostics"
            element={
              <ProtectedRoute>
                <EmailDiagnostics />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<NewOperationsCenter />} />
            <Route path="/getting-started" element={<GettingStarted />} />
            <Route path="/help" element={<Help />} />
            <Route path="/businesses" element={<BusinessesList />} />
            <Route path="/business/:businessId" element={<BusinessDetail />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/property-owners" element={<PropertyOwners />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/agreements" element={<Agreements />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/rent-optimization" element={<RentOptimization />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/addons" element={<Addons />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Tenant Portal Routes */}
          <Route
            element={
              <ProtectedRoute>
                <TenantLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/my-rental" element={<TenantDashboard />} />
            <Route path="/my-rental/payments" element={<TenantPayments />} />
            <Route path="/my-rental/maintenance" element={<TenantMaintenance />} />
            <Route path="/my-rental/documents" element={<TenantDocuments />} />
            <Route path="/my-rental/messages" element={<TenantMessages />} />
            <Route path="/my-rental/profile" element={<TenantProfile />} />
          </Route>
              </Routes>
              </ToastProvider>
            </BrandingProvider>
          </TenantProvider>
        </PortfolioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
