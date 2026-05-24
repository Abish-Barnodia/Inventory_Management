'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, AlertTriangle, Settings2, BellRing, PackageSearch, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory } from './context';

type InventoryItem = {
  id: string;
  name: string;
  department?: string;
  category: string;
  totalStock: number;
  issuedStock: number;
  currentStock: number;
  unit: string;
  lowStockThreshold: number | null;
  lastUpdated: string;
};

export default function InventoryOverviewPage() {
  const { stockData, stockApproved } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  
  // Alert Threshold State
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newThreshold, setNewThreshold] = useState('');

  // Load thresholds
  React.useEffect(() => {
    const stored = localStorage.getItem('inventory_thresholds');
    if (stored) setThresholds(JSON.parse(stored));
  }, []);

  const handleSaveThreshold = () => {
    if (!selectedItem) return;
    
    const parsedThreshold = newThreshold === '' ? null : parseFloat(newThreshold);
    
    const updated = { ...thresholds };
    if (parsedThreshold === null) {
      delete updated[selectedItem.id];
    } else {
      updated[selectedItem.id] = parsedThreshold;
    }
    
    setThresholds(updated);
    localStorage.setItem('inventory_thresholds', JSON.stringify(updated));

    toast.success('Low stock alert threshold updated successfully.');
    setAlertOpen(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" /> Out of Stock</Badge>;
    }
    if (item.lowStockThreshold !== null && item.currentStock <= item.lowStockThreshold) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" /> Low Stock</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>;
  };

  const guessCategory = (itemName: string) => {
    const lower = itemName.toLowerCase();
    if (lower.includes('paneer') || lower.includes('milk') || lower.includes('butter')) return 'Dairy';
    if (lower.includes('rice') || lower.includes('oil') || lower.includes('flour') || lower.includes('sugar')) return 'Groceries';
    if (lower.includes('chicken') || lower.includes('meat') || lower.includes('mutton') || lower.includes('fish')) return 'Meat & Poultry';
    if (lower.includes('onion') || lower.includes('tomato') || lower.includes('potato') || lower.includes('veg')) return 'Vegetables';
    if (lower.includes('apple') || lower.includes('mango') || lower.includes('banana')) return 'Fruits';
    return 'Uncategorized';
  };

  const dynamicItems: InventoryItem[] = stockData.map(dataItem => {
    const totalIssued = stockApproved
      .filter(a => a.product.toLowerCase() === dataItem.itemName.toLowerCase())
      .reduce((sum, a) => sum + a.issuedQty, 0);

    let category = dataItem.category;
    if (!category || category === 'Uncategorized') {
      category = guessCategory(dataItem.itemName);
    }

    return {
      id: dataItem.id,
      name: dataItem.itemName,
      department: dataItem.department, 
      category: category,
      totalStock: dataItem.approvedQty,
      issuedStock: totalIssued,
      currentStock: Math.max(0, dataItem.approvedQty - totalIssued),
      unit: dataItem.unit,
      lowStockThreshold: thresholds[dataItem.id] || null,
      lastUpdated: dataItem.approvalDate
    };
  });

  const filteredItems = dynamicItems.filter(item => {
    // 1. Search Filter
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Department Filter
    const matchesDepartment = departmentFilter === 'all' || (item.department && item.department.toLowerCase() === departmentFilter.toLowerCase());
    
    // 3. Category Filter
    const matchesCategory = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();
    
    // 4. Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const isOutOfStock = item.currentStock === 0;
      const isLowStock = item.lowStockThreshold !== null && item.currentStock <= item.lowStockThreshold && item.currentStock > 0;
      const isInStock = !isOutOfStock && !isLowStock;

      if (statusFilter === 'outofstock') matchesStatus = isOutOfStock;
      else if (statusFilter === 'lowstock') matchesStatus = isLowStock;
      else if (statusFilter === 'instock') matchesStatus = isInStock;
    }
    
    // 5. Date Filter
    const matchesDate = !dateFilter || item.lastUpdated === dateFilter;

    return matchesSearch && matchesDepartment && matchesCategory && matchesStatus && matchesDate;
  });

  // Get unique departments & categories for the filter dropdowns
  const uniqueDepartments = Array.from(new Set(dynamicItems.map(item => item.department))).filter(Boolean) as string[];
  
  // Always show the master categories, plus any unique ones from data
  const MASTER_CATEGORIES = ['Vegetables', 'Dairy', 'Meat & Poultry', 'Groceries', 'Spices', 'Fruits'];
  const uniqueCategories = Array.from(new Set([
    ...MASTER_CATEGORIES,
    ...dynamicItems.map(item => item.category)
  ])).filter(Boolean);

  return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory Overview</h1>
            <p className="text-gray-500">Monitor hotel-wide stock levels and configure alerts.</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-t-4 border-t-orange-500 shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1 w-full relative">
              <Label>Search Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="e.g. Rice, Milk..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full md:w-48">
              <Label>Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full md:w-48">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full md:w-48">
              <Label>Stock Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="lowstock">Low Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full md:w-48">
              <Label>Date</Label>
              <Input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full md:w-auto"><Settings2 className="w-4 h-4 mr-2"/> More Filters</Button>
          </CardContent>
        </Card>

        {/* Inventory List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Item Name</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold text-gray-500">Total Stock</th>
                    <th className="px-6 py-4 font-semibold text-orange-600">Issued</th>
                    <th className="px-6 py-4 font-semibold text-green-700">Remaining Stock</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last Updated</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <PackageSearch className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-blue-600 hover:underline cursor-pointer">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-normal">{item.department}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">
                        {item.totalStock} <span className="font-normal text-xs">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-orange-600">
                        {item.issuedStock} <span className="font-normal text-xs">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-green-700 bg-green-50/30">
                        {item.currentStock} <span className="font-medium text-green-600 text-xs">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStockStatus(item)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {item.lastUpdated}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            setSelectedItem(item);
                            setNewThreshold(item.lowStockThreshold?.toString() || '');
                            setAlertOpen(true);
                          }}
                        >
                          <BellRing className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No items found matching your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Set Alert Threshold Dialog */}
        <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Low Stock Alert</DialogTitle>
              <DialogDescription>Configure when you want to be notified about low stock for {selectedItem?.name}.</DialogDescription>
            </DialogHeader>
            
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center mb-4">
                  <span className="font-medium text-gray-700">Current Stock:</span>
                  <span className="font-bold text-gray-900 text-lg">{selectedItem.currentStock} {selectedItem.unit}</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Alert me when stock drops below:</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      placeholder="e.g. 5" 
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      min="0"
                      step="0.01"
                      className="max-w-[200px]"
                    />
                    <span className="text-gray-500 font-medium">{selectedItem.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Leave blank to disable alerts for this item.</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAlertOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveThreshold} className="bg-orange-600 hover:bg-orange-700">Save Threshold</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
