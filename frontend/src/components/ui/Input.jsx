import React from 'react';

const Input = React.forwardRef(({ 
  label, 
  error, 
  icon: Icon,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 border p-2
            ${Icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
