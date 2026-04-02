import React from 'react';

const badges = {
  default: 'border-transparent bg-slate-900 text-slate-50',
  success: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  warning: 'border-amber-200 bg-amber-100 text-amber-800',
  danger: 'border-red-200 bg-red-100 text-red-800',
  info: 'border-blue-200 bg-blue-100 text-blue-800',
  muted: 'border-slate-200 bg-slate-100 text-slate-800',
};

export const Badge = ({ className = '', variant = 'default', children, ...props }) => {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${badges[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
