import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessService } from '../services/businessService';
import { propertyService } from '../services/propertyService';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Business } from '../types';
import {
  ArrowLeft, Home, FileText, Wrench, DollarSign, ChevronRight,
  Users, Calendar, TrendingUp, Settings, AlertCircle, Plus, Globe, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function BusinessDetail() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    openMaintenance: 0,
    expiringLeases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const businessData = await businessService.getBusiness(businessId);
      setBusiness(businessData);

      const propertiesData = await propertyService.getBusinessProperties(businessId);
      setProperties(propertiesData);

      setStats({
        totalProperties: propertiesData.length,
        totalUnits: propertiesData.reduce((sum, p) => sum + (p.total_units || 0), 0),
        occupiedUnits: 0,
        totalTenants: 0,
        monthlyRevenue: 0,
        openMaintenance: 0,
        expiringLeases: 0,
      });
    } catch (err) {
      console.error('Failed to load business data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePublicPage = async () => {
    if (!business || !businessId) return;
    try {
      const newEnabled = !business.public_page_enabled;
      const { error } = await supabase
        .from('businesses')
        .update({ public_page_enabled: newEnabled })
        .eq('id', businessId);

      if (error) throw error;

      setBusiness({ ...business, public_page_enabled: newEnabled });
    } catch (err) {
      console.error('Failed to toggle public page:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Business not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/businesses')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <Breadcrumbs
                items={[
                  { label: 'Businesses', href: '/businesses' },
                  { label: business.business_name }
                ]}
                className="mb-2"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{business.business_name}</h1>
            </div>
            <button
              onClick={() => navigate(`/business/${businessId}/settings`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Properties</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Units</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.occupiedUnits}/{stats.totalUnits}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {(stats.openMaintenance > 0 || stats.expiringLeases > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Attention Required</h3>
                <div className="space-y-1 text-sm text-amber-800">
                  {stats.openMaintenance > 0 && (
                    <p>{stats.openMaintenance} open maintenance request{stats.openMaintenance > 1 ? 's' : ''}</p>
                  )}
                  {stats.expiringLeases > 0 && (
                    <p>{stats.expiringLeases} lease{stats.expiringLeases > 1 ? 's' : ''} expiring soon</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-xl p-6 border ${business?.public_page_enabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${business?.public_page_enabled ? 'bg-blue-100' : 'bg-gray-200'}`}>
              <Globe className={`w-6 h-6 ${business?.public_page_enabled ? 'text-blue-600' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Public Business Page</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={business?.public_page_enabled || false}
                    onChange={togglePublicPage}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {business?.public_page_enabled
                  ? 'Your business page is visible to the public. Prospects can browse your properties and apply for rentals.'
                  : 'Enable your public page to allow prospects to discover your properties and submit rental applications.'}
              </p>
              {business?.public_page_enabled && business?.public_page_slug && (
                <div className="flex items-center gap-2">
                  <a
                    href={`/browse/${business.public_page_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <ExternalLink size={16} />
                    View Public Page
                  </a>
                  <button
                    onClick={() => navigate('/settings?tab=public-page')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    <Settings size={16} />
                    Configure Page
                  </button>
                </div>
              )}
              {business?.public_page_enabled && !business?.public_page_slug && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Set up your public page URL in{' '}
                    <button
                      onClick={() => navigate('/settings?tab=public-page')}
                      className="font-medium underline hover:no-underline"
                    >
                      Settings
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Properties</h2>
            <button
              onClick={() => navigate(`/business/${businessId}/properties/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={18} />
              Add Property
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Yet</h3>
              <p className="text-gray-600 mb-6">Add your first property to this business</p>
              <button
                onClick={() => navigate(`/properties`, { state: { showAddProperty: true, businessId: businessId } })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus size={20} />
                Add Property
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition">
                        <Home className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{property.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {property.address_line1}, {property.city}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            {property.total_units} units
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">
                            {property.property_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/agreements`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Agreements</h3>
            <p className="text-sm text-gray-600">Contracts & leases</p>
          </button>

          <button
            onClick={() => navigate(`/maintenance`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Maintenance</h3>
            <p className="text-sm text-gray-600">{stats.openMaintenance} open requests</p>
          </button>

          <button
            onClick={() => navigate(`/payments`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Financials</h3>
            <p className="text-sm text-gray-600">Payments & expenses</p>
          </button>

          <button
            onClick={() => navigate(`/tenants`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-purple-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tenants</h3>
            <p className="text-sm text-gray-600">{stats.totalTenants} active tenants</p>
          </button>

          <button
            onClick={() => navigate(`/applications`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Applications</h3>
            <p className="text-sm text-gray-600">Rental applications</p>
          </button>

          <button
            onClick={() => navigate(`/reports`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reports</h3>
            <p className="text-sm text-gray-600">Analytics & insights</p>
          </button>
        </div>
      </div>
    </div>
  );
}
