'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useInventory, KitchenRequest } from '../context';
import { ChefHat } from 'lucide-react';

const CATEGORIES = ['Vegetables', 'Dairy', 'Meat & Poultry', 'Groceries', 'Spices', 'Fruits'];
const UNITS = ['kg', 'g', 'L', 'pcs'];

export default function KitchenRequestPage() {
  const { setKitchenRequests, stockData } = useInventory();
  
  const [formData, setFormData] = useState({
    category: '',
    product: '',
    quantity: '',
    unit: '',
    details: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!formData.category || !formData.product || !formData.quantity || !formData.unit) {
      toast.error('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newReq: KitchenRequest = {
        id: `KR-${Math.floor(1000 + Math.random() * 9000)}`,
        category: formData.category,
        product: formData.product,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        details: formData.details,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0]
      };

      setKitchenRequests(prev => [newReq, ...prev]);

      toast.success('Kitchen request submitted successfully! Pending approval.');
      setFormData({ category: '', product: '', quantity: '', unit: '', details: '' });
    } catch (error) {
      toast.error('Failed to submit kitchen request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-orange-600" />
          Kitchen Request
        </h1>
        <p className="text-gray-500">Submit requests for ingredients and stock required in the kitchen.</p>
      </div>

      <Card className="border-t-4 border-t-orange-500 shadow-sm">
        <CardHeader>
          <CardTitle>New Request Form</CardTitle>
          <CardDescription>Fill out the details for the stock you need.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select value={formData.category} onValueChange={(val) => handleInputChange('category', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Product Name <span className="text-red-500">*</span></Label>
                <Select value={formData.product} onValueChange={(val) => handleInputChange('product', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select Product from Stock" /></SelectTrigger>
                  <SelectContent>
                    {stockData.length === 0 && <SelectItem value="none" disabled>No stock available</SelectItem>}
                    {Array.from(new Set(stockData.map(s => s.itemName))).map(itemName => (
                      <SelectItem key={itemName} value={itemName}>{itemName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.product && (
                  <p className="text-xs text-gray-500">
                    Available in stock: {stockData.find(s => s.itemName === formData.product)?.approvedQty || 0} {stockData.find(s => s.itemName === formData.product)?.unit}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input id="quantity" type="number" min="0.01" step="0.01" placeholder="0.00" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit <span className="text-red-500">*</span></Label>
                <Select value={formData.unit} onValueChange={(val) => handleInputChange('unit', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Other Required Details</Label>
              <Textarea id="details" placeholder="Any specific requirements, brands, or urgency details..." value={formData.details} onChange={(e) => handleInputChange('details', e.target.value)} />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Sending Request...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
