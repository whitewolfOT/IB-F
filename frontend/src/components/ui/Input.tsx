import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, id, className = '', ...rest }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-client focus:border-client transition ${
        error ? 'border-danger' : 'border-gray-300'
      } ${className}`}
      {...rest}
    />
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
);

export default Input;
