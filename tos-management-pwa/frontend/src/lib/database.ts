import { TOSRecord, PendingUpdate } from '@/types/tos';

const DB_NAME = 'TOSDatabase';
const DB_VERSION = 1;

// Enhanced sample data with more realistic STOCK_IDs for partial search testing
const SAMPLE_TOS_DATA: TOSRecord[] = [
  {
    ID: 1,
    CONTRACTOR: 'ABC Mining Co',
    DATE: '2025-01-15',
    SHIFT: 'Day Shift',
    STOCK_ID: 'BB.D.5348',
    STOCK_STATUS: 'Active'
  },
  {
    ID: 2,
    CONTRACTOR: 'XYZ Corp',
    DATE: '2025-01-15',
    SHIFT: 'Night Shift',
    STOCK_ID: 'CC.A.5348.01',
    STOCK_STATUS: 'Full'
  },
  {
    ID: 3,
    CONTRACTOR: 'Mining Solutions Ltd',
    DATE: '2025-01-16',
    SHIFT: 'Day Shift',
    STOCK_ID: 'AA.B.1234',
    STOCK_STATUS: 'Empty'
  },
  {
    ID: 4,
    CONTRACTOR: 'ABC Mining Co',
    DATE: '2025-01-16',
    SHIFT: 'Morning Shift',
    STOCK_ID: 'DD.C.5348.02',
    STOCK_STATUS: 'Maintenance'
  },
  {
    ID: 5,
    CONTRACTOR: 'Rock Extractors Inc',
    DATE: '2025-01-17',
    SHIFT: 'Afternoon Shift',
    STOCK_ID: 'EE.A.9876',
    STOCK_STATUS: 'Reserved'
  },
  {
    ID: 6,
    CONTRACTOR: 'Mining Solutions Ltd',
    DATE: '2025-01-17',
    SHIFT: 'Day Shift',
    STOCK_ID: 'FF.B.5348.03',
    STOCK_STATUS: 'Active'
  },
  {
    ID: 7,
    CONTRACTOR: 'XYZ Corp',
    DATE: '2025-01-18',
    SHIFT: 'Night Shift',
    STOCK_ID: 'GG.D.1234.01',
    STOCK_STATUS: 'Processing'
  },
  {
    ID: 8,
    CONTRACTOR: 'ABC Mining Co',
    DATE: '2025-01-18',
    SHIFT: 'Afternoon Shift',
    STOCK_ID: 'HH.A.5555',
    STOCK_STATUS: 'Active'
  }
];

class TOSDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create TOS records store
        if (!db.objectStoreNames.contains('tosRecords')) {
          const tosStore = db.createObjectStore('tosRecords', { keyPath: 'ID' });
          tosStore.createIndex('STOCK_ID', 'STOCK_ID', { unique: false });
          tosStore.createIndex('CONTRACTOR', 'CONTRACTOR', { unique: false });
        }

        // Create pending updates store
        if (!db.objectStoreNames.contains('pendingUpdates')) {
          db.createObjectStore('pendingUpdates', { keyPath: 'id' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async initializeWithSampleData(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['tosRecords', 'metadata'], 'readwrite');
    const tosStore = transaction.objectStore('tosRecords');
    const metaStore = transaction.objectStore('metadata');

    // Check if data already exists
    const existingData = await this.getAllRecords();
    if (existingData.length === 0) {
      // Add sample data
      for (const record of SAMPLE_TOS_DATA) {
        tosStore.add(record);
      }
      
      // Mark as initialized
      metaStore.put({ key: 'initialized', value: true, timestamp: Date.now() });
    }
  }

  async getAllRecords(): Promise<TOSRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tosRecords'], 'readonly');
      const store = transaction.objectStore('tosRecords');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchRecords(stockId: string): Promise<TOSRecord[]> {
    if (!this.db) await this.init();

    const allRecords = await this.getAllRecords();
    
    if (!stockId.trim()) {
      return allRecords;
    }

    const query = stockId.toLowerCase().trim();
    const results: { record: TOSRecord; priority: number }[] = [];

    allRecords.forEach(record => {
      const recordStockId = record.STOCK_ID.toLowerCase();
      const contractor = record.CONTRACTOR.toLowerCase();
      
      let priority = 0;
      
      // Level 1: Exact match (highest priority)
      if (recordStockId === query) {
        priority = 1;
      }
      // Level 2: Prefix match
      else if (recordStockId.startsWith(query)) {
        priority = 2;
      }
      // Level 3: Substring match (addresses "5348" finding "BB.D.5348")
      else if (recordStockId.includes(query)) {
        priority = 3;
      }
      // Level 4: Contractor match
      else if (contractor.includes(query)) {
        priority = 4;
      }
      // Level 5: Fuzzy match for simple typos
      else if (this.calculateSimpleDistance(recordStockId, query) <= 2 && query.length > 2) {
        priority = 5;
      }

      if (priority > 0) {
        results.push({ record, priority });
      }
    });

    // Sort by priority, then by length (shorter first), then alphabetically
    return results
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.record.STOCK_ID.length !== b.record.STOCK_ID.length) {
          return a.record.STOCK_ID.length - b.record.STOCK_ID.length;
        }
        return a.record.STOCK_ID.localeCompare(b.record.STOCK_ID);
      })
      .map(item => item.record);
  }

  private calculateSimpleDistance(str1: string, str2: string): number {
    if (Math.abs(str1.length - str2.length) > 2) return 99; // Early exit for very different lengths
    
    let distance = 0;
    const maxLength = Math.max(str1.length, str2.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (str1[i] !== str2[i]) distance++;
      if (distance > 2) return 99; // Early exit if too many differences
    }
    
    return distance;
  }

  async updateRecord(id: number, field: 'SHIFT' | 'STOCK_STATUS', newValue: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['tosRecords', 'pendingUpdates'], 'readwrite');
    const tosStore = transaction.objectStore('tosRecords');
    const pendingStore = transaction.objectStore('pendingUpdates');

    // Get current record
    const getRequest = tosStore.get(id);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          reject(new Error('Record not found'));
          return;
        }

        const oldValue = record[field];
        record[field] = newValue;

        // Update the record
        const updateRequest = tosStore.put(record);
        
        updateRequest.onsuccess = () => {
          // Add to pending updates for sync
          const pendingUpdate: PendingUpdate = {
            id: `${id}-${field}-${Date.now()}`,
            recordId: id,
            field,
            oldValue,
            newValue,
            timestamp: Date.now(),
            synced: false
          };

          const pendingRequest = pendingStore.add(pendingUpdate);
          pendingRequest.onsuccess = () => resolve();
          pendingRequest.onerror = () => reject(pendingRequest.error);
        };
        
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getPendingUpdates(): Promise<PendingUpdate[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingUpdates'], 'readonly');
      const store = transaction.objectStore('pendingUpdates');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingUpdate(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingUpdates'], 'readwrite');
      const store = transaction.objectStore('pendingUpdates');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const tosDatabase = new TOSDatabase();