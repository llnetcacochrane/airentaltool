import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { BusinessProvider } from './context/BusinessContext';
import { TenantProvider } from './context/TenantContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { TenantLayout } from './components/TenantLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { usePageTracking } from './hooks/useAnalytics';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Eager load: Public pages needed immediately
import { NewLanding } from './pages/NewLanding';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { RegistrationSuccess } from './pages/RegistrationSuccess';
import { CompleteRegistration } from './pages/CompleteRegistration';

// Lazy load: Registration flows (only one used per session)
const RegisterType1 = lazyWithRetry(() => import('./pages/RegisterType1').then(m => ({ default: m.RegisterType1 })), 'RegisterType1');
const RegisterType2 = lazyWithRetry(() => import('./pages/RegisterType2').then(m => ({ default: m.RegisterType2 })), 'RegisterType2');
const RegisterType3 = lazyWithRetry(() => import('./pages/RegisterType3').then(m => ({ default: m.RegisterType3 })), 'RegisterType3');

// Lazy load: Onboarding and setup wizards (one-time use)
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })), 'Onboarding');
const PropertySetupWizard = lazyWithRetry(() => import('./pages/PropertySetupWizard').then(m => ({ default: m.PropertySetupWizard })), 'PropertySetupWizard');
const BusinessSetupWizardPage = lazyWithRetry(() => import('./pages/BusinessSetupWizard').then(m => ({ default: m.BusinessSetupWizard })), 'BusinessSetupWizard');
const Welcome = lazyWithRetry(() => import('./pages/Welcome').then(m => ({ default: m.Welcome })), 'Welcome');
const GettingStarted = lazyWithRetry(() => import('./pages/GettingStarted').then(m => ({ default: m.GettingStarted })), 'GettingStarted');
const QuickStart = lazyWithRetry(() => import('./pages/QuickStart').then(m => ({ default: m.QuickStart })), 'QuickStart');

// Lazy load: Main application pages
const NewOperationsCenter = lazyWithRetry(() => import('./pages/NewOperationsCenter').then(m => ({ default: m.NewOperationsCenter })), 'NewOperationsCenter');
const BusinessesList = lazyWithRetry(() => import('./pages/BusinessesList').then(m => ({ default: m.BusinessesList })), 'BusinessesList');
const BusinessDetail = lazyWithRetry(() => import('./pages/BusinessDetail').then(m => ({ default: m.BusinessDetail })), 'BusinessDetail');
const Properties = lazyWithRetry(() => import('./pages/Properties').then(m => ({ default: m.Properties })), 'Properties');
const PropertyDetail = lazyWithRetry(() => import('./pages/PropertyDetail').then(m => ({ default: m.PropertyDetail })), 'PropertyDetail');
const UnitDetail = lazyWithRetry(() => import('./pages/UnitDetail').then(m => ({ default: m.UnitDetail })), 'UnitDetail');
const Tenants = lazyWithRetry(() => import('./pages/Tenants').then(m => ({ default: m.Tenants })), 'Tenants');
const Payments = lazyWithRetry(() => import('./pages/Payments').then(m => ({ default: m.Payments })), 'Payments');
const Expenses = lazyWithRetry(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })), 'Expenses');
const Reports = lazyWithRetry(() => import('./pages/Reports').then(m => ({ default: m.Reports })), 'Reports');
const Settings = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })), 'Settings');
const Maintenance = lazyWithRetry(() => import('./pages/Maintenance').then(m => ({ default: m.Maintenance })), 'Maintenance');
const RentOptimization = lazyWithRetry(() => import('./pages/RentOptimization').then(m => ({ default: m.RentOptimization })), 'RentOptimization');
const Applications = lazyWithRetry(() => import('./pages/Applications').then(m => ({ default: m.Applications })), 'Applications');
const PublicPageSettings = lazyWithRetry(() => import('./pages/PublicPageSettings').then(m => ({ default: m.PublicPageSettings })), 'PublicPageSettings');
const Addons = lazyWithRetry(() => import('./pages/Addons').then(m => ({ default: m.Addons })), 'Addons');
const Agreements = lazyWithRetry(() => import('./pages/Agreements'), 'Agreements');
const Help = lazyWithRetry(() => import('./pages/Help').then(m => ({ default: m.Help })), 'Help');

