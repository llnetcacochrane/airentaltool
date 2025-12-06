import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  Book,
  Video,
  MessageCircle,
  Home,
  Users,
  CreditCard,
  Wrench,
  FileText,
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowLeft,
  ExternalLink,
  Mail,
  Sparkles,
} from 'lucide-react';

interface HelpTopic {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  steps?: string[];
}

const helpTopics: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Sparkles,
    description: 'Learn the basics of AI Rental Tools',
    articles: [
      {
        id: 'quick-setup',
        title: 'Quick Setup Guide',
        content: 'Get your rental management system up and running in minutes.',
        steps: [
          'Add your first property with the address and basic details',
          'Create units within your property (apartments, houses, etc.)',
          'Add tenants and link them to their respective units',
          'Start tracking rent payments and maintenance requests',
        ],
      },
      {
        id: 'navigation',
        title: 'Navigating the Dashboard',
        content: 'Understanding the main navigation and dashboard features.',
        steps: [
          'The sidebar provides quick access to all main sections',
          'Dashboard shows your portfolio health score and key metrics',
          'Use the search feature to find properties, tenants, or payments',
          'Click your profile icon to access settings and logout',
        ],
      },
      {
        id: 'account-tiers',
        title: 'Understanding Account Tiers',
        content: 'Learn about the different pricing tiers and their features.',
        steps: [
          'Free tier: Up to 5 units, basic features',
          'Landlord tier: Unlimited units, advanced reporting, tenant portal',
          'Professional tier: AI features, rent optimization, priority support',
          'Management Company: Multi-business, white-label, API access',
        ],
      },
    ],
  },
  {
    id: 'properties',
    title: 'Managing Properties',
    icon: Home,
    description: 'Add and manage your rental properties',
    articles: [
      {
        id: 'add-property',
        title: 'Adding a New Property',
        content: 'Learn how to add properties to your portfolio.',
        steps: [
          'Go to Properties from the sidebar',
          'Click "Add Property" button',
          'Enter the property name and address',
          'Select the property type (residential, commercial, etc.)',
          'Save the property to continue',
        ],
      },
      {
        id: 'add-units',
        title: 'Creating Rental Units',
        content: 'Set up individual rental units within your properties.',
        steps: [
          'Click on a property to view details',
          'Click "Add Unit" in the Units section',
          'Enter unit number/name, bedrooms, bathrooms',
          'Set the monthly rent amount',
          'Add any additional amenities or notes',
        ],
      },
      {
        id: 'property-photos',
        title: 'Uploading Property Photos',
        content: 'Add photos to make your properties stand out.',
        steps: [
          'Open the property details page',
          'Click on the photo gallery section',
          'Drag and drop images or click to upload',
          'Arrange photos in your preferred order',
        ],
      },
    ],
  },
  {
    id: 'tenants',
    title: 'Tenant Management',
    icon: Users,
    description: 'Manage tenants and lease agreements',
    articles: [
      {
        id: 'add-tenant',
        title: 'Adding a New Tenant',
        content: 'Learn how to add tenants to your system.',
        steps: [
          'Go to Tenants from the sidebar',
          'Click "Add Tenant" button',
          'Enter tenant contact information',
          'Select the unit they will occupy',
          'Add lease start and end dates',
          'Set up the monthly rent amount',
        ],
      },
      {
        id: 'tenant-portal',
        title: 'Setting Up Tenant Portal Access',
        content: 'Give tenants access to their self-service portal.',
        steps: [
          'Open the tenant details page',
          'Click "Send Portal Invitation"',
          'The tenant receives an email with their invite code',
          'They sign up at /tenant-signup with their code',
          'Once registered, they can view payments, submit maintenance requests, and more',
        ],
      },
      {
        id: 'lease-tracking',
        title: 'Tracking Lease Expiration',
        content: 'Stay on top of lease renewals and expirations.',
        steps: [
          'Dashboard shows upcoming lease expirations',
          'Set up automatic reminders for expiring leases',
          'Review renewal opportunities in the Renewals section',
          'Contact tenants about renewal options early',
        ],
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payment Tracking',
    icon: CreditCard,
    description: 'Track rent payments and financial data',
    articles: [
      {
        id: 'record-payment',
        title: 'Recording a Payment',
        content: 'Track rent and other payments from tenants.',
        steps: [
          'Go to Payments from the sidebar',
          'Click "Record Payment" button',
          'Select the tenant making the payment',
          'Enter the amount and payment date',
          'Choose the payment method (cash, check, etc.)',
          'Add any notes and save',
        ],
      },
      {
        id: 'payment-history',
        title: 'Viewing Payment History',
        content: 'Review past payments and outstanding balances.',
        steps: [
          'Go to Payments section',
          'Use filters to narrow down by tenant, property, or date',
          'Click on any payment to view details',
          'Export payment history for accounting',
        ],
      },
      {
        id: 'late-payments',
        title: 'Handling Late Payments',
        content: 'Manage overdue rent and late fees.',
        steps: [
          'Dashboard shows at-risk tenants with payment history issues',
          'Send payment reminders via the notification system',
          'Track late fees automatically',
          'Generate payment demand letters if needed',
        ],
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance Requests',
    icon: Wrench,
    description: 'Handle maintenance and repair requests',
    articles: [
      {
        id: 'create-request',
        title: 'Creating a Maintenance Request',
        content: 'Log and track maintenance issues.',
        steps: [
          'Go to Maintenance from the sidebar',
          'Click "New Request" button',
          'Select the property and unit',
          'Describe the issue and set priority',
          'Assign to a contractor if available',
          'Track progress through to completion',
        ],
      },
      {
        id: 'tenant-requests',
        title: 'Tenant-Submitted Requests',
        content: 'Tenants can submit requests through their portal.',
        steps: [
          'Tenants log into their portal at /my-rental',
          'They click on Maintenance section',
          'Submit a new request with description and photos',
          'You receive notification of new requests',
          'Update status as work progresses',
        ],
      },
      {
        id: 'work-orders',
        title: 'Managing Work Orders',
        content: 'Track repairs from request to completion.',
        steps: [
          'Review new requests and prioritize',
          'Assign to vendors or handle in-house',
          'Update status: pending, in progress, completed',
          'Track costs for each repair',
          'Close request and notify tenant',
        ],
      },
    ],
  },
  {
    id: 'documents',
    title: 'Documents & Agreements',
    icon: FileText,
    description: 'Create and manage lease agreements',
    articles: [
      {
        id: 'create-agreement',
        title: 'Creating a Lease Agreement',
        content: 'Generate professional lease agreements.',
        steps: [
          'Go to Agreements from the sidebar',
          'Click "Create Agreement"',
          'Select a template or start from scratch',
          'Fill in property and tenant details',
          'Customize terms and conditions',
          'Send for electronic signature',
        ],
      },
      {
        id: 'e-signatures',
        title: 'Electronic Signatures',
        content: 'Get documents signed online.',
        steps: [
          'Create or upload a document',
          'Add signature fields where needed',
          'Send to tenant via email',
          'Tenant receives link to sign',
          'Both parties receive signed copy',
        ],
      },
      {
        id: 'document-storage',
        title: 'Storing Important Documents',
        content: 'Keep all documents organized and accessible.',
        steps: [
          'Upload documents to tenant or property records',
          'Categorize by type (lease, ID, insurance, etc.)',
          'Set expiration reminders for renewables',
          'Access documents anytime from the tenant profile',
        ],
      },
    ],
  },
];

export function Help() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const filteredTopics = helpTopics.filter(topic => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (topic.title.toLowerCase().includes(query)) return true;
    return topic.articles.some(
      article =>
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query)
    );
  });

  const selectedTopicData = helpTopics.find(t => t.id === selectedTopic);

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-6 transition"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Help Center</h1>
              <p className="text-blue-100">Find answers and learn how to use AI Rental Tools</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {!selectedTopic ? (
          <>
            {/* Topic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredTopics.map(topic => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-200 transition group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-gray-600">{topic.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {topic.articles.length} articles
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <Video className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Video Tutorials</p>
                    <p className="text-sm text-gray-600">Watch step-by-step guides</p>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <Book className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Documentation</p>
                    <p className="text-sm text-gray-600">Read detailed guides</p>
                  </div>
                </a>
                <a
                  href="mailto:support@airentaltools.com"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <Mail className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <p className="text-sm text-gray-600">Get help from our team</p>
                  </div>
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Breadcrumb */}
            <button
              onClick={() => {
                setSelectedTopic(null);
                setExpandedArticle(null);
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
            >
              <ArrowLeft size={18} />
              Back to all topics
            </button>

            {selectedTopicData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Topic Header */}
                <div className="bg-blue-50 p-6 border-b border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <selectedTopicData.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTopicData.title}</h2>
                      <p className="text-gray-600">{selectedTopicData.description}</p>
                    </div>
                  </div>
                </div>

                {/* Articles */}
                <div className="divide-y divide-gray-100">
                  {selectedTopicData.articles.map(article => (
                    <div key={article.id} className="p-6">
                      <button
                        onClick={() =>
                          setExpandedArticle(expandedArticle === article.id ? null : article.id)
                        }
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition">
                          {article.title}
                        </h3>
                        {expandedArticle === article.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {expandedArticle === article.id && (
                        <div className="mt-4">
                          <p className="text-gray-600 mb-4">{article.content}</p>
                          {article.steps && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="font-medium text-gray-900 mb-3">Steps:</p>
                              <ol className="space-y-2">
                                {article.steps.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                      {idx + 1}
                                    </span>
                                    <span className="text-gray-700">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Still Need Help?</h3>
              <p className="text-blue-100">
                Our support team is here to help you get the most out of AI Rental Tools.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="mailto:support@airentaltools.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
