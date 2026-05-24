'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalAll: 0, totalPurchase: 0, totalFixed: 0, totalVariable: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [paymentFilter, setPaymentFilter] = useState('All Payment Methods');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialog State
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'Fixed' | 'Variable'>('Fixed');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: 'Cash',
    vendor: ''
  });

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'purchase': return 'bg-orange-100 text-orange-700';
      case 'fixed': return 'bg-blue-100 text-blue-700';
      case 'variable': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [typeFilter, categoryFilter, paymentFilter, searchTerm, startDate, endDate]);

  const fetchExpenses = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter !== 'All Types') queryParams.append('type', typeFilter);
      if (categoryFilter !== 'All Categories') queryParams.append('category', categoryFilter);
      if (paymentFilter !== 'All Payment Methods') queryParams.append('paymentMethod', paymentFilter);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await apiClient.get(`/finances/expenses?${queryParams.toString()}`);
      if (response.data) {
        setExpenses(response.data.expenses);
        setTotals(response.data.totals);
      }
    } catch (error) {
      console.error('Failed to fetch expenses', error);
      toast.error('Failed to fetch expenses from backend');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/finances/expenses', {
        type: expenseType,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        payment: formData.paymentMethod,
        vendor: formData.vendor || '-'
      });
      
      toast.success(`${expenseType} expense recorded successfully.`);
      setIsExpenseOpen(false);
      setFormData({ description: '', amount: '', category: '', paymentMethod: 'Cash', vendor: '' });
      fetchExpenses();
    } catch (error) {
      toast.error(`Failed to record ${expenseType} expense.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Expense Management</h1>
          <p className="text-sm text-gray-500 mt-1">All expenses across purchases, fixed, and variable</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => { setExpenseType('Fixed'); setIsExpenseOpen(true); }}>
            <Plus className="w-4 h-4" /> Fixed Expense
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 gap-2" onClick={() => { setExpenseType('Variable'); setIsExpenseOpen(true); }}>
            <Plus className="w-4 h-4" /> Variable Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total (This Month)</p>
            <p className="text-2xl font-bold mt-1">₹{totals.totalAll.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Purchase Expenses</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">₹{totals.totalPurchase.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Fixed Expenses</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">₹{totals.totalFixed.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Variable Expenses</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">₹{totals.totalVariable.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <div className="p-4 border-b flex flex-wrap gap-4 items-center bg-gray-50/50">
          <select 
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); toast.success(`Filtered by ${e.target.value}`); }}
            className="flex h-10 w-full md:w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option>All Types</option>
            <option>Purchase</option>
            <option>Fixed</option>
            <option>Variable</option>
          </select>
          <select 
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); toast.success(`Filtered by ${e.target.value}`); }}
            className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option>All Categories</option>
            <option>Food & Beverage</option>
            <option>Maintenance</option>
            <option>Utilities</option>
            <option>Salaries</option>
          </select>
          <select 
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); toast.success(`Filtered by ${e.target.value}`); }}
            className="flex h-10 w-full md:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option>All Payment Methods</option>
            <option>Cash</option>
            <option>Credit Card</option>
            <option>Bank Transfer</option>
            <option>UPI</option>
          </select>
          
          <div className="flex items-center gap-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="pl-3 py-2 flex items-center">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
            <Input 
              type="date" 
              className="border-0 shadow-none h-10 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-w-[120px]" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>
          <div className="flex items-center gap-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="pl-3 py-2 flex items-center">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
            <Input 
              type="date" 
              className="border-0 shadow-none h-10 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-w-[120px]" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="Search vendor..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{exp.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={getTypeColor(exp.type)}>{exp.type}</Badge>
                  </td>
                  <td className="px-4 py-3">{exp.description}</td>
                  <td className="px-4 py-3">
                    {exp.category !== '-' ? (
                      <Badge variant="outline" className="font-normal">{exp.category}</Badge>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">₹{exp.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{exp.payment}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.vendor}</td>
                  <td className="px-4 py-3">
                    <button className="text-orange-600 hover:underline font-medium text-xs">
                      {exp.type === 'Purchase' ? 'View' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No expenses found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expense Form Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record {expenseType} Expense</DialogTitle>
            <DialogDescription>
              Enter the details for this {expenseType.toLowerCase()} expenditure.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input required placeholder="e.g. Electric Bill, Marketing..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input required type="number" min="0" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="" disabled>Select Category</option>
                  <option>Food & Beverage</option>
                  <option>Maintenance</option>
                  <option>Utilities</option>
                  <option>Salaries</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select 
                  required
                  value={formData.paymentMethod}
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option>Cash</option>
                  <option>Credit Card</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Vendor (Optional)</Label>
                <Input placeholder="Vendor name" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Save Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
