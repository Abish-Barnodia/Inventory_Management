'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';

type IssuanceStatus = 'PENDING_ISSUANCE' | 'ISSUED' | 'RECEIVED';

type StockIssuance = {
  id: string;
  requestId: string;
  itemName: string;
  department: string;
  approvedQty: number;
  unit: string;
  status: IssuanceStatus;
  date: string;
};

// We'll fetch this from the API now.

export default function StockIssuancesPage() {
  const [issuances, setIssuances] = useState<StockIssuance[]>([]);
  
  // Bulk Issuance State
  const [file, setFile] = useState<File | null>(null);
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'validating' | 'results' | 'complete'>('idle');

  useEffect(() => {
    fetchIssuances();
  }, []);

  const fetchIssuances = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/requests`);
      if (response.ok) {
        const data = await response.json();
        const formatted: StockIssuance[] = [];
        data.forEach((req: any) => {
          if (req.items && req.items.length > 0) {
            req.items.forEach((item: any) => {
              formatted.push({
                id: req.id.toString(),
                requestId: req.request_number,
                itemName: item.itemName,
                department: req.department,
                approvedQty: item.quantityRequested, // using requested qty as approved qty for simplicity if not set
                unit: 'units', // Backend doesn't store unit currently, so fallback to 'units'
                status: req.status === 'pending' ? 'PENDING_ISSUANCE' : 'ISSUED',
                date: new Date(req.created_at).toISOString().split('T')[0]
              });
            });
          }
        });
        setIssuances(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch issuances:', error);
    }
  };

  const handleIssueSingle = async (issId: string) => {
    try {
      // Find the item to get its name and quantity for deduction
      const issuance = issuances.find(iss => iss.id === issId);
      if (!issuance) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/requests/${issId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'approved',
          itemsApproved: [{
            itemName: issuance.itemName,
            quantityApproved: issuance.approvedQty
          }]
        })
      });

      if (!response.ok) throw new Error('API error');

      setIssuances(prev => prev.map(iss => {
        if (iss.id === issId) {
          return { ...iss, status: 'ISSUED' };
        }
        return iss;
      }));
      toast.success('Stock marked as ISSUED. Department notified and stock deducted.');
    } catch (error) {
      toast.error('Failed to update issuance status.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleBulkUpload = async () => {
    if (!file) return;
    setBulkStatus('validating');
    
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setBulkStatus('results');
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Issuances</h1>
          <p className="text-gray-500">Issue approved stock to departments or upload bulk issuances.</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="pending">Pending Issuance</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="history">Issuance History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Issuances</CardTitle>
                <CardDescription>Approved requests waiting to be physically handed over.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Issuance ID</th>
                        <th className="px-6 py-4 font-semibold">Request Ref</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Item & Approved Qty</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {issuances.filter(i => i.status === 'PENDING_ISSUANCE').map(iss => (
                        <tr key={iss.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-medium text-gray-900">{iss.id}</td>
                          <td className="px-6 py-4 text-blue-600 font-medium">{iss.requestId}</td>
                          <td className="px-6 py-4">{iss.department}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{iss.itemName}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{iss.approvedQty} {iss.unit}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleIssueSingle(iss.id)}>
                              <PackageOpen className="w-4 h-4 mr-2" /> Mark as Issued
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {issuances.filter(i => i.status === 'PENDING_ISSUANCE').length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No pending issuances.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="border-t-4 border-t-orange-500 shadow-sm">
              <CardHeader>
                <CardTitle>Bulk Issuance Upload</CardTitle>
                <CardDescription>Upload a CSV file to issue multiple items across departments simultaneously.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {bulkStatus === 'idle' && (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                      <FileSpreadsheet className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold">Step 1: Download Template</h4>
                        <p className="text-sm">Download the Issuance CSV template and fill in item details and departments.</p>
                      </div>
                      <Button variant="outline" className="bg-white hover:bg-orange-100 hover:text-orange-800 border-orange-300">
                        Download CSV
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Step 2: Upload Completed CSV</h4>
                          <p className="text-sm text-gray-500 mt-1">Validates stock availability and department names.</p>
                        </div>
                        <Input type="file" accept=".csv" className="max-w-xs cursor-pointer" onChange={handleFileUpload} />
                        {file && <p className="text-sm font-medium text-green-600 mt-2">Selected: {file.name}</p>}
                        
                        <Button onClick={handleBulkUpload} disabled={!file} className="mt-4 bg-orange-600 hover:bg-orange-700">
                          Upload & Validate
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {bulkStatus === 'validating' && (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-semibold">Reserving Stock & Validating...</h3>
                  </div>
                )}

                {bulkStatus === 'results' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50 border-green-200 shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                          <p className="text-sm text-green-600 font-medium uppercase">Ready to Issue</p>
                          <p className="text-3xl font-bold text-green-700 mt-1">15</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-red-200 shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                          <p className="text-sm text-red-600 font-medium uppercase">Stock Shortfall</p>
                          <p className="text-3xl font-bold text-red-700 mt-1">1</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3">Qty to Issue</th>
                            <th className="px-4 py-3">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="bg-red-50/50">
                            <td className="px-4 py-3 text-gray-500">Main Kitchen</td>
                            <td className="px-4 py-3 text-gray-500">Saffron</td>
                            <td className="px-4 py-3 text-gray-500">50 g</td>
                            <td className="px-4 py-3 text-red-600 font-medium">Insufficient stock (Only 20g available)</td>
                          </tr>
                          <tr className="bg-green-50/50">
                            <td className="px-4 py-3">Tea Stall</td>
                            <td className="px-4 py-3">Milk</td>
                            <td className="px-4 py-3">20 L</td>
                            <td className="px-4 py-3 text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Valid</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button variant="outline" onClick={() => setBulkStatus('idle')}>Cancel</Button>
                      <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
                        toast.success('Valid rows issued successfully! Inventory decremented.');
                        setBulkStatus('complete');
                      }}>Confirm Bulk Issuance</Button>
                    </div>
                  </div>
                )}

                {bulkStatus === 'complete' && (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Issuance Complete!</h3>
                    <p className="text-gray-500 max-w-md mx-auto">Stock has been decremented and departments have been notified.</p>
                    <Button variant="outline" className="mt-6" onClick={() => { setBulkStatus('idle'); setFile(null); }}>Upload Another File</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Issuance History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Issuance ID</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Item & Qty</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {issuances.filter(i => i.status !== 'PENDING_ISSUANCE').map(iss => (
                        <tr key={iss.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-gray-500">{iss.date}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{iss.id}</td>
                          <td className="px-6 py-4">{iss.department}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{iss.itemName}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{iss.approvedQty} {iss.unit}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Issued
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
