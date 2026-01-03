import { useState } from 'react';

interface AddressData {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AddressInputProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
}

const COUNTRIES = [
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
];

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

export function AddressInput({ value, onChange, disabled = false, required = false }: AddressInputProps) {
  const [postalCodeError, setPostalCodeError] = useState('');

  const getStateOptions = () => {
    if (value.country === 'CA' || value.country === 'Canada') {
      return CANADIAN_PROVINCES;
    } else if (value.country === 'US' || value.country === 'United States') {
      return US_STATES;
    }
    return [];
  };

  const getStateLabel = () => {
    if (value.country === 'CA' || value.country === 'Canada') {
      return 'Province';
    } else if (value.country === 'US' || value.country === 'United States') {
      return 'State';
    }
    return 'State/Province';
  };

  const getPostalCodeLabel = () => {
    if (value.country === 'CA' || value.country === 'Canada') {
      return 'Postal Code';
    } else if (value.country === 'US' || value.country === 'United States') {
      return 'ZIP Code';
    }
    return 'Postal/ZIP Code';
  };

  const validatePostalCode = (code: string, country: string): boolean => {
    if (!code) return true; // Allow empty if not required

    if (country === 'CA' || country === 'Canada') {
      // Canadian postal code: A1A 1A1
      const canadianPattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      return canadianPattern.test(code);
    } else if (country === 'US' || country === 'United States') {
      // US ZIP code: 12345 or 12345-6789
      const usPattern = /^\d{5}(-\d{4})?$/;
      return usPattern.test(code);
    }
    return true; // Allow any format for other countries
  };

  const handlePostalCodeChange = (code: string) => {
    onChange({ ...value, postal_code: code });

    if (code && !validatePostalCode(code, value.country)) {
      if (value.country === 'CA' || value.country === 'Canada') {
        setPostalCodeError('Please enter a valid Canadian postal code (e.g., A1A 1A1)');
      } else if (value.country === 'US' || value.country === 'United States') {
        setPostalCodeError('Please enter a valid US ZIP code (e.g., 12345 or 12345-6789)');
      }
    } else {
      setPostalCodeError('');
    }
  };

  const handleCountryChange = (newCountry: string) => {
    onChange({
      ...value,
      country: newCountry,
      state: '', // Reset state when country changes
    });
    setPostalCodeError('');
  };

  const stateOptions = getStateOptions();

  return (
    <div className="space-y-4">
      {/* Country first - determines labels for other fields */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Country {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled}
          required={required}
          autoComplete="country"
          name="country"
        >
          <option value="">Select Country</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Address lines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Address Line 1 {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value.address_line1}
            onChange={(e) => onChange({ ...value, address_line1: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Street address"
            disabled={disabled}
            required={required}
            autoComplete="address-line1"
            name="address-line1"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Address Line 2
          </label>
          <input
            type="text"
            value={value.address_line2}
            onChange={(e) => onChange({ ...value, address_line2: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Suite, Unit, Building, Floor, etc."
            disabled={disabled}
            autoComplete="address-line2"
            name="address-line2"
          />
        </div>
      </div>

      {/* City, State/Province, Postal/ZIP Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            City {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled}
            required={required}
            autoComplete="address-level2"
            name="city"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {getStateLabel()} {required && <span className="text-red-500">*</span>}
          </label>
          {stateOptions.length > 0 ? (
            <select
              value={value.state}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
              required={required}
              autoComplete="address-level1"
              name="state"
            >
              <option value="">Select {getStateLabel()}</option>
              {stateOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value.state}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="State/Province"
              disabled={disabled}
              required={required}
              autoComplete="address-level1"
              name="state"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {getPostalCodeLabel()} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value.postal_code}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              postalCodeError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={value.country === 'CA' || value.country === 'Canada' ? 'A1A 1A1' : '12345'}
            disabled={disabled}
            required={required}
            autoComplete="postal-code"
            name="postal-code"
          />
          {postalCodeError && (
            <p className="text-xs text-red-600 mt-1">{postalCodeError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
