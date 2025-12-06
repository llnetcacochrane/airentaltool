import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Home, Users, DollarSign, Building2, FileText, TrendingUp,
  Sparkles, CheckCircle2, ArrowRight, Zap, HelpCircle, Settings
} from 'lucide-react';

export function GettingStarted() {
  const { userProfile, currentBusiness } = useAuth();
  const navigate = useNavigate();
  const packageTier = userProfile?.selected_tier || 'free';

  const getPackageInfo = () => {
    switch (packageTier) {
      case 'free':
        return {
          title: 'Free Tier - Getting Started',
          description: 'Perfect for landlords managing a few properties',
          features: [
            { name: 'Up to 5 Units', included: true },
            { name: 'Basic Tenant Management', included: true },
            { name: 'Payment Tracking', included: true },
            { name: 'Maintenance Requests', included: true }
          ],
          workflow: [
            {
              step: 1,
              icon: Home,
              title: 'Add Your Properties',
              description: 'Start by adding your rental properties and their units',
              actions: [
                'Go to Properties section',
                'Click "Add Property"',
                'Enter property details and unit information',
                'Save and repeat for additional properties'
              ],
              link: '/properties'
            },
            {
              step: 2,
              icon: Users,
              title: 'Manage Tenants',
              description: 'Add your current tenants and their lease information',
              actions: [
                'Navigate to Tenants section',
                'Click "Add Tenant"',
                'Enter tenant contact information',
                'Assign tenant to a unit',
                'Add lease details and rent amount'
              ],
              link: '/tenants'
            },
            {
              step: 3,
              icon: DollarSign,
              title: 'Track Payments',
              description: 'Record and monitor rent payments',
              actions: [
                'Go to Payments section',
                'Record incoming rent payments',
                'View payment history',
                'Track outstanding balances'
              ],
              link: '/payments'
            }
          ]
        };

      case 'basic':
      case 'landlord':
        return {
          title: 'Landlord Plan - Getting Started',
          description: 'Comprehensive tools for managing multiple properties',
          features: [
            { name: 'Unlimited Units', included: true },
            { name: 'Advanced Reporting', included: true },
            { name: 'Tenant Portal', included: true },
            { name: 'Financial Analytics', included: true },
            { name: 'Document Management', included: true }
          ],
          workflow: [
            {
              step: 1,
              icon: Settings,
              title: 'Configure Your Organization',
              description: 'Set up your business profile and preferences',
              actions: [
                'Go to Settings',
                'Complete organization profile',
                'Set up payment methods',
                'Configure notification preferences',
                'Customize document templates'
              ],
              link: '/settings'
            },
            {
              step: 2,
              icon: Home,
              title: 'Import or Add Properties',
              description: 'Bulk import or manually add your properties',
              actions: [
                'Choose import method (CSV or manual)',
                'Add property details and amenities',
                'Create units with specifications',
                'Upload property photos',
                'Set rental rates'
              ],
              link: '/properties'
            },
            {
              step: 3,
              icon: Users,
              title: 'Setup Tenant Management',
              description: 'Add tenants and configure the tenant portal',
              actions: [
                'Import or add tenant information',
                'Create lease agreements',
                'Enable tenant portal access',
                'Set up online payment collection',
                'Configure maintenance request system'
              ],
              link: '/tenants'
            },
            {
              step: 4,
              icon: FileText,
              title: 'Configure Reporting',
              description: 'Set up financial reports and analytics',
              actions: [
                'Review available reports',
                'Schedule automated reports',
                'Set up expense tracking',
                'Configure tax reporting',
                'Create custom dashboards'
              ],
              link: '/reports'
            }
          ]
        };

      case 'professional':
      case 'management-company':
        return {
          title: 'Management Company Plan - Getting Started',
          description: 'Enterprise-grade tools for property management companies',
          features: [
            { name: 'Multi-Portfolio Management', included: true },
            { name: 'White Label Branding', included: true },
            { name: 'AI-Powered Features', included: true },
            { name: 'Owner Portal', included: true },
            { name: 'Advanced Automation', included: true },
            { name: 'API Access', included: true }
          ],
          workflow: [
            {
              step: 1,
              icon: Building2,
              title: 'Create Business Entities',
              description: 'Set up your management company structure',
              actions: [
                'Go to Businesses section',
                'Create business entities',
                'Set up separate portfolios',
                'Configure branding per entity',
                'Assign team members and permissions'
              ],
              link: '/businesses'
            },
            {
              step: 2,
              icon: Home,
              title: 'Bulk Import Properties',
              description: 'Import your entire property portfolio',
              actions: [
                'Download CSV templates',
                'Prepare property data',
                'Import properties in bulk',
                'Assign properties to portfolios',
                'Link property owners',
                'Configure property-specific settings'
              ],
              link: '/properties'
            },
            {
              step: 3,
              icon: Users,
              title: 'Configure Advanced Features',
              description: 'Enable tenant portal and applications',
              actions: [
                'Enable tenant self-service portal',
                'Set up online application system',
                'Configure screening criteria',
                'Enable online rent collection',
                'Set up automated communications'
              ],
              link: '/applications'
            },
            {
              step: 4,
              icon: Sparkles,
              title: 'Setup AI Tools',
              description: 'Configure AI-powered optimization features',
              actions: [
                'Go to Rent Optimization',
                'Review AI rent recommendations',
                'Enable predictive maintenance',
                'Configure payment risk scoring',
                'Set up lease renewal predictions',
                'Enable smart analytics'
              ],
              link: '/rent-optimization'
            },
            {
              step: 5,
              icon: TrendingUp,
              title: 'Configure Reporting & Analytics',
              description: 'Set up comprehensive reporting for owners',
              actions: [
                'Create owner portal access',
                'Configure financial reports',
                'Set up automated owner statements',
                'Enable portfolio analytics',
                'Create custom dashboards',
                'Schedule report distribution'
              ],
              link: '/reports'
            }
          ]
        };

      default:
        return null;
    }
  };

  const packageData = getPackageInfo();

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Package Selected</h2>
          <p className="text-gray-600 mb-6">Please select a package to continue</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-6 flex items-center gap-2 text-white hover:text-blue-100 transition"
          >
            <ArrowRight className="rotate-180" size={20} />
            Back to Dashboard
          </button>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">{packageData.title}</h1>
            <p className="text-xl text-blue-100 mb-8">{packageData.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {packageData.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-200" />
                  <span className="text-sm">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Setup Workflow</h2>
              <p className="text-gray-600">Follow these steps to get started quickly</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {packageData.workflow.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              <div className="flex flex-col md:flex-row">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 md:w-80 flex-shrink-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>

                <div className="flex-1 p-8">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Action Steps
                  </h4>
                  <ul className="space-y-3 mb-6">
                    {item.actions.map((action, actionIdx) => (
                      <li key={actionIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate(item.link)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Go to {item.title}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Need Help?</h3>
              <p className="text-blue-100 mb-6">
                Our support team is here to help you get started. Check out our documentation or reach out directly.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold">
                  View Documentation
                </button>
                <button className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition font-semibold">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
