'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, X, Clock, Camera, FileUp, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

import { useInventory, StockRequest, KitchenRequest } from '../context';
export default function StockRequestsPage() {
  const { requests, setRequests, approveRequest, kitchenRequests, approveKitchenRequest } = useInventory();
  
  // New Request Form State
  const [newReqOpen, setNewReqOpen] = useState(false);
  const [reqMethod, setReqMethod] = useState<'camera' | 'upload' | 'manual'>('manual');
  
  // Approve/Reject State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<StockRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [approvedQty, setApprovedQty] = useState('');

  // Kitchen Request Review State
  const [kitchenReviewOpen, setKitchenReviewOpen] = useState(false);
  const [selectedKitchenReq, setSelectedKitchenReq] = useState<KitchenRequest | null>(null);
  const [kitchenReviewAction, setKitchenReviewAction] = useState<'approve' | 'reject'>('approve');
  const [kitchenApprovedQty, setKitchenApprovedQty] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newUrgency, setNewUrgency] = useState<'Normal' | 'Urgent'>('Normal');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newNotes, setNewNotes] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'APPROVED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'ISSUED': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Issued</Badge>;
      case 'RECEIVED': return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Received</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleReviewSubmit = () => {
    if (reviewAction === 'reject' && !reviewNotes) {
      toast.error('Rejection reason is mandatory.');
      return;
    }
    
    if (reviewAction === 'approve') {
      approveRequest(selectedReq!.id, parseFloat(approvedQty || selectedReq!.requestedQty.toString()));
    } else {
      setRequests(prev => prev.map(r => {
        if (r.id === selectedReq?.id) {
          return {
            ...r,
            status: 'REJECTED',
            rejectionReason: reviewNotes,
          };
        }
        return r;
      }));
    }
    
    toast.success(`Request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully.`);
    setReviewOpen(false);
    setSelectedReq(null);
    setReviewNotes('');
    setApprovedQty('');
  };

  const handleKitchenReviewSubmit = () => {
    if (kitchenReviewAction === 'approve') {
      approveKitchenRequest(selectedKitchenReq!.id, parseFloat(kitchenApprovedQty || selectedKitchenReq!.quantity.toString()));
      toast.success('Kitchen request approved and stock deducted!');
    } else {
      toast.success('Kitchen request rejected.');
    }
    setKitchenReviewOpen(false);
    setSelectedKitchenReq(null);
    setKitchenApprovedQty('');
  };

  const handleNewRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newQty) {
      toast.error('Item name and quantity are required.');
      return;
    }

    const newReq: StockRequest = {
      id: `REQ-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      itemName: newItemName,
      department: 'Main Kitchen', // Mocked user department
      requestedQty: parseFloat(newQty),
      unit: newUnit,
      urgency: newUrgency,
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0],
      notes: newNotes
    };

    setRequests(prev => [newReq, ...prev]);

    toast.success('Stock request raised successfully.');
    setNewReqOpen(false);
    
    // Reset form
    setNewItemName('');
    setNewQty('');
    setNewNotes('');
    setNewUrgency('Normal');
    setNewUnit('kg');
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Requests</h1>
            <p className="text-gray-500">Manage and approve departmental stock requests.</p>
          </div>

          <Dialog open={newReqOpen} onOpenChange={setNewReqOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Raise Stock Request</DialogTitle>
                <DialogDescription>Submit a new request for inventory items.</DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-4 mb-4">
                <Button variant={reqMethod === 'camera' ? 'default' : 'outline'} className={reqMethod === 'camera' ? 'bg-orange-600' : ''} onClick={() => setReqMethod('camera')}>
                  <Camera className="w-4 h-4 mr-2" /> Scan Bill
                </Button>
                <Button variant={reqMethod === 'upload' ? 'default' : 'outline'} className={reqMethod === 'upload' ? 'bg-orange-600' : ''} onClick={() => setReqMethod('upload')}>
                  <FileUp className="w-4 h-4 mr-2" /> Upload Bill
                </Button>
                <Button variant={reqMethod === 'manual' ? 'default' : 'outline'} className={reqMethod === 'manual' ? 'bg-orange-600' : ''} onClick={() => setReqMethod('manual')}>
                  <Keyboard className="w-4 h-4 mr-2" /> Enter Manually
                </Button>
              </div>

              {reqMethod !== 'manual' && (
                <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center mb-6">
                  <p className="text-gray-500 text-sm">
                    {reqMethod === 'camera' ? 'Camera will open on mobile devices. (Mocked on desktop)' : 'Drag and drop or click to upload a bill file.'}
                  </p>
                </div>
              )}

              <form onSubmit={handleNewRequestSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g. Rice" required value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Urgency <span className="text-red-500">*</span></Label>
                    <Select value={newUrgency} onValueChange={(val: 'Normal' | 'Urgent') => setNewUrgency(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity Required <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="0" min="0" step="0.01" required value={newQty} onChange={(e) => setNewQty(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit <span className="text-red-500">*</span></Label>
                    <Select value={newUnit} onValueChange={(val) => setNewUnit(val)}>
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Optional details for the Store Manager..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setNewReqOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-orange-600">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3 mb-6">
            <TabsTrigger value="pending">Purchase Approvals</TabsTrigger>
            <TabsTrigger value="kitchen_requests">Kitchen Requests</TabsTrigger>
            <TabsTrigger value="history">Request History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Request ID</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Item & Qty</th>
                        <th className="px-6 py-4 font-semibold">Urgency</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {requests.filter(r => r.status === 'PENDING').map(req => (
                        <tr key={req.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-medium">{req.id}</td>
                          <td className="px-6 py-4">{req.department}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{req.itemName}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{req.requestedQty} {req.unit}</div>
                          </td>
                          <td className="px-6 py-4">
                            {req.urgency === 'Urgent' ? <span className="text-red-600 font-semibold text-xs">URGENT</span> : <span className="text-gray-500 text-xs">Normal</span>}
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => {
                              setSelectedReq(req);
                              setReviewAction('approve');
                              setApprovedQty(req.requestedQty.toString());
                              setReviewOpen(true);
                            }}>
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {requests.filter(r => r.status === 'PENDING').length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No pending requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kitchen_requests">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Request ID</th>
                        <th className="px-6 py-4 font-semibold">Category</th>
                        <th className="px-6 py-4 font-semibold">Product & Qty</th>
                        <th className="px-6 py-4 font-semibold">Details</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {kitchenRequests.filter(r => r.status === 'PENDING').map(req => (
                        <tr key={req.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-medium">{req.id}</td>
                          <td className="px-6 py-4">{req.category}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{req.product}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{req.quantity} {req.unit}</div>
                          </td>
                          <td className="px-6 py-4 max-w-[200px] truncate text-gray-500">{req.details || '-'}</td>
                          <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => {
                              setSelectedKitchenReq(req);
                              setKitchenReviewAction('approve');
                              setKitchenApprovedQty(req.quantity.toString());
                              setKitchenReviewOpen(true);
                            }}>
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {kitchenRequests.filter(r => r.status === 'PENDING').length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No pending kitchen requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Request ID</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Item & Qty</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {requests.filter(r => r.status !== 'PENDING').map(req => (
                        <tr key={req.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-gray-500">{req.date}</td>
                          <td className="px-6 py-4 font-medium">{req.id}</td>
                          <td className="px-6 py-4">{req.department}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{req.itemName}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{req.requestedQty} {req.unit}</div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(req.status)}
                            {req.status === 'REJECTED' && <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={req.rejectionReason}>{req.rejectionReason}</p>}
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

        {/* Review Dialog */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Stock Request</DialogTitle>
              <DialogDescription>Approve or reject this request from {selectedReq?.department}.</DialogDescription>
            </DialogHeader>

            {selectedReq && (
              <div className="space-y-6 my-4">
                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedReq.itemName}</h4>
                    <p className="text-sm text-gray-500">Requested: {selectedReq.requestedQty} {selectedReq.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      45 {selectedReq.unit} Available
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant={reviewAction === 'approve' ? 'default' : 'outline'} className={`flex-1 ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-600'}`} onClick={() => setReviewAction('approve')}>
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button type="button" variant={reviewAction === 'reject' ? 'default' : 'outline'} className={`flex-1 ${reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'text-gray-600'}`} onClick={() => setReviewAction('reject')}>
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>

                {reviewAction === 'approve' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Approved Quantity (Allow Partial Approval)</Label>
                    <Input type="number" value={approvedQty} onChange={(e) => setApprovedQty(e.target.value)} max={selectedReq.requestedQty} />
                  </div>
                )}

                {reviewAction === 'reject' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Rejection Reason <span className="text-red-500">*</span></Label>
                    <Textarea placeholder="Mandatory reason for rejection..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} required />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
              <Button onClick={handleReviewSubmit} className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Kitchen Review Dialog */}
        <Dialog open={kitchenReviewOpen} onOpenChange={setKitchenReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Kitchen Request</DialogTitle>
              <DialogDescription>Approve or reject this stock request from the kitchen.</DialogDescription>
            </DialogHeader>

            {selectedKitchenReq && (
              <div className="space-y-6 my-4">
                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedKitchenReq.product}</h4>
                    <p className="text-sm text-gray-500">Requested: {selectedKitchenReq.quantity} {selectedKitchenReq.unit}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant={kitchenReviewAction === 'approve' ? 'default' : 'outline'} className={`flex-1 ${kitchenReviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-600'}`} onClick={() => setKitchenReviewAction('approve')}>
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button type="button" variant={kitchenReviewAction === 'reject' ? 'default' : 'outline'} className={`flex-1 ${kitchenReviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'text-gray-600'}`} onClick={() => setKitchenReviewAction('reject')}>
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>

                {kitchenReviewAction === 'approve' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Approved Quantity to Deduct from Main Stock</Label>
                    <Input type="number" value={kitchenApprovedQty} onChange={(e) => setKitchenApprovedQty(e.target.value)} max={selectedKitchenReq.quantity} />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setKitchenReviewOpen(false)}>Cancel</Button>
              <Button onClick={handleKitchenReviewSubmit} className={kitchenReviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                Confirm {kitchenReviewAction === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
