import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  className = '',
}: CheckboxProps) {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  };

  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
          ${
            checked || indeterminate
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-300 hover:border-blue-400'
          }
          ${disabled ? '' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
      >
        {indeterminate ? (
          <Minus size={14} className="text-white" strokeWidth={3} />
        ) : checked ? (
          <Check size={14} className="text-white" strokeWidth={3} />
        ) : null}
      </div>
      {label && (
        <span className="text-sm text-gray-700 select-none">{label}</span>
      )}
    </label>
  );
}
