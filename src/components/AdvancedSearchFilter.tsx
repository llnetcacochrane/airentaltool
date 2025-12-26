import { useState } from 'react';
import { Search, Filter, X, Calendar, SlidersHorizontal, ChevronDown } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date-range' | 'number-range' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: any;
}

interface AdvancedSearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  filterValues?: FilterValues;
  onFilterChange?: (filters: FilterValues) => void;
  onClearFilters?: () => void;
  showFilterCount?: boolean;
}

export function AdvancedSearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  showFilterCount = true,
}: AdvancedSearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = Object.keys(filterValues).filter(
    (key) => filterValues[key] && filterValues[key] !== '' &&
    (!Array.isArray(filterValues[key]) || filterValues[key].length > 0)
  ).length;

  const handleFilterChange = (filterId: string, value: any) => {
    if (onFilterChange) {
      onFilterChange({
        ...filterValues,
        [filterId]: value,
      });
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
    setShowFilters(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={18} />
            <span className="font-medium">Filters</span>
            {showFilterCount && activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && filters.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-slideInDown">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Filter size={18} />
              Filter Options
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {filter.label}
                </label>
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'multiselect' && (
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-300 rounded-lg bg-white">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(filterValues[filter.id] || []).includes(option.value)}
                          onChange={(e) => {
                            const current = filterValues[filter.id] || [];
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v: string) => v !== option.value);
                            handleFilterChange(filter.id, updated);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {filter.type === 'date-range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_from`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_from`, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="From"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_to`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_to`, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="To"
                    />
                  </div>
                )}

                {filter.type === 'number-range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filterValues[`${filter.id}_min`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_min`, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={filter.placeholder || 'Min'}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={filterValues[`${filter.id}_max`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_max`, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={filter.placeholder || 'Max'}
                    />
                  </div>
                )}

                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing search and filter state
export function useSearchAndFilter<T>(
  items: T[],
  searchFields: (keyof T)[],
  customFilterFn?: (item: T, filters: FilterValues) => boolean
) {
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const filteredItems = items.filter((item) => {
    // Search filter
    const matchesSearch =
      searchValue === '' ||
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchValue.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchValue);
        }
        return false;
      });

    if (!matchesSearch) {
      return false;
    }

    // Custom filters
    if (customFilterFn) {
      return customFilterFn(item, filterValues);
    }

    return true;
  });

  const clearFilters = () => {
    setFilterValues({});
  };

  return {
    searchValue,
    setSearchValue,
    filterValues,
    setFilterValues,
    filteredItems,
    clearFilters,
  };
}
