import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'bg-client text-white hover:bg-client-dark focus:ring-client disabled:bg-client/50',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
  danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger disabled:bg-danger/50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
};

const sizeMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    {...rest}
  >
    {loading && (
      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
    )}
    {children}
  </button>
);

export default Button;
