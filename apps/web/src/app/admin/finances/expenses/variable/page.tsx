import React from 'react';

export default function VariableExpensesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Variable Expenses</h1>
        <p className="text-gray-500">Track dynamic daily expenses, petty cash, and miscellaneous spending.</p>
      </div>
      
      <div className="bg-white rounded-lg border p-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Variable Expenses Coming Soon</h3>
        <p className="text-gray-500">Variable expense tracking is currently under development.</p>
      </div>
    </div>
  );
}
