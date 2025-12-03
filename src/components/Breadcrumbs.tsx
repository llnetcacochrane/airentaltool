import { ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dynamicItems, setDynamicItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (items) {
      setDynamicItems(items);
      return;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    const pathToLabel: Record<string, string> = {
      'dashboard': 'Operations Center',
      'businesses': 'Businesses',
      'business': 'Business',
      'properties': 'Properties',
      'property': 'Property',
      'tenants': 'Tenants',
      'tenant': 'Tenant',
      'units': 'Units',
      'unit': 'Unit',
      'payments': 'Payments',
      'expenses': 'Expenses',
      'maintenance': 'Maintenance',
      'reports': 'Reports',
      'settings': 'Settings',
      'applications': 'Applications',
      'addons': 'Add-Ons',
      'property-owners': 'Property Owners',
      'rent-optimization': 'Rent Optimization',
      'documents': 'Documents',
      'financials': 'Financials',
      'leases': 'Leases',
      'super-admin': 'Super Admin',
    };

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

      if (!isUuid && segment !== 'new') {
        const label = pathToLabel[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({
          label,
          href: index < pathSegments.length - 1 ? currentPath : undefined,
        });
      }
    });

    setDynamicItems(breadcrumbs);
  }, [location.pathname, items]);

  if (dynamicItems.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <button
        onClick={() => navigate('/dashboard')}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        title="Operations Center"
      >
        <Home size={16} className="text-gray-600" />
      </button>

      {dynamicItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={14} className="text-gray-400" />
          {item.href ? (
            <button
              onClick={() => navigate(item.href!)}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
