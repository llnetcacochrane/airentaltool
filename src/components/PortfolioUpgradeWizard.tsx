import React, { useState } from 'react';
import { Building2, FolderTree, CheckCircle } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import { usePortfolio } from '../context/PortfolioContext';
import { SlidePanel } from './SlidePanel';

interface PortfolioUpgradeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function PortfolioUpgradeWizard({ isOpen, onClose, onComplete }: PortfolioUpgradeWizardProps) {
  const { refreshPortfolios } = usePortfolio();
  const [step, setStep] = useState(1);
  const [portfolioName, setPortfolioName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getTitle = () => {
    switch (step) {
      case 1:
        return 'Adding a Second Portfolio';
      case 2:
        return 'Create Your New Portfolio';
      case 3:
        return 'All Set!';
      default:
        return 'Portfolio Setup';
    }
  };

  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await portfolioService.createPortfolio({
        name: portfolioName,
        description: description || undefined,
        is_default: false,
      });

      await refreshPortfolios();
      setStep(3);
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="large"
    >
      <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderTree className="w-10 h-10 text-blue-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  Great! You're expanding your portfolio
                </h3>
                <p className="text-gray-600">
                  Since you're adding a second rental business, we'll organize your account with a new structure.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-blue-900">What's changing:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Your existing properties will be grouped into your first portfolio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>We'll create an organization to manage both portfolios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>You'll be able to easily switch between your portfolios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>All your data stays safe - nothing is deleted</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">New structure:</h4>
                <div className="space-y-2 text-sm text-gray-700 ml-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Your Organization</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Portfolio 1 (your existing properties)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Portfolio 2 (new)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  Name Your New Portfolio
                </h3>
                <p className="text-gray-600">
                  Give your second rental business a name to help you identify it.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="portfolio-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio Name *
                  </label>
                  <input
                    id="portfolio-name"
                    type="text"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    placeholder="e.g., Downtown Properties, Vacation Rentals"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="portfolio-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="portfolio-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any notes about this portfolio..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreatePortfolio}
                  disabled={loading || !portfolioName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Portfolio'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  Portfolio Created Successfully!
                </h3>
                <p className="text-gray-600">
                  Your new portfolio is ready. You can now add properties and manage both portfolios independently.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm text-green-800">
                <p className="font-semibold">What's next:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Use the portfolio selector in the header to switch between your portfolios</li>
                  <li>Add properties to your new portfolio</li>
                  <li>Each portfolio has its own properties, tenants, and reports</li>
                </ul>
              </div>

              <button
                onClick={onComplete}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Get Started
              </button>
            </div>
          )}
      </div>
    </SlidePanel>
  );
}
