import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { propertyOwnerService } from '../../services/propertyOwnerService';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  DollarSign,
  Home,
  TrendingUp,
  Calendar,
  FileText,
  MessageSquare,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  monthlyIncome: number;
  pendingPayments: number;
  upcomingExpenses: number;
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'message';
  title: string;
  description: string;
  date: string;
}

export function OwnerDashboard() {
  const { userProfile } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get businesses the property owner has access to
      const ownerBusinesses = await propertyOwnerService.getPropertyOwnerBusinesses();
      setBusinesses(ownerBusinesses);

      if (ownerBusinesses.length > 0) {
        const businessId = (ownerBusinesses[0] as any).id;

        // SECURITY: Validate businessId format to prevent injection
        if (!businessId || typeof businessId !== 'string') {
          console.error('Invalid business ID');
          return;
        }

        // Load stats for the first business - RLS policies ensure data isolation
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select('id, units(id, occupancy_status, rent_amount)')
          .eq('business_id', businessId);

        if (propError) {
          console.error('Error loading properties:', propError);
          return;
        }

        const totalProperties = properties?.length || 0;
        let totalUnits = 0;
        let occupiedUnits = 0;
        let monthlyIncome = 0;

        properties?.forEach(prop => {
          const units = prop.units || [];
          totalUnits += units.length;
          units.forEach((unit: any) => {
            if (unit.occupancy_status === 'occupied') {
              occupiedUnits++;
              monthlyIncome += unit.rent_amount || 0;
            }
          });
        });

        // Get pending payments - SECURITY: Filter by business_id for proper isolation
        const { count: pendingPayments } = await supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'pending');

        setStats({
          totalProperties,
          totalUnits,
          occupiedUnits,
          monthlyIncome,
          pendingPayments: pendingPayments || 0,
          upcomingExpenses: 0,
        });

        // Load recent activity (simplified)
        setRecentActivity([
          {
            id: '1',
            type: 'payment',
            title: 'Rent Payment Received',
            description: 'Unit 101 - December rent',
            date: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const occupancyRate = stats && stats.totalUnits > 0
    ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Welcome back, {userProfile?.first_name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your property portfolio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalProperties || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">{stats?.totalUnits || 0} total units</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{occupancyRate}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {stats?.occupiedUnits || 0} of {stats?.totalUnits || 0} units occupied
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Income</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${(stats?.monthlyIncome || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-3 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Based on current rents
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.pendingPayments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Awaiting collection</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/owner-portal/properties"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
          </div>
          <h3 className="font-semibold text-gray-900">View Properties</h3>
          <p className="text-sm text-gray-500 mt-1">
            See details of your properties and units
          </p>
        </Link>

        <Link
          to="/owner-portal/reports"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
          <h3 className="font-semibold text-gray-900">Financial Reports</h3>
          <p className="text-sm text-gray-500 mt-1">
            View income, expenses, and statements
          </p>
        </Link>

        <Link
          to="/owner-portal/messages"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
          </div>
          <h3 className="font-semibold text-gray-900">Messages</h3>
          <p className="text-sm text-gray-500 mt-1">
            Communicate with property manager
          </p>
        </Link>
      </div>

      {/* Business Access */}
      {businesses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Property Portfolio</h2>
          <div className="space-y-3">
            {businesses.map((business: any) => (
              <div
                key={business.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{business.business_name}</p>
                    <p className="text-sm text-gray-500">Property Management</p>
                  </div>
                </div>
                <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full font-medium">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
