export interface TOSRecord {
  ID: number;
  CONTRACTOR: string;
  DATE: string;
  SHIFT: string;
  STOCK_ID: string;
  STOCK_STATUS: string;
}

export interface PendingUpdate {
  id: string;
  recordId: number;
  field: 'SHIFT' | 'STOCK_STATUS';
  oldValue: string;
  newValue: string;
  timestamp: number;
  synced: boolean;
}

export const SHIFT_OPTIONS = [
  'Day Shift',
  'Night Shift',
  'Morning Shift',
  'Afternoon Shift'
];

export const STOCK_STATUS_OPTIONS = [
  'Active',
  'Inactive',
  'Maintenance',
  'Full',
  'Empty',
  'Reserved',
  'Processing'
];