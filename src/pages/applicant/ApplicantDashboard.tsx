import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  MapPin,
  MessageSquare,
  AlertCircle,
  Home,
  DollarSign,
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  created_at: string;
  unit_id: string;
  property_id: string;
  listing_id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  responses: any;
  unit?: {
    unit_number: string;
    monthly_rent_cents: number;
  };
  property?: {
    name: string;
    address_line1: string;
    city: string;
    state: string;
  };
  business?: {
    id: string;
    business_name: string;
    logo_url: string;
  };
}

interface BusinessCard {
  id: string;
  business_name: string;
  logo_url: string | null;
  application_count: number;
  latest_status: string;
  unread_messages: number;
}

export function ApplicantDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabaseUser } = useAuth();
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    searchParams.get('businessId')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [supabaseUser?.email]);

  useEffect(() => {
    // Update selected business from URL params
    const businessId = searchParams.get('businessId');
    if (businessId) {
      setSelectedBusinessId(businessId);
      loadApplicationsForBusiness(businessId);
    }
  }, [searchParams]);

  const loadData = async () => {
    if (!supabaseUser?.email) return;
    setIsLoading(true);
    try {
      // Get all applications for this user
      const { data: apps, error: appsError } = await supabase
        .from('rental_applications')
        .select(`
          id,
          status,
          created_at,
          unit_id,
          property_id,
          listing_id,
          applicant_first_name,
          applicant_last_name,
          organization_id,
          business_id,
          responses
        `)
        .eq('applicant_email', supabaseUser.email)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Group by business (prefer business_id, fall back to organization_id for legacy)
      const businessMap = new Map<string, BusinessCard>();
      for (const app of apps || []) {
        const businessIdKey = app.business_id || app.organization_id;
        if (!businessIdKey) continue;

        if (!businessMap.has(businessIdKey)) {
          // Fetch business info
          const { data: business } = await supabase
            .from('businesses')
            .select('id, business_name, logo_url')
            .eq('id', businessIdKey)
            .single();

          if (business) {
            businessMap.set(businessIdKey, {
              id: business.id,
              business_name: business.business_name,
              logo_url: business.logo_url,
              application_count: 1,
              latest_status: app.status,
              unread_messages: 0,
            });
          }
        } else {
          const existing = businessMap.get(businessIdKey)!;
          existing.application_count++;
        }
      }

      setBusinessCards(Array.from(businessMap.values()));

      // If no business selected, show all applications
      if (!selectedBusinessId) {
        await loadAllApplicationsWithDetails(apps || []);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllApplicationsWithDetails = async (apps: any[]) => {
    const enrichedApps: Application[] = [];
    for (const app of apps) {
      // Use business_id if available, fall back to organization_id
      const businessIdKey = app.business_id || app.organization_id;

      // Fetch unit, property, and business details
      const [unitRes, propRes, bizRes] = await Promise.all([
        supabase.from('units').select('unit_number, monthly_rent_cents').eq('id', app.unit_id).single(),
        supabase.from('properties').select('name, address_line1, city, state').eq('id', app.property_id).single(),
        businessIdKey
          ? supabase.from('businesses').select('id, business_name, logo_url').eq('id', businessIdKey).single()
          : Promise.resolve({ data: null }),
      ]);

      enrichedApps.push({
        ...app,
        unit: unitRes.data || undefined,
        property: propRes.data || undefined,
        business: bizRes.data || undefined,
      });
    }
    setApplications(enrichedApps);
  };

  const loadApplicationsForBusiness = async (businessId: string) => {
    if (!supabaseUser?.email) return;
    setIsLoading(true);
    try {
      // Query applications by business_id OR organization_id (for backward compatibility)
      const { data: apps, error } = await supabase
        .from('rental_applications')
        .select(`
          id,
          status,
          created_at,
          unit_id,
          property_id,
          listing_id,
          applicant_first_name,
          applicant_last_name,
          organization_id,
          business_id,
          responses
        `)
        .eq('applicant_email', supabaseUser.email)
        .or(`business_id.eq.${businessId},organization_id.eq.${businessId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      await loadAllApplicationsWithDetails(apps?.map(a => ({ ...a, business_id: businessId })) || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            <FileText className="w-3 h-3" />
            Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
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
          <p className="text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            My Applications
          </h1>
          <p className="text-gray-600">
            Track the status of your rental applications
          </p>
        </div>

        {businessCards.length === 0 && applications.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't submitted any rental applications yet. Browse available properties to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Business Cards View - Show when no specific business selected */}
            {!selectedBusinessId && businessCards.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Properties Applied To
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businessCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setSelectedBusinessId(card.id);
                        navigate(`/my-applications?businessId=${card.id}`);
                      }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition">
                          {card.logo_url ? (
                            <img src={card.logo_url} alt={card.business_name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <Building2 className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {card.business_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{card.application_count} application{card.application_count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="mt-2">
                            {getStatusBadge(card.latest_status)}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back Button when viewing specific business */}
            {selectedBusinessId && (
              <button
                onClick={() => {
                  setSelectedBusinessId(null);
                  navigate('/my-applications');
                  loadData();
                }}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back to all businesses</span>
              </button>
            )}

            {/* Applications List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedBusinessId ? 'Applications' : 'All Recent Applications'}
              </h2>
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Home className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {app.property?.name || 'Property'} - Unit {app.unit?.unit_number || 'N/A'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {app.property?.address_line1}, {app.property?.city}, {app.property?.state}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${((app.unit?.monthly_rent_cents || 0) / 100).toLocaleString()}/mo
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Applied {new Date(app.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        {getStatusBadge(app.status)}
                        <button
                          onClick={() => navigate(`/my-applications/${app.id}`)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          ['submitted', 'under_review', 'approved', 'denied'].includes(app.status)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-600">Submitted</span>
                        <div className="flex-1 h-0.5 bg-gray-200" />
                        <div className={`w-3 h-3 rounded-full ${
                          ['under_review', 'approved', 'denied'].includes(app.status)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-600">Review</span>
                        <div className="flex-1 h-0.5 bg-gray-200" />
                        <div className={`w-3 h-3 rounded-full ${
                          app.status === 'approved' ? 'bg-green-500' : app.status === 'denied' ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-600">Decision</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
