import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => (
  <div
    className={`${sizeMap[size]} rounded-full border-gray-200 border-t-client animate-spin`}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
