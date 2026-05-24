'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { InventoryProvider, useInventory } from '@/app/admin/inventory/context';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function InventoryMastersContent() {
  const { stockData } = useInventory();
  const [activeTab, setActiveTab] = useState('categories');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  // Custom masters state
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [isNewMasterOpen, setIsNewMasterOpen] = useState(false);
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterDesc, setNewMasterDesc] = useState('');
  
  const [deletedCategories, setDeletedCategories] = useState<number[]>([]);
  const [modifiedCategories, setModifiedCategories] = useState<Record<number, any>>({});
  const [editingMaster, setEditingMaster] = useState<any>(null);

  const guessCategory = (itemName: string) => {
    const lower = itemName.toLowerCase();
    if (lower.includes('paneer') || lower.includes('milk') || lower.includes('butter')) return 'Dairy';
    if (lower.includes('rice') || lower.includes('oil') || lower.includes('flour') || lower.includes('sugar')) return 'Groceries';
    if (lower.includes('chicken') || lower.includes('meat') || lower.includes('mutton') || lower.includes('fish')) return 'Meat & Poultry';
    if (lower.includes('onion') || lower.includes('tomato') || lower.includes('potato') || lower.includes('veg')) return 'Vegetables';
    if (lower.includes('apple') || lower.includes('mango') || lower.includes('banana')) return 'Fruits';
    return 'Uncategorized';
  };

  // Derive categories from stock data
  const categoriesMap = new Map();
  const MASTER_CATEGORIES = ['Vegetables', 'Dairy', 'Meat & Poultry', 'Groceries', 'Spices', 'Fruits'];
  
  MASTER_CATEGORIES.forEach((name, idx) => {
    categoriesMap.set(name.toLowerCase(), { 
      id: idx + 1, 
      name, 
      code: name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8), 
      description: '', 
      status: 'Active', 
      itemsUsing: 0,
      items: []
    });
  });

  stockData.forEach(item => {
    let catName = item.category;
    if (!catName || catName === 'Uncategorized') {
      catName = guessCategory(item.itemName);
    }
    const key = catName.toLowerCase();
    if (!categoriesMap.has(key)) {
      categoriesMap.set(key, { 
        id: categoriesMap.size + 1, 
        name: catName, 
        code: catName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8), 
        description: '', 
        status: 'Active', 
        itemsUsing: 1,
        items: [item]
      });
    } else {
      const cat = categoriesMap.get(key);
      cat.itemsUsing += 1;
      cat.items.push(item);
    }
  });

  // Add custom categories
  customCategories.forEach(cat => {
    const key = cat.name.toLowerCase();
    if (!categoriesMap.has(key)) {
      categoriesMap.set(key, {
        id: categoriesMap.size + 1,
        ...cat
      });
    }
  });

  let categoriesData = Array.from(categoriesMap.values());
  
  // Apply modifications
  categoriesData = categoriesData.map(c => modifiedCategories[c.id] ? { ...c, ...modifiedCategories[c.id] } : c);

  const filteredCategories = categoriesData.filter(cat => {
    if (deletedCategories.includes(cat.id)) return false;
    if (categoryFilter === 'All') return true;
    return cat.status === categoryFilter;
  });

  // Derive units from stock data
  const unitsMap = new Map();
  
  // Base system units
  const SYSTEM_UNITS = [
    { id: 1, name: 'Kilogram', symbol: 'kg', type: 'Simple', conversion: '—', system: true, status: 'Active' },
    { id: 2, name: 'Dozen', symbol: 'doz', type: 'Compound', conversion: '1 doz = 12 pcs', system: false, status: 'Active' },
    { id: 3, name: 'Pieces', symbol: 'pcs', type: 'Simple', conversion: '—', system: true, status: 'Active' },
    { id: 4, name: 'Liter', symbol: 'L', type: 'Simple', conversion: '—', system: true, status: 'Active' },
  ];
  
  SYSTEM_UNITS.forEach(u => unitsMap.set(u.symbol.toLowerCase(), u));

  stockData.forEach(item => {
    const unitName = item.unit || 'pcs';
    const key = unitName.toLowerCase();
    if (!unitsMap.has(key)) {
      unitsMap.set(key, {
        id: unitsMap.size + 1,
        name: unitName,
        symbol: unitName,
        type: 'Simple',
        conversion: '—',
        system: false,
        status: 'Active'
      });
    }
  });

  const unitsData = Array.from(unitsMap.values());

  const handleAddMaster = () => {
    if (!newMasterName.trim()) return;
    
    if (editingMaster) {
      if (activeTab === 'categories') {
        setModifiedCategories({
          ...modifiedCategories,
          [editingMaster.id]: {
            name: newMasterName,
            description: newMasterDesc,
            code: newMasterName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8),
          }
        });
      }
    } else {
      if (activeTab === 'categories') {
        setCustomCategories([
          ...customCategories, 
          {
            name: newMasterName,
            code: newMasterName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8),
            description: newMasterDesc,
            status: 'Active',
            itemsUsing: 0,
            items: []
          }
        ]);
      } else {
        // In a real app, we'd add unit here too
      }
    }
    
    setNewMasterName('');
    setNewMasterDesc('');
    setIsNewMasterOpen(false);
    setEditingMaster(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory Masters</h1>
          <p className="text-gray-500">Manage categories and units — Hotel Admin exclusive</p>
        </div>
        <Button 
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => {
            setEditingMaster(null);
            setNewMasterName('');
            setNewMasterDesc('');
            setIsNewMasterOpen(true);
          }}
        >
          + New {activeTab === 'categories' ? 'Category' : 'Unit'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none p-0 h-auto space-x-8 mb-6">
          <TabsTrigger 
            value="categories" 
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none py-3 px-1 font-semibold text-gray-500 data-[state=active]:text-orange-600"
          >
            Categories
          </TabsTrigger>
          <TabsTrigger 
            value="units" 
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none py-3 px-1 font-semibold text-gray-500 data-[state=active]:text-orange-600"
          >
            Units
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center gap-2 bg-white w-fit rounded-lg border p-1 shadow-sm">
            {['All', 'Active', 'Archived'].map(filter => (
              <button
                key={filter}
                onClick={() => setCategoryFilter(filter)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  categoryFilter === filter 
                    ? 'bg-gray-100 text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
                    <tr>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Name</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Code</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Description</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Status</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Items Using</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCategories.map(cat => (
                      <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{cat.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{cat.code}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{cat.description}</td>
                        <td className="px-6 py-4">
                          {cat.status === 'Active' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Archived</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{cat.itemsUsing}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3 text-orange-600 font-medium items-center">
                            <button 
                              onClick={() => setSelectedCategory(cat)}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <span className="text-gray-300">|</span>

                            <button 
                              onClick={() => {
                                setEditingMaster(cat);
                                setNewMasterName(cat.name);
                                setNewMasterDesc(cat.description || '');
                                setIsNewMasterOpen(true);
                              }}
                              className="hover:text-orange-700 hover:underline"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">•</span>
                            <button 
                              onClick={() => setDeletedCategories([...deletedCategories, cat.id])}
                              className="hover:text-red-600 text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
                    <tr>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Name</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Symbol</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Type</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Conversion</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">System Unit</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Status</th>
                      <th className="px-6 py-4 uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unitsData.map(unit => (
                      <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{unit.name}</td>
                        <td className="px-6 py-4 font-medium text-gray-600">{unit.symbol}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-normal">
                            {unit.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{unit.conversion}</td>
                        <td className="px-6 py-4">
                          {unit.system ? <span className="text-gray-400">🔒 Yes</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {!unit.system && (
                            <div className="flex gap-3 text-orange-600 font-medium">
                              <button className="hover:text-orange-700 hover:underline">Edit</button>
                              <span className="text-gray-300">•</span>
                              <button className="hover:text-red-600 text-red-500 hover:underline">Archive</button>
                            </div>
                          )}
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

      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Items in Category: {selectedCategory?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedCategory?.items?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in this category.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Approved Qty</th>
                    <th className="px-4 py-3">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedCategory?.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-gray-500">{item.department}</td>
                      <td className="px-4 py-3">{item.approvedQty}</td>
                      <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Master Modal */}
      <Dialog open={isNewMasterOpen} onOpenChange={setIsNewMasterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaster ? 'Edit' : 'Add New'} {activeTab === 'categories' ? 'Category' : 'Unit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input 
                placeholder={`e.g. ${activeTab === 'categories' ? 'Beverages' : 'Box'}`} 
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
              />
            </div>
            {activeTab === 'categories' && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="Optional description" 
                  value={newMasterDesc}
                  onChange={(e) => setNewMasterDesc(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMasterOpen(false)}>Cancel</Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700" 
              onClick={handleAddMaster}
              disabled={!newMasterName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InventoryMastersPage() {
  return (
    <RoleGuard allowedRoles={['superadmin', 'admin']}>
      <InventoryMastersContent />
    </RoleGuard>
  );
}
