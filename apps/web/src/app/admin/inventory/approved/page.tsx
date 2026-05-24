'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '../context';
import { CheckCircle, Clock } from 'lucide-react';

export default function StockApprovedPage() {
  const { stockApproved } = useInventory();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-8 h-8 text-green-600" />
          Stock Approved
        </h1>
        <p className="text-gray-500">View items that have been approved for departmental use.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved Issuances</CardTitle>
          <CardDescription>
            These items were successfully approved and deducted from main stock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Approval ID</th>
                  <th className="px-6 py-4 font-semibold">Particular Section</th>
                  <th className="px-6 py-4 font-semibold">Particular Product</th>
                  <th className="px-6 py-4 font-semibold">Issued Qty</th>
                  <th className="px-6 py-4 font-semibold">Remaining Stock</th>
                  <th className="px-6 py-4 font-semibold">Expiry Date</th>
                  <th className="px-6 py-4 font-semibold">Approval Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockApproved.map(item => {
                  const isExpired = item.expiryDate && new Date(item.expiryDate).getTime() < new Date().getTime();
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-normal border-orange-200">
                          {item.section}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.product}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {item.issuedQty}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-700">
                        {item.availableStockQty}
                      </td>
                      <td className="px-6 py-4">
                        {item.expiryDate ? (
                          <span className={isExpired ? 'text-red-600 font-bold' : 'text-gray-600'}>
                            {item.expiryDate} {isExpired && '(Expired)'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.approvalDate}
                      </td>
                    </tr>
                  );
                })}
                {stockApproved.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No stock approved yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
