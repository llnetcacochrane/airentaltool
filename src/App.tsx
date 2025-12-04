import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import ProfileOnboarding from './pages/ProfileOnboarding';
import { OperationsCenter } from './pages/OperationsCenter';
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
import Agreements from './pages/Agreements';
import AgreementSigning from './pages/AgreementSigning';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortfolioProvider>
          <BrandingProvider>
            <Routes>
          <Route path="/" element={<Landing />} />
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
            path="/profile-onboarding"
            element={
              <ProtectedRoute>
                <ProfileOnboarding />
              </ProtectedRoute>
            }
          />
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
            <Route path="/dashboard" element={<OperationsCenter />} />
            <Route path="/getting-started" element={<GettingStarted />} />
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
            </Routes>
          </BrandingProvider>
        </PortfolioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
