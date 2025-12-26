import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Globe, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';

export function PublicPageSettings() {
  const { currentBusiness, refreshBusinesses } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(false);

  const [publicPageData, setPublicPageData] = useState({
    public_page_enabled: false,
    public_page_slug: '',
    public_page_title: '',
    public_page_description: '',
    public_page_logo_url: '',
    public_page_header_image_url: '',
    public_page_contact_email: '',
    public_page_contact_phone: '',
  });

  useEffect(() => {
    if (currentBusiness) {
      setPublicPageData({
        public_page_enabled: currentBusiness.public_page_enabled || false,
        public_page_slug: currentBusiness.public_page_slug || '',
        public_page_title: currentBusiness.public_page_title || '',
        public_page_description: currentBusiness.public_page_description || '',
        public_page_logo_url: currentBusiness.public_page_logo_url || '',
        public_page_header_image_url: currentBusiness.public_page_header_image_url || '',
        public_page_contact_email: currentBusiness.public_page_contact_email || '',
        public_page_contact_phone: currentBusiness.public_page_contact_phone || '',
      });
    }
  }, [currentBusiness]);

  const handleSavePublicPage = async () => {
    if (!currentBusiness) return;
    setIsSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          public_page_enabled: publicPageData.public_page_enabled,
          public_page_slug: publicPageData.public_page_slug || null,
          public_page_title: publicPageData.public_page_title || null,
          public_page_description: publicPageData.public_page_description || null,
          public_page_logo_url: publicPageData.public_page_logo_url || null,
          public_page_header_image_url: publicPageData.public_page_header_image_url || null,
          public_page_contact_email: publicPageData.public_page_contact_email || null,
          public_page_contact_phone: publicPageData.public_page_contact_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentBusiness.id);

      if (error) throw error;
      await refreshBusinesses();
      setMessage('Public page settings updated successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update public page settings');
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    if (!currentBusiness?.business_name) return;
    const slug = currentBusiness.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setPublicPageData({ ...publicPageData, public_page_slug: slug });
  };

  const copyPublicUrl = () => {
    if (publicPageData.public_page_slug) {
      navigator.clipboard.writeText(`${window.location.origin}/browse/${publicPageData.public_page_slug}`);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Public Page</h1>
                <p className="text-gray-600">Configure your public-facing business page</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Selected</h3>
            <p className="text-gray-600">Please select a business to configure its public page settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Public Page</h1>
              <p className="text-gray-600">Configure your public-facing business page for {currentBusiness.business_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Public Business Page</h2>
            <p className="text-gray-600 mb-6">Configure your public-facing business page where prospects can browse available properties and apply for rentals.</p>

            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-6">
              {/* Enable Public Page Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Enable Public Business Page</p>
                  <p className="text-sm text-gray-600 mt-1">Allow prospects to view your properties and submit applications online</p>
                </div>
                <button
                  onClick={() => setPublicPageData({ ...publicPageData, public_page_enabled: !publicPageData.public_page_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    publicPageData.public_page_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      publicPageData.public_page_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {publicPageData.public_page_enabled && (
                <>
                  {/* Public Page URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Page URL Slug *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center">
                        <span className="px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                          {window.location.origin}/browse/
                        </span>
                        <input
                          type="text"
                          value={publicPageData.public_page_slug}
                          onChange={(e) => setPublicPageData({ ...publicPageData, public_page_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          placeholder="my-business"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateSlug}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                      >
                        Auto-generate
                      </button>
                      {publicPageData.public_page_slug && (
                        <button
                          type="button"
                          onClick={copyPublicUrl}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          {copiedSlug ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">URL-friendly identifier for your public page (letters, numbers, and hyphens only)</p>
                  </div>

                  {/* View Public Page Link */}
                  {publicPageData.public_page_slug && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">Your Public Page</p>
                          <p className="text-sm text-blue-700">{window.location.origin}/browse/{publicPageData.public_page_slug}</p>
                        </div>
                        <a
                          href={`/browse/${publicPageData.public_page_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          <ExternalLink size={16} />
                          Preview Page
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Page Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Page Title
                    </label>
                    <input
                      type="text"
                      value={publicPageData.public_page_title}
                      onChange={(e) => setPublicPageData({ ...publicPageData, public_page_title: e.target.value })}
                      placeholder={currentBusiness.business_name || 'Your Business Name'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to use your business name</p>
                  </div>

                  {/* Page Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Page Description
                    </label>
                    <textarea
                      value={publicPageData.public_page_description}
                      onChange={(e) => setPublicPageData({ ...publicPageData, public_page_description: e.target.value })}
                      rows={3}
                      placeholder="Welcome to our rental properties. Browse available units and apply online..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Email (Public)
                      </label>
                      <input
                        type="email"
                        value={publicPageData.public_page_contact_email}
                        onChange={(e) => setPublicPageData({ ...publicPageData, public_page_contact_email: e.target.value })}
                        placeholder="contact@yourbusiness.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Phone (Public)
                      </label>
                      <input
                        type="tel"
                        value={publicPageData.public_page_contact_phone}
                        onChange={(e) => setPublicPageData({ ...publicPageData, public_page_contact_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Branding */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Logo URL
                      </label>
                      <input
                        type="url"
                        value={publicPageData.public_page_logo_url}
                        onChange={(e) => setPublicPageData({ ...publicPageData, public_page_logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Header Image URL
                      </label>
                      <input
                        type="url"
                        value={publicPageData.public_page_header_image_url}
                        onChange={(e) => setPublicPageData({ ...publicPageData, public_page_header_image_url: e.target.value })}
                        placeholder="https://example.com/header.jpg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleSavePublicPage}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Public Page Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
