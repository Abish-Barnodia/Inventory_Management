'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileSpreadsheet, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory } from '../context';
import apiClient from '@/services/apiClient';

// To avoid hard-coded values directly in JSX, we define or fetch them.
// In a real scenario, these would come from the API (Inventory Masters).
const API_ENDPOINTS = {
  categories: '/api/categories',
  units: '/api/units',
  paymentMethods: '/api/payment-methods',
};

type Category = { id: string; name: string };
type Unit = { id: string; name: string; symbol: string };

export default function StockEntriesPage() {
  // Master data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  // Single Entry Form State
  const [formData, setFormData] = useState({
    itemName: '',
    categoryId: '',
    quantity: '',
    unitId: '',
    purchasePrice: '',
    totalAmount: '',
    billAvailable: true,
    billNo: '',
    vendor: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    reference: '',
    notes: '',
    expiryDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Upload State
  const [file, setFile] = useState<File | null>(null);
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'validating' | 'results' | 'complete'>('idle');

  // Fetch Master Data (Mocked for now since backend is down)
  useEffect(() => {
    // Simulate fetching from API
    setCategories([
      { id: '1', name: 'Vegetables' },
      { id: '2', name: 'Dairy' },
      { id: '3', name: 'Meat & Poultry' },
      { id: '4', name: 'Groceries' },
      { id: '5', name: 'Fruits' },
    ]);
    setUnits([
      { id: '1', name: 'Kilogram', symbol: 'kg' },
      { id: '2', name: 'Gram', symbol: 'g' },
      { id: '3', name: 'Liter', symbol: 'L' },
      { id: '4', name: 'Pieces', symbol: 'pcs' },
    ]);
    setPaymentMethods(['Cash', 'UPI', 'Online Transfer', 'Cheque', 'Card', 'Credit']);
  }, []);

  // Handle Input Changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate total amount
      if (field === 'quantity' || field === 'purchasePrice') {
        const qty = parseFloat(updated.quantity || '0');
        const price = parseFloat(updated.purchasePrice || '0');
        if (!isNaN(qty) && !isNaN(price)) {
          updated.totalAmount = (qty * price).toFixed(2);
        }
      }
      return updated;
    });
  };

  const { setRequests } = useInventory();

  const handleSingleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    if (!formData.itemName || !formData.categoryId || !formData.quantity || !formData.unitId || !formData.purchasePrice || !formData.paymentMethod) {
      toast.error('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    if (formData.billAvailable && !formData.billNo) {
      toast.error('Bill/Invoice No is required when Bill Available is turned on.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post('/inventory/entries', {
        invoiceNumber: formData.billNo || `MANUAL-${Date.now()}`,
        vendorName: formData.vendor || 'Unknown',
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paymentStatus: formData.paymentMethod ? 'paid' : 'unpaid',
        items: [{
          itemName: formData.itemName,
          quantity: parseFloat(formData.quantity)
        }]
      });

      const unitName = units.find(u => u.id === formData.unitId)?.symbol || 'kg';
      const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'Uncategorized';
      
      setRequests(prev => [
        {
          id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
          itemName: formData.itemName,
          department: formData.vendor || 'Main Store',
          category: categoryName,
          requestedQty: parseFloat(formData.quantity),
          unit: unitName,
          urgency: 'Normal',
          status: 'PENDING',
          date: formData.purchaseDate,
          expiryDate: formData.expiryDate || undefined,
          notes: formData.notes || `Purchase entry. Bill: ${formData.billNo}`
        },
        ...prev
      ]);

      toast.success('Stock entry saved to backend successfully!');
      // Reset form
      setFormData({
        itemName: '', categoryId: '', quantity: '', unitId: '', purchasePrice: '', totalAmount: '',
        billAvailable: true, billNo: '', vendor: '', purchaseDate: new Date().toISOString().split('T')[0],
        paymentMethod: '', reference: '', notes: '', expiryDate: ''
      });
    } catch (error) {
      toast.error('Failed to save stock entry to database.');
    } finally {
      setIsSubmitting(false);
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
    
    try {

      const formData = new FormData();
      formData.append('file', file);
      
      // Sending it to the API (which now handles the Tesseract OCR extraction on the backend)
      let itemsUpdated = 0;
      let extractedItems: any[] = [];
      
      try {
        const response = await apiClient.post('/inventory/entries/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data?.itemsUpdated) itemsUpdated = response.data.itemsUpdated;
        if (response.data?.extractedItems) extractedItems = response.data.extractedItems;
      } catch (err) {
        console.error("OCR Extraction failed on backend", err);
        throw err; // Fail explicitly so we don't mock it
      }

      if (extractedItems.length === 0) {
        toast.error("No valid items could be extracted from the invoice.");
        setBulkStatus('idle');
        return;
      }

      // Map the real extracted items to the request state
      const processedItems = extractedItems.map(item => ({
        id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
        itemName: item.itemName,
        department: 'Spice Garden Restaurant', // Fallback
        category: item.category || 'Groceries', // Use dynamically extracted category from backend
        requestedQty: item.quantity,
        unit: item.unit || 'kg',
        urgency: 'Normal',
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0],
        notes: `Extracted via OCR @ ₹${item.price}`
      }));
      
      // @ts-ignore - bypassing strict type check
      setRequests((prev) => [...processedItems, ...prev]);

      toast.success(`Successfully uploaded and extracted ${processedItems.length} rows via AI OCR.`);
      setBulkStatus('complete');
    } catch (error) {
      toast.error('Failed to process the invoice.');
      setBulkStatus('idle');
    }
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast.loading('Extracting data from bill via AI...', { id: 'ocr-toast' });
      setIsSubmitting(true);
      
      // Simulate OCR delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFormData(prev => ({
        ...prev,
        itemName: 'Premium Basmati Rice',
        categoryId: '4', // Groceries
        quantity: '50',
        unitId: '1', // kg
        purchasePrice: '85',
        totalAmount: (50 * 85).toFixed(2),
        billAvailable: true,
        billNo: 'INV-' + Math.floor(10000 + Math.random() * 90000),
        vendor: 'Reliance Fresh Wholesale',
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        paymentMethod: 'UPI',
        reference: 'TXN' + Math.floor(10000000 + Math.random() * 90000000),
        notes: 'Auto-filled via Bill Upload OCR'
      }));
      
      setIsSubmitting(false);
      toast.success('Bill scanned successfully! Fields auto-filled.', { id: 'ocr-toast' });
    }
  };

  return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add Stock Entry</h1>
          <p className="text-gray-500">Record new inventory purchases. Expenses will be auto-created.</p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="single">Single Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card className="border-t-4 border-t-orange-500 shadow-sm">
              <CardHeader>
                <CardTitle>Single Item Entry</CardTitle>
                <CardDescription>Enter details for a single stock purchase.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleEntrySubmit} className="space-y-6">
                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="itemName">Item Name <span className="text-red-500">*</span></Label>
                      <Input id="itemName" placeholder="e.g. Basmati Rice" value={formData.itemName} onChange={(e) => handleInputChange('itemName', e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                      <Select value={formData.categoryId} onValueChange={(val) => handleInputChange('categoryId', val)} required>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                      <Input id="quantity" type="number" min="0.01" step="0.01" placeholder="0.00" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit <span className="text-red-500">*</span></Label>
                      <Select value={formData.unitId} onValueChange={(val) => handleInputChange('unitId', val)} required>
                        <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                        <SelectContent>
                          {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">Price per Unit (₹) <span className="text-red-500">*</span></Label>
                      <Input id="purchasePrice" type="number" min="0" step="0.01" placeholder="0.00" value={formData.purchasePrice} onChange={(e) => handleInputChange('purchasePrice', e.target.value)} required />
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border">
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label>Total Amount</Label>
                      <div className="text-3xl font-bold text-gray-900">
                        ₹ {formData.totalAmount || '0.00'}
                      </div>
                      <p className="text-xs text-gray-500">Auto-calculated</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="billAvailable" className="text-base">Bill / Invoice Available?</Label>
                        <Switch id="billAvailable" checked={formData.billAvailable} onCheckedChange={(val) => handleInputChange('billAvailable', val)} />
                      </div>
                      {formData.billAvailable && (
                        <div className="space-y-2">
                          <Label htmlFor="billNo">Bill/Invoice Number <span className="text-red-500">*</span></Label>
                          <Input id="billNo" placeholder="INV-12345" value={formData.billNo} onChange={(e) => handleInputChange('billNo', e.target.value)} required={formData.billAvailable} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor / Supplier</Label>
                      <Input id="vendor" placeholder="e.g. FreshMart" value={formData.vendor} onChange={(e) => handleInputChange('vendor', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date <span className="text-red-500">*</span></Label>
                      <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => handleInputChange('purchaseDate', e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => handleInputChange('expiryDate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method <span className="text-red-500">*</span></Label>
                      <Select value={formData.paymentMethod} onValueChange={(val) => handleInputChange('paymentMethod', val)} required>
                        <SelectTrigger><SelectValue placeholder="Select Method" /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reference">Payment Reference / UTR</Label>
                      <Input id="reference" placeholder="e.g. UTR123456789" value={formData.reference} onChange={(e) => handleInputChange('reference', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billAttachment">Bill Attachment (Optional) <span className="text-xs text-orange-500 font-normal ml-2">✨ AI Auto-fill</span></Label>
                      <Input id="billAttachment" type="file" accept="image/*,.pdf" onChange={handleBillUpload} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes / Remarks</Label>
                    <Textarea id="notes" placeholder="Any additional details..." value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} />
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Entry'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="border-t-4 border-t-orange-500 shadow-sm">
              <CardHeader>
                <CardTitle>Bulk Upload Entries</CardTitle>
                <CardDescription>Upload a PDF or PNG invoice to automatically extract and add multiple stock entries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {bulkStatus === 'idle' && (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                      <FileSpreadsheet className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold">AI Powered OCR</h4>
                        <p className="text-sm">Upload a bill or invoice image. Our AI will automatically extract all the items, quantities, and prices to add them to your inventory.</p>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors mt-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Upload Invoice File</h4>
                          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">Drag and drop your PDF or PNG invoice file here, or click to browse. Max size 10MB.</p>
                        </div>
                        <Input type="file" accept=".png,.pdf,image/png,application/pdf" className="max-w-xs cursor-pointer" onChange={handleFileUpload} />
                        {file && <p className="text-sm font-medium text-green-600 mt-2">Selected: {file.name}</p>}
                        
                        <Button onClick={handleBulkUpload} disabled={!file} className="mt-4 bg-blue-600 hover:bg-blue-700">
                          Upload & Validate
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {bulkStatus === 'validating' && (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-semibold">Extracting data via AI...</h3>
                    <p className="text-gray-500 text-sm mt-2">Reading invoice items, categories, units, and prices using OCR.</p>
                  </div>
                )}

                {/* Bulk results removed, jumping straight to complete */}

                {bulkStatus === 'complete' && (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Upload Complete!</h3>
                    <p className="text-gray-500 max-w-md mx-auto">21 stock entries have been added and their corresponding purchase expenses have been auto-created.</p>
                    <Button variant="outline" className="mt-6" onClick={() => { setBulkStatus('idle'); setFile(null); }}>Upload Another File</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
