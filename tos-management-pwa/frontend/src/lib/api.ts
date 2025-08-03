import { TOSRecord, PendingUpdate } from '@/types/tos';

// Backend API configuration
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000
};

export class TOSApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  // Enhanced search with partial matching support
  async searchTOS(query: string, filters?: {
    contractor?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<{ records: TOSRecord[]; total: number; cached: boolean }> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(filters?.contractor && { contractor: filters.contractor }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.limit && { limit: filters.limit.toString() }),
        ...(filters?.offset && { offset: filters.offset.toString() })
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos/search?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      return {
        records: result.data,
        total: result.pagination.total,
        cached: false
      };
    } catch (error) {
      console.log('API search failed, falling back to offline mode:', error);
      throw error;
    }
  }

  // Update single TOS record
  async updateTOSRecord(id: number, field: 'SHIFT' | 'STOCK_STATUS', value: string): Promise<TOSRecord> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field,
          value
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      return result.data;
    } catch (error) {
      console.log('API update failed, will store offline:', error);
      throw error;
    }
  }

  // Bulk update multiple records
  async bulkUpdateTOS(updates: Array<{ id: number; field: string; value: string }>): Promise<{ successful: number; failed: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bulk update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Bulk update failed');
      }

      return result.data;
    } catch (error) {
      console.log('API bulk update failed, will store offline:', error);
      throw error;
    }
  }

  // Sync offline updates with server
  async syncOfflineUpdates(pendingUpdates: PendingUpdate[]): Promise<{
    successful: number;
    conflicts: Array<{ update: PendingUpdate; serverData: TOSRecord }>;
    failed: Array<{ update: PendingUpdate; error: string }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ offlineUpdates: pendingUpdates })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // Get all TOS records with pagination
  async getAllTOSRecords(limit = 50, offset = 0): Promise<{ records: TOSRecord[]; total: number; hasMore: boolean }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch records');
      }

      return {
        records: result.data,
        total: result.pagination.total,
        hasMore: result.pagination.hasMore
      };
    } catch (error) {
      console.log('API fetch failed, falling back to offline mode:', error);
      throw error;
    }
  }

  // Get contractors list
  async getContractors(): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos/contractors`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch contractors: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch contractors');
      }

      return result.data;
    } catch (error) {
      console.log('API fetch contractors failed:', error);
      throw error;
    }
  }

  // Get statuses list
  async getStatuses(): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${this.baseUrl}/tos/statuses`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch statuses: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch statuses');
      }

      return result.data;
    } catch (error) {
      console.log('API fetch statuses failed:', error);
      throw error;
    }
  }

  // Check server connectivity
  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get SQL Server status (for backend monitoring)
  async getSQLServerStatus(): Promise<{ connected: boolean; lastSync: string; server?: string; database?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get database status');
      }

      const result = await response.json();
      
      return {
        connected: result.database?.connected || false,
        lastSync: new Date().toISOString(),
        server: result.database?.server,
        database: result.database?.database
      };
    } catch (error) {
      return { connected: false, lastSync: 'Unknown' };
    }
  }
}

// Export singleton instance
export const tosApiClient = new TOSApiClient();