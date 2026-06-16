'use client';

import { useState, useEffect } from 'react';
import { superAdminApi } from '@/lib/api';
import { Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [emailConfig, setEmailConfig] = useState<any>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Modals / Inputs
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  const [newUnit, setNewUnit] = useState({ name: '', symbol: '', type: 'weight' });
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pmRes, unitsRes, emailRes] = await Promise.all([
        superAdminApi.getPaymentMethods(),
        superAdminApi.getDefaultUnits(),
        superAdminApi.getEmailConfig()
      ]);
      setPaymentMethods(pmRes.data || []);
      setUnits(unitsRes.data || []);
      setEmailConfig(emailRes.data || { from_name: '', from_email: '', reply_to: '' });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.trim()) return;
    try {
      await superAdminApi.addPaymentMethod(newPaymentMethod.trim());
      setNewPaymentMethod('');
      setIsAddingPayment(false);
      loadData();
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method. It may already exist.');
    }
  };

  const handleRemovePaymentMethod = async (id: number) => {
    try {
      await superAdminApi.removePaymentMethod(id);
      loadData();
    } catch (error: any) {
      console.error('Error removing payment method:', error);
      if (error.response?.status === 400) {
        alert('Cannot remove payment method with existing references.');
      }
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.symbol.trim()) return;
    try {
      await superAdminApi.addDefaultUnit(newUnit);
      setNewUnit({ name: '', symbol: '', type: 'weight' });
      setIsAddingUnit(false);
      loadData();
    } catch (error) {
      console.error('Error adding unit:', error);
      alert('Failed to add unit. It may already exist.');
    }
  };

  const handleRemoveUnit = async (id: number) => {
    try {
      await superAdminApi.removeDefaultUnit(id);
      loadData();
    } catch (error) {
      console.error('Error removing unit:', error);
    }
  };

  const handleSaveEmailConfig = async () => {
    setIsSavingEmail(true);
    try {
      await superAdminApi.updateEmailConfig(emailConfig);
      alert('Email settings saved successfully.');
    } catch (error) {
      console.error('Error saving email config:', error);
      alert('Failed to save email settings.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Global Configuration</h2>
          <p className="text-gray-500 mt-1">Platform-wide defaults applied to all hotels</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Payment Methods</h3>
                <p className="text-sm text-gray-500">Available in all hotel forms</p>
              </div>
              <button 
                onClick={() => setIsAddingPayment(!isAddingPayment)}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="p-6">
              {isAddingPayment && (
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    placeholder="E.g., Crypto"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <button 
                    onClick={handleAddPaymentMethod}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex justify-between items-center bg-[#F8F9FA] rounded-lg px-4 py-3 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center border border-gray-200">
                        <span className="text-gray-400 text-xs">₹</span>
                      </div>
                      <span className="font-medium text-gray-700">{pm.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{pm.refs_count} refs</span>
                      <button 
                        onClick={() => handleRemovePaymentMethod(pm.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Default Units */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Default Units</h3>
                <p className="text-sm text-gray-500">Seeded into every new hotel</p>
              </div>
              <button 
                onClick={() => setIsAddingUnit(!isAddingUnit)}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="p-0">
              {isAddingUnit && (
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                    placeholder="Name (e.g. Dozen)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <input 
                    type="text" 
                    value={newUnit.symbol}
                    onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                    placeholder="Symbol (dz)"
                    className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <select 
                    value={newUnit.type}
                    onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value })}
                    className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  >
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                    <option value="count">Count</option>
                  </select>
                  <button 
                    onClick={handleAddUnit}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              )}

              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-[#F8F9FA] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Symbol</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-700">{unit.name}</td>
                      <td className="px-6 py-4">{unit.symbol}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          unit.type === 'weight' ? "bg-blue-50 text-blue-600" :
                          unit.type === 'volume' ? "bg-emerald-50 text-emerald-600" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {unit.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRemoveUnit(unit.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Platform Email Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-gray-800">Platform Email Settings</h3>
              <p className="text-sm text-gray-500">Sender identity for all system emails</p>
            </div>
            <button 
              onClick={handleSaveEmailConfig}
              disabled={isSavingEmail}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name</label>
              <input 
                type="text" 
                value={emailConfig.from_name}
                onChange={(e) => setEmailConfig({...emailConfig, from_name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email</label>
              <input 
                type="email" 
                value={emailConfig.from_email}
                onChange={(e) => setEmailConfig({...emailConfig, from_email: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reply-To</label>
              <input 
                type="email" 
                value={emailConfig.reply_to}
                onChange={(e) => setEmailConfig({...emailConfig, reply_to: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
