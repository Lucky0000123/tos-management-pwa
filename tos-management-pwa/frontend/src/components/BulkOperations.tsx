import { useState } from 'react';
import { CheckSquare, Square, Edit3, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { TOSRecord, SHIFT_OPTIONS, STOCK_STATUS_OPTIONS } from '@/types/tos';
import { tosDatabase } from '@/lib/database';

interface BulkOperationsProps {
  records: TOSRecord[];
  selectedRecords: Set<number>;
  onSelectionChange: (selectedRecords: Set<number>) => void;
  onRecordsUpdate: () => void;
  isOnline: boolean;
}

export function BulkOperations({ 
  records, 
  selectedRecords, 
  onSelectionChange, 
  onRecordsUpdate,
  isOnline 
}: BulkOperationsProps) {
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkField, setBulkField] = useState<'SHIFT' | 'STOCK_STATUS' | ''>('');
  const [bulkValue, setBulkValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(records.map(r => r.ID)));
    }
  };

  const toggleRecord = (recordId: number) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId);
    } else {
      newSelection.add(recordId);
    }
    onSelectionChange(newSelection);
  };

  const handleBulkUpdate = () => {
    if (selectedRecords.size === 0) {
      toast.error('Please select records to update');
      return;
    }
    setShowBulkDialog(true);
  };

  const executeBulkUpdate = async () => {
    if (!bulkField || !bulkValue) {
      toast.error('Please select field and value');
      return;
    }

    setIsProcessing(true);
    
    try {
      const promises = Array.from(selectedRecords).map(recordId => 
        tosDatabase.updateRecord(recordId, bulkField as 'SHIFT' | 'STOCK_STATUS', bulkValue)
      );
      
      await Promise.all(promises);
      
      setShowBulkDialog(false);
      setBulkField('');
      setBulkValue('');
      onSelectionChange(new Set());
      onRecordsUpdate();
      
      const statusMsg = isOnline 
        ? `Successfully updated ${selectedRecords.size} records`
        : `Updated ${selectedRecords.size} records (will sync when online)`;
      toast.success(statusMsg);
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update records');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSelectedRecords = () => {
    const selectedData = records.filter(r => selectedRecords.has(r.ID));
    const csv = convertToCSV(selectedData);
    downloadCSV(csv, 'tos-records.csv');
    toast.success(`Exported ${selectedData.length} records`);
  };

  const convertToCSV = (data: TOSRecord[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(record => 
      Object.values(record).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (records.length === 0) return null;

  return (
    <>
      {/* Selection Bar */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedRecords.size === records.length ? (
                  <CheckSquare className="h-5 w-5" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                {selectedRecords.size === 0 
                  ? 'Select All' 
                  : selectedRecords.size === records.length 
                    ? 'Deselect All'
                    : `Select All (${selectedRecords.size} selected)`
                }
              </Button>
              
              {selectedRecords.size > 0 && (
                <Badge variant="secondary">
                  {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
                </Badge>
              )}
            </div>

            {selectedRecords.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkUpdate}
                  className="flex items-center gap-2"
                  disabled={isProcessing}
                >
                  <Edit3 className="h-4 w-4" />
                  Bulk Update
                </Button>
                
                <Button
                  variant="outline"
                  onClick={exportSelectedRecords}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => onSelectionChange(new Set())}
                  className="flex items-center gap-2"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Record Selection */}
      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.ID} className={`cursor-pointer transition-all ${
            selectedRecords.has(record.ID) 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-md'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => toggleRecord(record.ID)}
                  className="flex-shrink-0 p-2"
                >
                  {selectedRecords.has(record.ID) ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-blue-900">{record.STOCK_ID}</h3>
                      <p className="text-sm text-gray-600">{record.CONTRACTOR}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{record.SHIFT}</Badge>
                      <Badge
                        variant={record.STOCK_STATUS === 'Active' ? 'default' : 'secondary'}
                      >
                        {record.STOCK_STATUS}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Records</DialogTitle>
            <DialogDescription>
              Update {selectedRecords.size} selected record{selectedRecords.size !== 1 ? 's' : ''}
              {!isOnline && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  You are offline. Updates will be synced when you reconnect.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Field to Update</label>
              <Select value={bulkField} onValueChange={setBulkField}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIFT">Shift</SelectItem>
                  <SelectItem value="STOCK_STATUS">Stock Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkField && (
              <div>
                <label className="text-sm font-medium mb-2 block">New Value</label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select new value" />
                  </SelectTrigger>
                  <SelectContent>
                    {(bulkField === 'SHIFT' ? SHIFT_OPTIONS : STOCK_STATUS_OPTIONS).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkUpdate}
              disabled={!bulkField || !bulkValue || isProcessing}
            >
              {isProcessing ? 'Updating...' : `Update ${selectedRecords.size} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}