import { Link } from 'react-router-dom';
import { Heart, Users, Target, Award, TrendingUp, Globe, Shield, Zap } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function About() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              About AI Rental Tools
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We're on a mission to empower property managers across North America with intelligent,
              easy-to-use software that simplifies the complexities of rental management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To make professional-grade property management accessible to everyone, from
                individual landlords managing a single unit to large property management firms
                overseeing hundreds of properties.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Our Values</h3>
              <p className="text-gray-600 leading-relaxed">
                We believe in transparency, innovation, and customer success. Every feature we build
                is designed to save you time, reduce stress, and help you make better decisions
                for your rental business.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built by property managers, for property managers
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">AI-Powered</h3>
              <p className="text-gray-600">
                Intelligent rent optimization, payment predictions, and automated insights that
                help you maximize revenue.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600">
                Bank-level encryption, automatic backups, and 99.9% uptime guarantee. Your data
                is always safe and accessible.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-purple-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Customer First</h3>
              <p className="text-gray-600">
                Dedicated support team, comprehensive documentation, and a community of property
                managers ready to help.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-orange-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Always Improving</h3>
              <p className="text-gray-600">
                Regular updates, new features, and continuous improvements based on your feedback
                and industry best practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Story</h2>
            </div>

            <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
              <p>
                AI Rental Tools was born out of frustration with outdated, overly complex property
                management software that required weeks of training and still didn't solve the real
                problems property managers face every day.
              </p>

              <p>
                After years of managing rental properties and watching countless hours wasted on
                manual data entry, spreadsheet juggling, and hunting down late payments, we knew
                there had to be a better way.
              </p>

              <p>
                We built AI Rental Tools to be different: intuitive enough to start using immediately,
                powerful enough to handle complex portfolios, and intelligent enough to do the heavy
                lifting for you. No complicated setup, no steep learning curve, just smart tools that
                work the way you do.
              </p>

              <p>
                Today, we're proud to serve property managers across North America, helping them save
                time, reduce stress, and grow their rental businesses. But we're just getting started.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Built for the Future</h2>
            <p className="text-xl text-gray-600">Currently in beta with early adopters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Beta Program</h3>
              <p className="text-gray-600">
                Join our growing community of early adopters shaping the future of property management
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">North America</h3>
              <p className="text-gray-600">
                Expanding across the continent with features tailored to regional regulations and needs
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-orange-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Rapid Innovation</h3>
              <p className="text-gray-600">
                Weekly updates and new features based on direct feedback from our beta community
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Property Management?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join our beta program and help shape the future of property management software.
          </p>
          <div className="flex justify-center">
            <Link
              to="/pricing"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition text-lg"
            >
              View Plans & Get Started
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
