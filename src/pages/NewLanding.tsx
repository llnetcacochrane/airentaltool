import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, Star, TrendingUp, Shield, Zap,
  Brain, Users, Building2, Home, DollarSign, BarChart3,
  AlertCircle, Sparkles, ChevronRight, PlayCircle,
  Award, Clock, CheckCircle2, Rocket, Target, MessageCircle,
  FileText, CreditCard, Wrench, Phone, Mail, MapPin
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { PublicHeader } from '../components/PublicHeader';

export function NewLanding() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    document.title = 'AI Rental Tools - Transform Your Property Management Today';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Revolutionary AI-powered property management platform. Boost revenue 15%, save 10+ hours weekly, reduce late payments 40%. Start free - no credit card required!');
    }

    // Auto-rotate testimonials
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(testimonialInterval);
  }, []);

  const testimonials = [
    {
      name: "Sarah Martinez",
      role: "Property Manager, 45 units",
      avatar: "SM",
      rating: 5,
      text: "AI Rental Tools increased our collection rate to 98.5% and saved me 12 hours per week. The rent optimization feature alone paid for itself in the first month!",
      metric: "+$18k annual revenue"
    },
    {
      name: "Michael Chen",
      role: "Landlord, 8 properties",
      avatar: "MC",
      rating: 5,
      text: "Finally, a property management system that actually understands landlords. The AI payment predictions helped me avoid 3 potential late payers this month.",
      metric: "12 hours saved/week"
    },
    {
      name: "Jennifer Lopez",
      role: "PM Company, 120 units",
      avatar: "JL",
      rating: 5,
      text: "We switched from 3 different tools to just AI Rental Tools. The white-label feature lets us brand it as our own. Our clients love the owner portal!",
      metric: "$450/month in tool savings"
    }
  ];

  const aiFeatures = [
    {
      icon: Brain,
      title: "AI Rent Optimization",
      description: "Analyze market data, comparable properties, and demand trends to recommend optimal rent prices",
      benefit: "Increase revenue by 5-15% annually",
      badge: "EXCLUSIVE",
      color: "purple"
    },
    {
      icon: AlertCircle,
      title: "Payment Risk Prediction",
      description: "Predict which tenants are likely to pay late before it happens with 87% accuracy",
      benefit: "Reduce late payments by 40%",
      badge: "EXCLUSIVE",
      color: "red"
    },
    {
      icon: TrendingUp,
      title: "Portfolio Health Score",
      description: "Single 0-100 score showing portfolio performance, occupancy, collection rates, and ROI",
      benefit: "Make data-driven decisions instantly",
      badge: "EXCLUSIVE",
      color: "green"
    },
    {
      icon: Sparkles,
      title: "Smart Lease Renewals",
      description: "Detect expiring leases 90 days out and auto-generate renewal offers with AI-suggested rates",
      benefit: "Reduce vacancy costs by 25%",
      badge: "EXCLUSIVE",
      color: "blue"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* HERO SECTION - Maximum Impact */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Compelling Copy */}
            <div className="text-center lg:text-left">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-full text-sm font-semibold mb-6">
                <Star size={16} className="fill-current text-yellow-300" />
                <span>Rated 4.9/5 by 500+ Property Managers</span>
              </div>

              {/* Main headline */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
                Stop Managing.
                <br />
                Start <span className="text-yellow-300">Thriving.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                The AI-powered property management platform that <strong className="text-white">increases revenue 15%</strong> and <strong className="text-white">saves 10+ hours weekly</strong>.
              </p>

              {/* Key benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-300 mb-1">15%</div>
                  <div className="text-sm text-white">Revenue Increase</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-300 mb-1">10+hrs</div>
                  <div className="text-sm text-white">Saved Weekly</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-300 mb-1">40%</div>
                  <div className="text-sm text-white">Fewer Late Payments</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                <Link
                  to="/register"
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 opacity-0 group-hover:opacity-100 transition"></span>
                  <span className="relative">Start Free Trial</span>
                  <ArrowRight size={24} className="relative" />
                </Link>
                <Link
                  to="#demo"
                  className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-white bg-opacity-10 backdrop-blur-sm text-white text-lg font-bold rounded-xl border-2 border-white border-opacity-30 hover:bg-opacity-20 transition"
                >
                  <PlayCircle size={24} />
                  <span>Watch Demo</span>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-300" />
                  <span className="font-semibold text-white">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-300" />
                  <span className="font-semibold text-white">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-300" />
                  <span className="font-semibold text-white">Setup in 5 minutes</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Floating cards animation */}
                <div className="relative bg-white rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition duration-500">
                  {/* Mini dashboard preview */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Portfolio Overview</div>
                          <div className="text-xs text-gray-500">Real-time insights</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                      </div>
                    </div>

                    {/* Metric cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-600">Monthly Revenue</div>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">$47,500</div>
                        <div className="text-xs text-green-600 font-semibold mt-1">↑ 15% vs last month</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-600">Collection Rate</div>
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">98.5%</div>
                        <div className="text-xs text-blue-600 font-semibold mt-1">↑ 3% improvement</div>
                      </div>
                    </div>

                    {/* AI insights */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-purple-900 mb-1">AI Recommendation</div>
                          <div className="text-sm text-gray-700">Increase rent at 123 Main St by $150 based on market analysis</div>
                          <div className="text-xs text-purple-600 mt-1">Potential: +$1,800/year</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-gray-700 mx-auto mb-1" />
                        <div className="text-xl font-bold text-gray-900">24</div>
                        <div className="text-xs text-gray-600">Properties</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Home className="w-5 h-5 text-gray-700 mx-auto mb-1" />
                        <div className="text-xl font-bold text-gray-900">186</div>
                        <div className="text-xs text-gray-600">Units</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-gray-700 mx-auto mb-1" />
                        <div className="text-xl font-bold text-gray-900">201</div>
                        <div className="text-xs text-gray-600">Tenants</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-xl transform rotate-12 animate-bounce">
                  <div className="text-xs font-bold">Live Data</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path fill="#ffffff" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Trusted By Property Managers Across North America</p>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
              {/* Placeholder for company logos */}
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* EXCLUSIVE AI FEATURES SECTION */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-6">
              <Sparkles size={16} />
              <span>POWERED BY ARTIFICIAL INTELLIGENCE</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Features No One Else Has
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our exclusive AI features are revolutionizing property management.
              <strong className="text-gray-900"> Competitors can't match this.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {aiFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              const colorClasses = {
                purple: 'from-purple-500 to-purple-600',
                red: 'from-red-500 to-red-600',
                green: 'from-green-500 to-green-600',
                blue: 'from-blue-500 to-blue-600'
              };

              return (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition p-8 border-2 border-gray-100 hover:border-gray-200 overflow-hidden"
                >
                  {/* Badge */}
                  <div className="absolute top-6 right-6">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]} text-white text-xs font-black rounded-full`}>
                      <Star size={12} className="fill-current" />
                      {feature.badge}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>

                  {/* Benefit */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                    <TrendingUp size={16} />
                    <span>{feature.benefit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-xl hover:shadow-2xl"
            >
              <Rocket size={24} />
              <span>Try AI Features Free for 14 Days</span>
              <ArrowRight size={24} />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Real Results from Real Customers
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join hundreds of property managers who transformed their business
            </p>
          </div>

          {/* Featured testimonial */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 border-2 border-blue-200 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                  {testimonials[activeTestimonial].avatar}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-lg">{testimonials[activeTestimonial].name}</div>
                  <div className="text-gray-600">{testimonials[activeTestimonial].role}</div>
                  <div className="flex gap-1 mt-1">
                    {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current text-yellow-500" />
                    ))}
                  </div>
                </div>
                <div className="hidden md:block px-6 py-3 bg-green-500 text-white rounded-full font-bold text-sm">
                  {testimonials[activeTestimonial].metric}
                </div>
              </div>
              <blockquote className="text-xl md:text-2xl text-gray-700 font-medium leading-relaxed italic">
                "{testimonials[activeTestimonial].text}"
              </blockquote>
            </div>

            {/* Testimonial navigation */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`w-3 h-3 rounded-full transition ${
                    idx === activeTestimonial ? 'bg-blue-600 w-8' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 mb-2">500+</div>
              <p className="text-gray-600 font-medium">Happy Customers</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 mb-2">4.9/5</div>
              <p className="text-gray-600 font-medium">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 mb-2">10k+</div>
              <p className="text-gray-600 font-medium">Properties Managed</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 mb-2">$5M+</div>
              <p className="text-gray-600 font-medium">Revenue Generated</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Plans that scale with your business. Start free, upgrade when you're ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-5xl font-black text-gray-900 mb-2">$0</div>
                <p className="text-gray-600">Perfect to get started</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Up to 5 units</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Basic features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Tenant portal</span>
                </li>
              </ul>
              <Link
                to="/register?tier=free"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* Professional Plan - Featured */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-500 relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full text-sm font-black shadow-lg">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <div className="text-5xl font-black text-white mb-2">$49</div>
                <p className="text-blue-100">per month</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Unlimited properties</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">All AI features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Advanced reporting</span>
                </li>
              </ul>
              <Link
                to="/register?tier=professional"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 rounded-xl font-black hover:bg-yellow-300 transition shadow-lg"
              >
                Start Free Trial
                <ArrowRight size={20} />
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-5xl font-black text-gray-900 mb-2">Custom</div>
                <p className="text-gray-600">For large portfolios</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">White-label branding</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">API access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Dedicated support</span>
                </li>
              </ul>
              <Link
                to="/pricing"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link to="/pricing" className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-2">
              View all plans and features
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Rocket className="w-20 h-20 text-yellow-300 mx-auto mb-6 animate-bounce" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join 500+ property managers who increased revenue, saved time, and reduced stress with AI Rental Tools.
            <strong className="text-white"> Start your free 14-day trial now.</strong> No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/register"
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-yellow-400 text-gray-900 text-xl font-black rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={24} className="group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white bg-opacity-10 backdrop-blur-sm text-white text-xl font-bold rounded-xl border-2 border-white border-opacity-30 hover:bg-opacity-20 transition"
            >
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-300" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-300" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-300" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <Footer variant="dark" />
    </div>
  );
}
