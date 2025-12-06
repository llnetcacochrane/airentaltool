import { ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Feature {
  text: string;
  highlight?: boolean;
}

interface UpgradeCardProps {
  variant?: 'default' | 'compact' | 'banner' | 'modal';
  title?: string;
  description?: string;
  features?: Feature[];
  ctaText?: string;
  ctaLink?: string;
  onCtaClick?: () => void;
  badge?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function UpgradeCard({
  variant = 'default',
  title = 'Upgrade to Professional',
  description = 'Unlock powerful features to grow your property management business',
  features = [
    { text: 'Unlimited properties and units' },
    { text: 'AI-powered rent optimization', highlight: true },
    { text: 'Advanced analytics and reporting', highlight: true },
    { text: 'Priority support' }
  ],
  ctaText = 'Upgrade Now',
  ctaLink = '/pricing',
  onCtaClick,
  badge = 'POPULAR UPGRADE',
  dismissible = false,
  onDismiss
}: UpgradeCardProps) {

  // Compact variant - Small inline upsell
  if (variant === 'compact') {
    return (
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-bold text-yellow-300 uppercase">{badge}</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
            <p className="text-xs text-blue-100">{description}</p>
          </div>
          {ctaLink ? (
            <Link
              to={ctaLink}
              className="flex-shrink-0 px-4 py-2 bg-yellow-400 text-gray-900 text-sm font-bold rounded-lg hover:bg-yellow-300 transition shadow-lg"
            >
              {ctaText}
            </Link>
          ) : (
            <button
              onClick={onCtaClick}
              className="flex-shrink-0 px-4 py-2 bg-yellow-400 text-gray-900 text-sm font-bold rounded-lg hover:bg-yellow-300 transition shadow-lg"
            >
              {ctaText}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Banner variant - Full width banner
  if (variant === 'banner') {
    return (
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl p-6 shadow-xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mt-32"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mb-48"></div>
        </div>

        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
          >
            ×
          </button>
        )}

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-300 fill-current" />
              <span className="text-sm font-bold text-yellow-300 uppercase tracking-wide">{badge}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-blue-100 mb-4">{description}</p>
            <div className="flex flex-wrap items-center gap-4">
              {features.slice(0, 3).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-white text-sm">
                  <Zap className={`w-4 h-4 ${feature.highlight ? 'text-yellow-300' : 'text-blue-200'}`} />
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            {ctaLink ? (
              <Link
                to={ctaLink}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </Link>
            ) : (
              <button
                onClick={onCtaClick}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant - Full card with features list
  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-2xl overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
      </div>

      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-white hover:text-gray-200 transition bg-white bg-opacity-10 rounded-full"
        >
          ×
        </button>
      )}

      <div className="relative p-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold mb-4">
          <Star className="w-3 h-3 fill-current" />
          {badge}
        </div>

        {/* Title and description */}
        <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
        <p className="text-lg text-blue-100 mb-6">{description}</p>

        {/* Features list */}
        <ul className="space-y-3 mb-8">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`text-white ${feature.highlight ? 'font-semibold' : ''}`}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        {ctaLink ? (
          <Link
            to={ctaLink}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </Link>
        ) : (
          <button
            onClick={onCtaClick}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition shadow-2xl hover:shadow-yellow-500/50"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </button>
        )}

        {/* Trust indicator */}
        <p className="text-sm text-blue-200 mt-4">
          Join 500+ property managers who upgraded. No credit card required to start trial.
        </p>
      </div>
    </div>
  );
}

// Feature locked component - show when feature is not available in current tier
export function FeatureLocked({
  featureName,
  requiredTier = 'Professional',
  onUpgrade
}: {
  featureName: string;
  requiredTier?: string;
  onUpgrade?: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{featureName}</h3>
      <p className="text-gray-600 mb-6">
        This feature is available on the <strong>{requiredTier}</strong> plan
      </p>
      {onUpgrade ? (
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Unlock
        </button>
      ) : (
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          <Zap className="w-4 h-4" />
          View Plans
        </Link>
      )}
    </div>
  );
}
