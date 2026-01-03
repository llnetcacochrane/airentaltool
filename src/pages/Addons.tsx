import { useState, useEffect } from 'react';
import { ShoppingCart, Check, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addonService, AddonProduct, AddonPurchase } from '../services/addonService';

export function Addons() {
  const { currentBusiness } = useAuth();
  const [availableAddons, setAvailableAddons] = useState<AddonProduct[]>([]);
  const [purchases, setPurchases] = useState<AddonPurchase[]>([]);
  const [limitStatus, setLimitStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentBusiness?.id]);

  const loadData = async () => {
    if (!currentBusiness?.id) return;

    try {
      setIsLoading(true);
      const [addons, userPurchases, status] = await Promise.all([
        addonService.getAvailableAddons(),
        addonService.getOrganizationPurchases(currentBusiness.id),
        addonService.getLimitStatus(currentBusiness.id),
      ]);

      setAvailableAddons(addons);
      setPurchases(userPurchases);
      setLimitStatus(status);
    } catch (error) {
      console.error('Failed to load addon data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (addonId: string) => {
    if (!currentBusiness?.id) return;

    try {
      setPurchasing(addonId);
      await addonService.purchaseAddon(currentBusiness.id, addonId, 1);
      await loadData();
    } catch (error: any) {
      alert(`Failed to purchase add-on: ${error.message}`);
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancel = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to cancel this add-on? It will remain active until the end of your billing cycle.')) {
      return;
    }

    try {
      await addonService.cancelAddon(purchaseId);
      await loadData();
    } catch (error: any) {
      alert(`Failed to cancel add-on: ${error.message}`);
    }
  };

  const getAddonIcon = (type: string) => {
    switch (type) {
      case 'property':
        return '🏢';
      case 'unit':
        return '🏠';
      case 'tenant':
        return '👤';
      case 'team_member':
        return '👥';
      case 'business':
        return '🏛️';
      default:
        return '📦';
    }
  };

  const isPurchased = (addonId: string) => {
    return purchases.some(p => p.addon_product_id === addonId);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading add-ons...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Add-Ons & Upgrades</h1>
        <p className="text-gray-600">
          Expand your account capacity without changing your plan. Purchase add-ons as you need them.
        </p>
      </div>

      {limitStatus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Current Usage</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <UsageCard
              label="Businesses"
              current={limitStatus.businesses.current}
              max={limitStatus.businesses.max}
              percentage={limitStatus.businesses.percentage}
              atLimit={limitStatus.businesses.atLimit}
            />
            <UsageCard
              label="Properties"
              current={limitStatus.properties.current}
              max={limitStatus.properties.max}
              percentage={limitStatus.properties.percentage}
              atLimit={limitStatus.properties.atLimit}
            />
            <UsageCard
              label="Units"
              current={limitStatus.units.current}
              max={limitStatus.units.max}
              percentage={limitStatus.units.percentage}
              atLimit={limitStatus.units.atLimit}
            />
            <UsageCard
              label="Tenants"
              current={limitStatus.tenants.current}
              max={limitStatus.tenants.max}
              percentage={limitStatus.tenants.percentage}
              atLimit={limitStatus.tenants.atLimit}
            />
            <UsageCard
              label="Team Members"
              current={limitStatus.users.current}
              max={limitStatus.users.max}
              percentage={limitStatus.users.percentage}
              atLimit={limitStatus.users.atLimit}
            />
          </div>
        </div>
      )}

      {purchases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-green-600" size={24} />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Active Add-Ons</h2>
          </div>

          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{getAddonIcon(purchase.addon_product?.addon_type || '')}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {purchase.addon_product?.display_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {purchase.quantity} • Next billing: {new Date(purchase.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {addonService.formatPrice((purchase.addon_product?.monthly_price_cents || 0) * purchase.quantity)}/mo
                  </span>
                  <button
                    onClick={() => handleCancel(purchase.id)}
                    className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="text-blue-600" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Available Add-Ons</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {availableAddons.map((addon) => {
            const purchased = isPurchased(addon.id);
            const isCurrentlyPurchasing = purchasing === addon.id;

            return (
              <div
                key={addon.id}
                className={`border-2 rounded-xl p-6 transition ${
                  purchased ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-4xl mb-4">{getAddonIcon(addon.addon_type)}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{addon.display_name}</h3>
                <p className="text-gray-600 text-sm mb-4">{addon.description}</p>
                <div className="mb-6">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {addonService.formatPrice(addon.monthly_price_cents)}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>

                {purchased ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                    <Check size={20} />
                    <span>Active</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(addon.id)}
                    disabled={isCurrentlyPurchasing}
                    className={`w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition ${
                      isCurrentlyPurchasing
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrentlyPurchasing ? 'Processing...' : 'Purchase'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How Add-Ons Work</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Add-ons are billed monthly and added to your existing subscription</li>
              <li>• You can purchase multiple quantities of the same add-on</li>
              <li>• Cancel anytime - add-ons remain active until the end of your billing cycle</li>
              <li>• Unused add-ons do not roll over to the next month</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageCard({
  label,
  current,
  max,
  percentage,
  atLimit,
}: {
  label: string;
  current: number;
  max: number;
  percentage: number;
  atLimit: boolean;
}) {
  const isUnlimited = max === 999999;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {current} {!isUnlimited && `/ ${max}`}
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${
                atLimit ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          {atLimit && (
            <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle size={12} />
              At Limit
            </div>
          )}
        </>
      )}
      {isUnlimited && <div className="text-xs text-green-600 font-semibold">Unlimited</div>}
    </div>
  );
}
