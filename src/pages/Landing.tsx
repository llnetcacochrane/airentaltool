import { Link } from 'react-router-dom';
import { Users, ArrowRight, Zap, Brain, AlertCircle, TrendingUp, Wrench, Star, Building2, Home, Users2, DollarSign, FileText, BarChart3, Shield, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { PublicHeader } from '../components/PublicHeader';

export function Landing() {
  useEffect(() => {
    document.title = 'AI Rental Tools - AI-Powered Property Management Software';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Smart property management software with AI-powered rent optimization, payment prediction, and automated maintenance tracking. Start your 14-day free trial today.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                <Star size={16} className="fill-current" />
                Trusted by Property Managers Across North America
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Simplify Property Management with AI
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                From single-unit landlords to multi-building portfolios, manage everything in one place.
                Track rent, tenants, maintenance, and financials with intelligent automation that saves you 10+ hours per week.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                >
                  Get Started
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-lg border-2 border-gray-200 hover:border-gray-300 transition"
                >
                  Learn More
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  Cancel anytime
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-gray-900">$47,500</p>
                      <p className="text-sm text-green-600 font-semibold mt-1">↑ 15% vs last month</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
                      <p className="text-3xl font-bold text-gray-900">98.5%</p>
                      <p className="text-sm text-blue-600 font-semibold mt-1">↑ 3% improvement</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <Building2 className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">24</p>
                      <p className="text-sm text-gray-600">Properties</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <Home className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">186</p>
                      <p className="text-sm text-gray-600">Units</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Who We Serve
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're managing one property or a hundred, AI Rental Tools scales with your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <CustomerCard
              icon={Home}
              title="Individual Landlords"
              description="Own 1-5 rental properties? Manage tenants, rent collection, and maintenance from your phone. Perfect for side-hustle landlords."
              features={[
                {
                  name: 'Simple rent tracking',
                  tooltip: 'Track rent payments, late fees, and payment history for all your tenants. Automated reminders sent before rent is due. See who paid and who owes at a glance.'
                },
                {
                  name: 'Tenant portal access',
                  tooltip: 'Each tenant gets their own secure login to pay rent online, submit maintenance requests, view their lease, and download tax documents. Available 24/7 on any device.'
                },
                {
                  name: 'Maintenance requests',
                  tooltip: 'Tenants submit requests with photos directly through the portal. Track status from "submitted" to "completed". Attach receipts and maintain complete repair history for each property.'
                },
                {
                  name: 'Basic financial reports',
                  tooltip: 'Monthly income and expense summaries, tax-ready reports for your accountant, and year-over-year comparisons. Export to CSV or PDF in one click.'
                }
              ]}
            />
            <CustomerCard
              icon={Building2}
              title="Professional Property Managers"
              description="Managing multiple properties for clients? Track everything across portfolios with advanced reporting and client dashboards."
              features={[
                {
                  name: 'Multi-property management',
                  tooltip: 'Manage unlimited properties and units from one dashboard. Filter, search, and view performance metrics across your entire portfolio. Bulk actions for rent increases and lease renewals.'
                },
                {
                  name: 'Advanced financial reports',
                  tooltip: 'Profit & loss statements, cash flow analysis, occupancy reports, and ROI calculations. Compare properties side-by-side. Schedule automated monthly reports via email.'
                },
                {
                  name: 'Team collaboration tools',
                  tooltip: 'Add team members with custom permission levels. Assign maintenance tasks, share notes, and track who did what. Internal messaging keeps everyone on the same page.'
                },
                {
                  name: 'Client reporting',
                  tooltip: 'Auto-generate branded monthly owner statements showing income, expenses, and property performance. Owners can log in to view real-time data or receive scheduled email reports.'
                }
              ]}
              featured
            />
            <CustomerCard
              icon={Users2}
              title="Property Management Companies"
              description="Enterprise-scale management for 50+ properties. White-label options, custom integrations, and dedicated support."
              features={[
                {
                  name: 'Unlimited properties & units',
                  tooltip: 'No limits on properties, units, or tenants. Built to handle portfolios of 100+ properties with thousands of units. Enterprise-grade performance and reliability.'
                },
                {
                  name: 'Custom integrations',
                  tooltip: 'Connect to your existing accounting software, payment processors, and other tools via API. We can build custom integrations specific to your workflow and requirements.'
                },
                {
                  name: 'White-label branding',
                  tooltip: 'Remove all AI Rental Tools branding and replace with your company logo and colors. Custom domain for tenant portal. Make it look like your own proprietary software.'
                },
                {
                  name: 'Dedicated account manager',
                  tooltip: 'Direct phone line and email to your personal account manager. Priority support with same-day response time. Quarterly business reviews and strategic planning sessions.'
                }
              ]}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get up and running in minutes, not weeks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <StepCard
              number="1"
              title="Sign Up"
              description="Create your free account in 30 seconds. No credit card required."
            />
            <StepCard
              number="2"
              title="Add Properties"
              description="Import your properties, units, and tenant information. Upload documents and photos."
            />
            <StepCard
              number="3"
              title="Invite Tenants"
              description="Send secure invitations to tenants. They get instant portal access to pay rent and submit requests."
            />
            <StepCard
              number="4"
              title="Automate & Optimize"
              description="Let AI handle rent optimization, payment predictions, and lease renewals while you focus on growth."
            />
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features, Built for You
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to run a modern property management business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI Rent Optimization"
              badge="EXCLUSIVE"
              description="Automatically analyze market data and suggest optimal rent pricing. Increase revenue by 5-15% annually with data-driven recommendations."
            />
            <FeatureCard
              icon={AlertCircle}
              title="Payment Risk Prediction"
              badge="EXCLUSIVE"
              description="Predict which tenants are likely to pay late before it happens. Reduce late payments by 40% with proactive reminders."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Portfolio Health Score"
              badge="EXCLUSIVE"
              description="Single 0-100 score showing portfolio performance at a glance. See occupancy, collection rates, and ROI in real-time."
            />
            <FeatureCard
              icon={Wrench}
              title="Smart Maintenance System"
              description="Track requests from submission to completion. Automated vendor matching and cost estimates reduce response time by 60%."
            />
            <FeatureCard
              icon={Users}
              title="Tenant Self-Service Portal"
              description="Tenants pay rent, submit maintenance requests, and view documents online. Reduces your workload by 60%."
            />
            <FeatureCard
              icon={Zap}
              title="Automated Lease Renewals"
              description="Detect expiring leases 90 days out. Auto-generate renewal offers with AI-suggested rates. Reduce vacancy costs."
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Property Managers Choose AI Rental Tools
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results from property managers who switched
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">10+</div>
              <p className="text-gray-600 font-medium">Hours saved per week</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">15%</div>
              <p className="text-gray-600 font-medium">Revenue increase</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">40%</div>
              <p className="text-gray-600 font-medium">Fewer late payments</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">98%</div>
              <p className="text-gray-600 font-medium">Customer satisfaction</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bank-Level Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Your data is encrypted, backed up daily, and stored in secure Canadian data centers. We take security seriously.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Expert Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Get help from real property management experts via email, chat, or phone. Fast response times guaranteed.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <TrendingUp className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Always Improving</h3>
              <p className="text-gray-600 leading-relaxed">
                New features added monthly based on customer feedback. Your suggestions shape the product roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join property managers across Canada who use AI Rental Tools to save time, increase revenue, and provide better tenant experiences
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition shadow-xl hover:shadow-2xl"
          >
            View Plans & Pricing
            <ArrowRight size={20} />
          </Link>
          <p className="text-blue-200 mt-6 text-sm">
            Start in minutes. No setup fees. Cancel anytime.
          </p>
        </div>
      </section>

      <Footer variant="dark" />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: any;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition relative">
      {badge && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded">
            <Star size={12} />
            {badge}
          </span>
        </div>
      )}
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function CustomerCard({
  icon: Icon,
  title,
  description,
  features,
  featured,
}: {
  icon: any;
  title: string;
  description: string;
  features: Array<{ name: string; tooltip: string }>;
  featured?: boolean;
}) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  return (
    <div className={`relative bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition border-2 ${
      featured ? 'border-blue-600' : 'border-gray-200'
    }`}>
      {featured && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed mb-6">{description}</p>
      <ul className="space-y-3">
        {features.map((feature) => (
          <li
            key={feature.name}
            className="relative flex items-start gap-2 group cursor-help"
            onMouseEnter={() => setHoveredFeature(feature.name)}
            onMouseLeave={() => setHoveredFeature(null)}
          >
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-gray-700 text-sm">{feature.name}</span>
              <Info size={14} className="inline-block ml-1 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            {hoveredFeature === feature.name && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl z-10 animate-fadeIn">
                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                {feature.tooltip}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          {number}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
      {number !== '4' && (
        <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-600 to-blue-300 transform -translate-x-8"></div>
      )}
    </div>
  );
}