// Lazy load: Super admin pages (rarely accessed)
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })), 'SuperAdminDashboard');
const SuperAdminUsers = lazyWithRetry(() => import('./pages/SuperAdminUsers').then(m => ({ default: m.SuperAdminUsers })), 'SuperAdminUsers');
const SystemConfiguration = lazyWithRetry(() => import('./pages/SystemConfiguration').then(m => ({ default: m.SystemConfiguration })), 'SystemConfiguration');
const PackageManagement = lazyWithRetry(() => import('./pages/PackageManagement').then(m => ({ default: m.PackageManagement })), 'PackageManagement');
const FeatureManagement = lazyWithRetry(() => import('./pages/FeatureManagement').then(m => ({ default: m.FeatureManagement })), 'FeatureManagement');
const OrganizationPackageSettings = lazyWithRetry(() => import('./pages/OrganizationPackageSettings').then(m => ({ default: m.OrganizationPackageSettings })), 'OrganizationPackageSettings');
const ImpersonateUser = lazyWithRetry(() => import('./pages/ImpersonateUser').then(m => ({ default: m.ImpersonateUser })), 'ImpersonateUser');
const PropertyOwners = lazyWithRetry(() => import('./pages/PropertyOwners'), 'PropertyOwners');
const AIApiKeys = lazyWithRetry(() => import('./pages/AIApiKeys').then(m => ({ default: m.AIApiKeys })), 'AIApiKeys');
const BusinessUsers = lazyWithRetry(() => import('./pages/BusinessUsers').then(m => ({ default: m.BusinessUsers })), 'BusinessUsers');
const EmailAccounts = lazyWithRetry(() => import('./pages/EmailAccounts').then(m => ({ default: m.EmailAccounts })), 'EmailAccounts');

// Lazy load: Tenant portal pages
const TenantPortal = lazyWithRetry(() => import('./pages/TenantPortal').then(m => ({ default: m.TenantPortal })), 'TenantPortal');
const TenantSignup = lazyWithRetry(() => import('./pages/TenantSignup').then(m => ({ default: m.TenantSignup })), 'TenantSignup');
const TenantDashboard = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantDashboard })), 'TenantDashboard');
const TenantPayments = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantPayments })), 'TenantPayments');
const TenantMaintenance = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantMaintenance })), 'TenantMaintenance');
const TenantDocuments = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantDocuments })), 'TenantDocuments');
const TenantMessages = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantMessages })), 'TenantMessages');
const TenantProfile = lazyWithRetry(() => import('./pages/tenant').then(m => ({ default: m.TenantProfile })), 'TenantProfile');

