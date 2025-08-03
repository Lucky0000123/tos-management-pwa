import { useState, useEffect } from 'react';
import { Edit3, Save, X, RefreshCw, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TOSRecord, SHIFT_OPTIONS, STOCK_STATUS_OPTIONS } from '@/types/tos';
import { tosDatabase } from '@/lib/database';
import { tosApiClient } from '@/lib/api';
import { StatusIndicator } from './StatusIndicator';
import { EnhancedSearch } from './EnhancedSearch';
import { BulkOperations } from './BulkOperations';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function TOSManager() {
  const [records, setRecords] = useState<TOSRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TOSRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<TOSRecord | null>(null);
  const [editField, setEditField] = useState<'SHIFT' | 'STOCK_STATUS' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [showBulkView, setShowBulkView] = useState(false);
  const [filterContractor, setFilterContractor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const isOnline = useOnlineStatus();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, records, filterContractor, filterStatus]);

  useEffect(() => {
    updatePendingUpdatesCount();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      await tosDatabase.init();
      await tosDatabase.initializeWithSampleData();
      await loadRecords();
      toast.success('TOS Manager loaded successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast.error('Failed to load TOS data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      
      // Try API first if online, fallback to local database
      let data: TOSRecord[] = [];
      
      if (isOnline) {
        try {
          const apiResult = await tosApiClient.getAllTOSRecords(100, 0);
          data = apiResult.records;
          toast.success(`Loaded ${data.length} records from server`);
        } catch (apiError) {
          console.log('API load failed, using local database');
          data = await tosDatabase.getAllRecords();
          toast.info(`Using offline data: ${data.length} records`);
        }
      } else {
        data = await tosDatabase.getAllRecords();
        toast.info(`Offline mode: ${data.length} records`);
      }
      
      setRecords(data);
      setFilteredRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.STOCK_ID.toLowerCase().includes(query) ||
        record.CONTRACTOR.toLowerCase().includes(query)
      );
    }

    // Apply contractor filter
    if (filterContractor) {
      filtered = filtered.filter(record => record.CONTRACTOR === filterContractor);
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(record => record.STOCK_STATUS === filterStatus);
    }

    setFilteredRecords(filtered);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setFilteredRecords(records);
      return;
    }

    try {
      setLoading(true);
      
      // Try API first if online, fallback to local database
      let results: TOSRecord[] = [];
      if (isOnline) {
        try {
          const apiResults = await tosApiClient.searchTOS(query);
          results = apiResults.records;
        } catch (apiError) {
          console.log('API search failed, using local search');
          results = await tosDatabase.searchRecords(query);
        }
      } else {
        results = await tosDatabase.searchRecords(query);
      }
      
      setFilteredRecords(results);
      toast.success(`Found ${results.length} matching records`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = (record: TOSRecord) => {
    // Scroll to the record or highlight it
    const recordElement = document.getElementById(`record-${record.ID}`);
    if (recordElement) {
      recordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      recordElement.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        recordElement.classList.remove('ring-2', 'ring-blue-500');
      }, 2000);
    }
  };

  const handleEditStart = (record: TOSRecord, field: 'SHIFT' | 'STOCK_STATUS') => {
    setEditingRecord(record);
    setEditField(field);
    setEditValue(record[field]);
  };

  const handleEditCancel = () => {
    setEditingRecord(null);
    setEditField(null);
    setEditValue('');
  };

  const handleEditConfirm = () => {
    if (editValue !== editingRecord?.[editField!]) {
      setShowConfirmDialog(true);
    } else {
      handleEditCancel();
    }
  };

  const handleUpdateConfirm = async () => {
    if (!editingRecord || !editField) return;

    try {
      await tosDatabase.updateRecord(editingRecord.ID, editField, editValue);
      
      // Update local state
      const updatedRecords = records.map(record =>
        record.ID === editingRecord.ID
          ? { ...record, [editField]: editValue }
          : record
      );
      setRecords(updatedRecords);
      
      setShowConfirmDialog(false);
      handleEditCancel();
      await updatePendingUpdatesCount();
      
      const statusMsg = isOnline 
        ? 'Record updated successfully'
        : 'Record updated (will sync when online)';
      toast.success(statusMsg);
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update record');
    }
  };

  const updatePendingUpdatesCount = async () => {
    try {
      const pendingUpdates = await tosDatabase.getPendingUpdates();
      setPendingUpdatesCount(pendingUpdates.length);
    } catch (error) {
      console.error('Failed to get pending updates count:', error);
    }
  };

  const refreshData = async () => {
    await loadRecords();
    toast.success('Data refreshed');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && records.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading TOS Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              TOS Pile Status Manager
            </h1>
            <div className="flex items-center gap-3">
              <StatusIndicator />
              {pendingUpdatesCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  {pendingUpdatesCount} pending sync{pendingUpdatesCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced Search */}
          <EnhancedSearch
            records={records}
            onSearch={handleSearch}
            onSelectRecord={handleSelectRecord}
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex flex-1 gap-2">
              <Select value={filterContractor} onValueChange={setFilterContractor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by Contractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Contractors</SelectItem>
                  {Array.from(new Set(records.map(r => r.CONTRACTOR))).map(contractor => (
                    <SelectItem key={contractor} value={contractor}>
                      {contractor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {STOCK_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilterContractor('');
                  setFilterStatus('');
                  setSearchQuery('');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={showBulkView ? "default" : "outline"}
                onClick={() => setShowBulkView(!showBulkView)}
              >
                <Users className="h-4 w-4 mr-2" />
                {showBulkView ? 'Single View' : 'Bulk Operations'}
              </Button>

              <Button onClick={refreshData} variant="outline" size="default">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {showBulkView ? (
          <BulkOperations
            records={filteredRecords}
            selectedRecords={selectedRecords}
            onSelectionChange={setSelectedRecords}
            onRecordsUpdate={loadRecords}
            isOnline={isOnline}
          />
        ) : (
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 text-lg">
                    {searchQuery || filterContractor || filterStatus 
                      ? 'No matching records found' 
                      : 'No records available'}
                  </p>
                  {(searchQuery || filterContractor || filterStatus) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterContractor('');
                        setFilterStatus('');
                        setFilteredRecords(records);
                      }}
                      className="mt-4"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredRecords.map((record) => (
                <Card 
                  key={record.ID} 
                  id={`record-${record.ID}`}
                  className="shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-semibold text-blue-900">
                          {record.STOCK_ID}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          ID: {record.ID} • {record.CONTRACTOR}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {formatDate(record.DATE)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Shift */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Shift</p>
                        <p className="text-base font-semibold">{record.SHIFT}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(record, 'SHIFT')}
                        className="h-9 px-3"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Stock Status</p>
                        <Badge
                          variant={record.STOCK_STATUS === 'Active' ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {record.STOCK_STATUS}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(record, 'STOCK_STATUS')}
                        className="h-9 px-3"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Edit Dialog */}
        {editingRecord && editField && (
          <Dialog open={true} onOpenChange={handleEditCancel}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit {editField.replace('_', ' ')}</DialogTitle>
                <DialogDescription>
                  Update {editField.toLowerCase().replace('_', ' ')} for {editingRecord.STOCK_ID}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(editField === 'SHIFT' ? SHIFT_OPTIONS : STOCK_STATUS_OPTIONS).map((option) => (
                      <SelectItem key={option} value={option} className="py-3">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleEditCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleEditConfirm}>
                  <Save className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Update</DialogTitle>
              <DialogDescription>
                Are you sure you want to update {editField?.replace('_', ' ')} from "{editingRecord?.[editField!]}" to "{editValue}"?
                {!isOnline && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                    You are offline. This update will be synced when you reconnect.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateConfirm}>
                Confirm Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}