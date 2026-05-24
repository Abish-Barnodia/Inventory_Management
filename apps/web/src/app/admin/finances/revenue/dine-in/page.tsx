import React from 'react';

export default function DineInRevenuePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dine-in Revenue</h1>
        <p className="text-gray-500">Track incoming revenue and metrics for dine-in tables.</p>
      </div>
      
      <div className="bg-white rounded-lg border p-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Dine-in Metrics Coming Soon</h3>
        <p className="text-gray-500">Detailed dine-in revenue tracking will be available here.</p>
      </div>
    </div>
  );
}
