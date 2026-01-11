import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  MessageSquare,
  Home,
  AlertCircle,
  Download,
} from 'lucide-react';

interface ApplicationDetail {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_phone: string;
  responses: any;
  notes: string | null;
  unit?: {
    id: string;
    unit_number: string;
    monthly_rent_cents: number;
    bedrooms: number;
    bathrooms: number;
    square_feet: number;
  };
  property?: {
    id: string;
    name: string;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
  };
  business?: {
    id: string;
    business_name: string;
    logo_url: string;
    phone: string;
    email: string;
  };
  agreement?: {
    id: string;
    status: string;
    document_url: string | null;
  };
}

interface StatusStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export function ApplicantApplicationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplication();
  }, [applicationId, supabaseUser?.email]);

  const loadApplication = async () => {
    if (!applicationId || !supabaseUser?.email) return;
    setIsLoading(true);
    setError(null);

    try {
      // Get the application
      const { data: app, error: appError } = await supabase
        .from('rental_applications')
        .select(`
          *,
          unit:units(
            id, unit_number, monthly_rent_cents, bedrooms, bathrooms, square_feet
          ),
          property:properties(
            id, name, address_line1, city, state, zip
          )
        `)
        .eq('id', applicationId)
        .eq('applicant_email', supabaseUser.email)
        .single();

      if (appError) throw appError;

      // Get business info (prefer business_id, fall back to organization_id)
      const businessIdKey = app.business_id || app.organization_id;
      const { data: business } = businessIdKey
        ? await supabase
            .from('businesses')
            .select('id, business_name, logo_url, phone, email')
            .eq('id', businessIdKey)
            .single()
        : { data: null };

      // Get agreement if application is approved
      let agreement = null;
      if (app.status === 'approved') {
        const { data: agreementData } = await supabase
          .from('tenant_agreements')
          .select('id, status, document_url')
          .eq('application_id', applicationId)
          .maybeSingle();
        agreement = agreementData;
      }

      setApplication({
        ...app,
        business: business || undefined,
        agreement: agreement || undefined,
      });
    } catch (err: any) {
      console.error('Failed to load application:', err);
      setError(err.message || 'Failed to load application');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusSteps = (status: string): StatusStep[] => {
    const steps: StatusStep[] = [
      {
        key: 'submitted',
        label: 'Submitted',
        description: 'Application submitted for review',
        completed: ['submitted', 'under_review', 'approved', 'denied'].includes(status),
        current: status === 'submitted',
      },
      {
        key: 'under_review',
        label: 'Under Review',
        description: 'Being reviewed by property manager',
        completed: ['under_review', 'approved', 'denied'].includes(status),
        current: status === 'under_review',
      },
      {
        key: 'decision',
        label: 'Decision',
        description: status === 'approved' ? 'Application approved!' : status === 'denied' ? 'Application denied' : 'Awaiting decision',
        completed: ['approved', 'denied'].includes(status),
        current: ['approved', 'denied'].includes(status),
      },
    ];
    return steps;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            <Clock className="w-4 h-4" />
            Submitted
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
            <FileText className="w-4 h-4" />
            Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            <CheckCircle className="w-4 h-4" />
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-full">
            <XCircle className="w-4 h-4" />
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => navigate('/my-applications')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applications
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Application Not Found
            </h3>
            <p className="text-gray-600">
              {error || 'The application you are looking for could not be found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(application.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/my-applications')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                {application.business?.logo_url ? (
                  <img
                    src={application.business.logo_url}
                    alt={application.business.business_name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="w-7 h-7 text-blue-600" />
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                  {application.property?.name} - Unit {application.unit?.unit_number}
                </h1>
                <p className="text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {application.property?.address_line1}, {application.property?.city},{' '}
                  {application.property?.state}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(application.status)}
              <p className="text-sm text-gray-500">
                Submitted {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Application Status</h2>
          <div className="relative">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex-1 relative">
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`absolute top-4 left-[50%] w-full h-0.5 ${
                        step.completed ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                        step.completed
                          ? step.key === 'decision' && application.status === 'denied'
                            ? 'bg-red-500'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      {step.completed ? (
                        step.key === 'decision' && application.status === 'denied' ? (
                          <XCircle className="w-5 h-5 text-white" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-white" />
                        )
                      ) : (
                        <span className="w-3 h-3 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        step.current ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500 text-center max-w-[120px]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Unit Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-gray-400" />
                Unit Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${((application.unit?.monthly_rent_cents || 0) / 100).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bedrooms</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {application.unit?.bedrooms || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bathrooms</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {application.unit?.bathrooms || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sq Ft</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {application.unit?.square_feet?.toLocaleString() || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Application Responses */}
            {application.responses && Object.keys(application.responses).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  Your Application
                </h2>
                <div className="space-y-4">
                  {Object.entries(application.responses).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      <p className="text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lease Agreement (if approved) */}
            {application.status === 'approved' && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Congratulations! Your Application Was Approved
                </h2>
                <p className="text-green-700 mb-4">
                  The property manager has approved your application. You will receive next
                  steps via email regarding lease signing and move-in details.
                </p>
                {application.agreement && (
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Lease Agreement Status:{' '}
                      <span className="font-medium">
                        {application.agreement.status === 'pending'
                          ? 'Awaiting Your Signature'
                          : application.agreement.status}
                      </span>
                    </p>
                    {application.agreement.document_url && (
                      <a
                        href={application.agreement.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        View Lease Agreement
                      </a>
                    )}
                    {application.agreement.status === 'pending' && (
                      <Link
                        to={`/agreement/${application.agreement.id}`}
                        className="inline-flex items-center gap-2 ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <FileText className="w-4 h-4" />
                        Sign Lease
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Denied Message */}
            {application.status === 'denied' && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Application Not Approved
                </h2>
                <p className="text-red-700">
                  Unfortunately, your application was not approved for this property. If you
                  have questions, please contact the property manager using the information
                  provided.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Applicant Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Applicant Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">
                    {application.applicant_first_name} {application.applicant_last_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{application.applicant_email}</span>
                </div>
                {application.applicant_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{application.applicant_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Manager Contact */}
            {application.business && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  Property Manager
                </h2>
                <div className="space-y-3">
                  <p className="font-medium text-gray-900">
                    {application.business.business_name}
                  </p>
                  {application.business.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a
                        href={`tel:${application.business.phone}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {application.business.phone}
                      </a>
                    </div>
                  )}
                  {application.business.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a
                        href={`mailto:${application.business.email}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {application.business.email}
                      </a>
                    </div>
                  )}
                </div>
                <Link
                  to="/my-applications/messages"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                </Link>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                Timeline
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Submitted</span>
                  <span className="text-gray-900">
                    {new Date(application.created_at).toLocaleDateString()}
                  </span>
                </div>
                {application.updated_at !== application.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="text-gray-900">
                      {new Date(application.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