// Lazy load: Property owner portal pages
const OwnerLayout = lazyWithRetry(() => import('./components/OwnerLayout').then(m => ({ default: m.OwnerLayout })), 'OwnerLayout');
const OwnerDashboard = lazyWithRetry(() => import('./pages/owner-portal/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })), 'OwnerDashboard');
const OwnerProperties = lazyWithRetry(() => import('./pages/owner-portal/OwnerProperties').then(m => ({ default: m.OwnerProperties })), 'OwnerProperties');
const OwnerReports = lazyWithRetry(() => import('./pages/owner-portal/OwnerReports').then(m => ({ default: m.OwnerReports })), 'OwnerReports');
const OwnerMessages = lazyWithRetry(() => import('./pages/owner-portal/OwnerMessages').then(m => ({ default: m.OwnerMessages })), 'OwnerMessages');

// Lazy load: Public pages
const Pricing = lazyWithRetry(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })), 'Pricing');
const About = lazyWithRetry(() => import('./pages/About').then(m => ({ default: m.About })), 'About');
const ApplicationLanding = lazyWithRetry(() => import('./pages/ApplicationLanding').then(m => ({ default: m.ApplicationLanding })), 'ApplicationLanding');
const ApplicationForm = lazyWithRetry(() => import('./pages/ApplicationForm').then(m => ({ default: m.ApplicationForm })), 'ApplicationForm');
const AgreementSigning = lazyWithRetry(() => import('./pages/AgreementSigning'), 'AgreementSigning');
const PublicBusinessPage = lazyWithRetry(() => import('./pages/PublicBusinessPage').then(m => ({ default: m.PublicBusinessPage })), 'PublicBusinessPage');
const PublicPropertyPage = lazyWithRetry(() => import('./pages/PublicPropertyPage').then(m => ({ default: m.PublicPropertyPage })), 'PublicPropertyPage');
const PublicUnitPage = lazyWithRetry(() => import('./pages/PublicUnitPage').then(m => ({ default: m.PublicUnitPage })), 'PublicUnitPage');

// Lazy load: Diagnostic tools (dev/admin only)
const DiagnosticPanel = lazyWithRetry(() => import('./pages/DiagnosticPanel').then(m => ({ default: m.DiagnosticPanel })), 'DiagnosticPanel');
const EmailDiagnostics = lazyWithRetry(() => import('./pages/EmailDiagnostics').then(m => ({ default: m.EmailDiagnostics })), 'EmailDiagnostics');

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Analytics tracking wrapper component
function AppWithAnalytics() {
  usePageTracking(); // Track page views automatically
  return (
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

      {/* Public Browse Routes */}
      <Route path="/browse/:businessSlug" element={<PublicBusinessPage />} />
      <Route path="/browse/:businessSlug/:propertySlug" element={<PublicPropertyPage />} />
      <Route path="/browse/:businessSlug/:propertySlug/:unitId" element={<PublicUnitPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/complete-registration" element={<CompleteRegistration />} />
      <Route path="/register/single-landlord" element={<RegisterType1 />} />
      <Route path="/register/multi-property" element={<RegisterType2 />} />
      <Route path="/register/property-manager" element={<RegisterType3 />} />
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
        path="/onboarding/property"
        element={
          <ProtectedRoute>
            <PropertySetupWizard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/business"
        element={
          <ProtectedRoute>
            <BusinessSetupWizardPage />
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
        path="/super-admin/features"
        element={
          <ProtectedRoute>
            <FeatureManagement />
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
        path="/super-admin/email-accounts"
        element={
          <ProtectedRoute>
            <EmailAccounts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/impersonate/:userId"
        element={
          <ProtectedRoute>
            <ImpersonateUser />
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
        <Route path="/business/:businessId/settings" element={<Navigate to="/settings" replace />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:propertyId" element={<PropertyDetail />} />
        <Route path="/unit/:unitId" element={<UnitDetail />} />
        <Route path="/property-owners" element={<PropertyOwners />} />
        <Route path="/users" element={<BusinessUsers />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/public-page" element={<PublicPageSettings />} />
        <Route path="/agreements" element={<Agreements />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/rent-optimization" element={<RentOptimization />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/addons" element={<Addons />} />
        <Route path="/packages" element={<Pricing />} />
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
      {/* Property Owner Portal Routes */}
      <Route
        element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/owner-portal" element={<OwnerDashboard />} />
        <Route path="/owner-portal/properties" element={<OwnerProperties />} />
        <Route path="/owner-portal/reports" element={<OwnerReports />} />
        <Route path="/owner-portal/messages" element={<OwnerMessages />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <GoogleAnalytics />
      <AuthProvider>
        <BusinessProvider>
          <TenantProvider>
            <BrandingProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AppWithAnalytics />
                  </Suspense>
                </ErrorBoundary>
              </ToastProvider>
            </BrandingProvider>
          </TenantProvider>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
