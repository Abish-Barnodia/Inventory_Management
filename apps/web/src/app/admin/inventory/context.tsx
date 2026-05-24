'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'RECEIVED';

export type StockRequest = {
  id: string;
  itemName: string;
  department: string;
  requestedQty: number;
  unit: string;
  urgency: 'Normal' | 'Urgent';
  status: RequestStatus;
  date: string;
  notes?: string;
  rejectionReason?: string;
  expiryDate?: string;
  category?: string;
};

export type StockDataItem = {
  id: string;
  itemName: string;
  department: string;
  category?: string;
  approvedQty: number;
  unit: string;
  approvalDate: string;
  expiryDate?: string;
};

export type KitchenRequest = {
  id: string;
  category: string;
  product: string;
  quantity: number;
  unit: string;
  details?: string;
  status: RequestStatus;
  date: string;
};

export type StockApprovedItem = {
  id: string;
  section: string;
  product: string;
  issuedQty: number;
  availableStockQty: number;
  expiryDate?: string;
  approvalDate: string;
};

const INITIAL_REQUESTS: StockRequest[] = [];

type InventoryContextType = {
  requests: StockRequest[];
  setRequests: React.Dispatch<React.SetStateAction<StockRequest[]>>;
  stockData: StockDataItem[];
  setStockData: React.Dispatch<React.SetStateAction<StockDataItem[]>>;
  approveRequest: (reqId: string, approvedQty: number) => void;
  kitchenRequests: KitchenRequest[];
  setKitchenRequests: React.Dispatch<React.SetStateAction<KitchenRequest[]>>;
  stockApproved: StockApprovedItem[];
  setStockApproved: React.Dispatch<React.SetStateAction<StockApprovedItem[]>>;
  approveKitchenRequest: (reqId: string, approvedQty: number) => void;
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [stockData, setStockData] = useState<StockDataItem[]>([]);
  const [kitchenRequests, setKitchenRequests] = useState<KitchenRequest[]>([]);
  const [stockApproved, setStockApproved] = useState<StockApprovedItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from local storage or use initial
    const storedReqs = localStorage.getItem('inventory_requests');
    if (storedReqs) {
      setRequests(JSON.parse(storedReqs));
    } else {
      setRequests(INITIAL_REQUESTS);
    }

    const storedData = localStorage.getItem('inventory_stock_data');
    if (storedData) {
      setStockData(JSON.parse(storedData));
    }

    const storedKitchenReqs = localStorage.getItem('inventory_kitchen_requests');
    if (storedKitchenReqs) {
      setKitchenRequests(JSON.parse(storedKitchenReqs));
    }

    const storedApproved = localStorage.getItem('inventory_stock_approved');
    if (storedApproved) {
      setStockApproved(JSON.parse(storedApproved));
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('inventory_requests', JSON.stringify(requests));
      localStorage.setItem('inventory_stock_data', JSON.stringify(stockData));
      localStorage.setItem('inventory_kitchen_requests', JSON.stringify(kitchenRequests));
      localStorage.setItem('inventory_stock_approved', JSON.stringify(stockApproved));
    }
  }, [requests, stockData, kitchenRequests, stockApproved, mounted]);

  const approveRequest = (reqId: string, approvedQty: number) => {
    let approvedItem: StockRequest | undefined;

    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        approvedItem = { ...r, status: 'APPROVED' };
        return approvedItem;
      }
      return r;
    }));

    if (approvedItem) {
      setStockData(prev => [
        {
          id: `SD-${Date.now()}`,
          itemName: approvedItem!.itemName,
          department: approvedItem!.department,
          category: approvedItem!.category || 'Uncategorized',
          approvedQty: approvedQty,
          unit: approvedItem!.unit,
          approvalDate: new Date().toISOString().split('T')[0],
          expiryDate: approvedItem!.expiryDate
        },
        ...prev
      ]);
    }
  };

  const approveKitchenRequest = (reqId: string, approvedQty: number) => {
    let approvedReq: KitchenRequest | undefined;

    setKitchenRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        approvedReq = { ...r, status: 'APPROVED' };
        return approvedReq;
      }
      return r;
    }));

    if (approvedReq) {
      // Pre-compute remaining qty without mutating stockData
      let expiryDateToPass: string | undefined;
      let totalStock = 0;
      
      const matchingStock = stockData.find(item => item.itemName.toLowerCase() === approvedReq!.product.toLowerCase());
      if (matchingStock) {
        expiryDateToPass = matchingStock.expiryDate;
        totalStock = matchingStock.approvedQty;
      }

      const totalPreviouslyIssued = stockApproved
        .filter(item => item.product.toLowerCase() === approvedReq!.product.toLowerCase())
        .reduce((sum, item) => sum + item.issuedQty, 0);

      const remainingQty = Math.max(0, totalStock - totalPreviouslyIssued - approvedQty);

      // Add to stockApproved
      setStockApproved(prev => [
        {
          id: `SA-${Date.now()}`,
          section: 'Kitchen Request',
          product: approvedReq!.product,
          issuedQty: approvedQty,
          availableStockQty: remainingQty,
          expiryDate: expiryDateToPass,
          approvalDate: new Date().toISOString().split('T')[0]
        },
        ...prev
      ]);
    }
  };

  if (!mounted) return null;

  return (
    <InventoryContext.Provider value={{ 
      requests, setRequests, 
      stockData, setStockData, 
      approveRequest,
      kitchenRequests, setKitchenRequests,
      stockApproved, setStockApproved,
      approveKitchenRequest
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
}
