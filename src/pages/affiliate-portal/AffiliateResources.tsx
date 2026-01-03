import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate } from '../../types';
import {
  FileText,
  Image,
  Link as LinkIcon,
  Copy,
  Check,
  Download,
  ExternalLink,
  BookOpen,
  Megaphone,
  Mail,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliateResources() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const referralUrl = affiliateService.getReferralUrl(affiliate.referral_code);

  const copyToClipboard = (text: string, linkId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Pre-made promotional links
  const promoLinks = [
    {
      id: 'main',
      name: 'Main Landing Page',
      url: referralUrl,
      description: 'Your primary referral link to the homepage',
    },
    {
      id: 'pricing',
      name: 'Pricing Page',
      url: `${window.location.origin}/pricing?ref=${affiliate.referral_code}`,
      description: 'Direct link to pricing information',
    },
    {
      id: 'features',
      name: 'Features Page',
      url: `${window.location.origin}/features?ref=${affiliate.referral_code}`,
      description: 'Showcase all features',
    },
  ];

  // Marketing copy templates
  const marketingTemplates = [
    {
      title: 'Social Media Post',
      icon: Megaphone,
      content: `Tired of managing rentals the old way? AI Rental Tools automates everything from tenant screening to rent collection. Try it today! ${referralUrl}`,
    },
    {
      title: 'Email Introduction',
      icon: Mail,
      content: `Hi,

I wanted to share a tool that's transformed how I manage rental properties. AI Rental Tools uses artificial intelligence to automate tenant screening, rent collection, maintenance requests, and more.

Whether you manage 1 property or 100, it saves hours every week.

Check it out: ${referralUrl}

Let me know if you have any questions!`,
    },
    {
      title: 'Blog Snippet',
      icon: BookOpen,
      content: `Looking for the best property management software? AI Rental Tools offers AI-powered automation that handles tenant screening, rent collection, maintenance tracking, and financial reporting. Perfect for landlords and property managers who want to save time and reduce manual work.

Features include:
- AI-powered tenant screening
- Automated rent collection
- Maintenance request management
- Financial reporting and analytics
- Owner portal access

Try it free: ${referralUrl}`,
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Marketing Resources</h1>
          <p className="text-gray-600 mt-1">
            Tools and content to help you promote AI Rental Tools.
          </p>
        </div>

        {/* Your Referral Link */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-lg font-semibold mb-2">Your Referral Link</h2>
          <p className="text-green-100 text-sm mb-4">
            Share this link to earn commissions on every referral.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 px-4 py-3 rounded-lg backdrop-blur-sm">
              <code className="text-sm font-mono break-all">{referralUrl}</code>
            </div>
            <button
              onClick={() => copyToClipboard(referralUrl, 'main-link')}
              className="p-3 bg-white/20 rounded-lg hover:bg-white/30 transition flex-shrink-0"
              title="Copy link"
            >
              {copiedLink === 'main-link' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-green-100 text-xs mt-3">
            Your code: <span className="font-mono font-semibold">{affiliate.referral_code}</span>
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
              <p className="text-sm text-gray-500">Pre-made links to different pages</p>
            </div>
          </div>

          <div className="space-y-3">
            {promoLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{link.name}</p>
                  <p className="text-sm text-gray-500">{link.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(link.url, link.id)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Copy link"
                  >
                    {copiedLink === link.id ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Open link"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketing Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Marketing Templates</h3>
              <p className="text-sm text-gray-500">Ready-to-use promotional content</p>
            </div>
          </div>

          <div className="space-y-4">
            {marketingTemplates.map((template, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <template.icon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{template.title}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(template.content, `template-${index}`)}
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    {copiedLink === `template-${index}` ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {template.content}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Brand Assets</h3>
              <p className="text-sm text-gray-500">Logos and images for your promotions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl sm:text-2xl font-bold text-green-600">AI Rental Tools</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Logo (Light Background)</span>
                <button className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl sm:text-2xl font-bold text-white">AI Rental Tools</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Logo (Dark Background)</span>
                <button className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Brand Guidelines:</strong> When promoting AI Rental Tools, please use our official logos and follow our brand colors (Green: #16a34a). Do not modify the logo or use misleading claims about our product.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Tips for Success</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">1.</span>
              <span>Share your personal experience with AI Rental Tools to build trust</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">2.</span>
              <span>Target landlords, property managers, and real estate investors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">3.</span>
              <span>Highlight time-saving features and automation benefits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">4.</span>
              <span>Include your referral link in blog posts, videos, and social media</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">5.</span>
              <span>Follow up with leads who click but don't sign up</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AffiliateResources;
