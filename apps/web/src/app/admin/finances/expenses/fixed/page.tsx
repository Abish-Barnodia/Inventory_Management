import React from 'react';

export default function FixedExpensesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fixed Expenses</h1>
        <p className="text-gray-500">Manage recurring fixed expenses like rent, salaries, and insurance.</p>
      </div>
      
      <div className="bg-white rounded-lg border p-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Fixed Expenses Coming Soon</h3>
        <p className="text-gray-500">Fixed expense tracking is currently under development.</p>
      </div>
    </div>
  );
}
