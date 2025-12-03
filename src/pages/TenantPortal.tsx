import { Link } from 'react-router-dom';
import { Home, CreditCard, Wrench, FileText, Bell, Shield, Clock, Check } from 'lucide-react';

export function TenantPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Your <span className="text-blue-600">Tenant Portal</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manage your rental with ease. Pay rent online, submit maintenance requests, and communicate with your landlord all in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Payments</h3>
            <p className="text-gray-600">
              Pay your rent online securely. Set up auto-pay and never miss a payment. Track your payment history.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Maintenance Requests</h3>
            <p className="text-gray-600">
              Submit maintenance requests with photos. Track status in real-time. Communicate with maintenance staff.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lease Documents</h3>
            <p className="text-gray-600">
              Access your lease agreement anytime. View important documents. Download copies when needed.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Notifications</h3>
            <p className="text-gray-600">
              Get notified about maintenance updates, payment reminders, and important announcements.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600">
              Your data is encrypted and secure. Bank-level security for all transactions. Your privacy matters.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Access</h3>
            <p className="text-gray-600">
              Access your portal anytime, anywhere. Mobile-friendly design. Manage your rental on the go.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-12 text-center text-white">
          <Home className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Your landlord has invited you to join the tenant portal. Sign up now to access all features!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/tenant-signup"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg text-lg"
            >
              <Check size={24} />
              Sign Up with Invitation Code
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-900 transition text-lg"
            >
              Already Have an Account? Log In
            </Link>
          </div>

          <p className="mt-8 text-sm text-blue-200">
            Don't have an invitation code? Contact your landlord to receive one.
          </p>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Get Your Code</h4>
              <p className="text-gray-600">
                Your landlord will provide you with a unique invitation code
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Sign Up</h4>
              <p className="text-gray-600">
                Create your account using the invitation code and your details
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Start Managing</h4>
              <p className="text-gray-600">
                Access your personalized dashboard and all portal features
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
