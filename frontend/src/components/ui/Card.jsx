import React from 'react';

export const Card = ({ className = '', children, ...props }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`p-6 pb-4 flex flex-col gap-1.5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={`text-xl font-semibold leading-none tracking-tight text-slate-900 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }) => (
  <p className={`text-sm text-slate-500 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);
