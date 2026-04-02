import React from 'react';

const variants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  outline: 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-900',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  ghost: 'hover:bg-slate-100 hover:text-slate-900',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
};

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-8 text-base',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';
