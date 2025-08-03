const logger = require('../config/logger');

// Mock data for development when SQL Server is unavailable
const mockData = [
  { ID: 1, CONTRACTOR: 'ABC Mining Co', DATE: '2024-01-15', SHIFT: 'Day Shift', STOCK_ID: 'BB.D.5348', STOCK_STATUS: 'Active' },
  { ID: 2, CONTRACTOR: 'XYZ Contractors', DATE: '2024-01-15', SHIFT: 'Night Shift', STOCK_ID: 'CC.A.5348.01', STOCK_STATUS: 'Full' },
  { ID: 3, CONTRACTOR: 'DEF Industries', DATE: '2024-01-16', SHIFT: 'Morning Shift', STOCK_ID: 'DD.C.5348.02', STOCK_STATUS: 'Empty' },
  { ID: 4, CONTRACTOR: 'GHI Mining', DATE: '2024-01-16', SHIFT: 'Afternoon Shift', STOCK_ID: 'EE.B.7621', STOCK_STATUS: 'Processing' },
  { ID: 5, CONTRACTOR: 'JKL Corp', DATE: '2024-01-17', SHIFT: 'Day Shift', STOCK_ID: 'FF.A.9834.05', STOCK_STATUS: 'Maintenance' },
  { ID: 6, CONTRACTOR: 'MNO Services', DATE: '2024-01-17', SHIFT: 'Night Shift', STOCK_ID: 'GG.D.1122', STOCK_STATUS: 'Reserved' },
  { ID: 7, CONTRACTOR: 'PQR Limited', DATE: '2024-01-18', SHIFT: 'Morning Shift', STOCK_ID: 'HH.C.4455', STOCK_STATUS: 'Inactive' },
  { ID: 8, CONTRACTOR: 'STU Mining', DATE: '2024-01-18', SHIFT: 'Afternoon Shift', STOCK_ID: 'II.A.6677.03', STOCK_STATUS: 'Active' }
];

class MockTOSModel {
  constructor() {
    this.data = [...mockData];
    logger.info('Using mock TOS data for development');
  }

  async getAllRecords(limit = 100, offset = 0) {
    try {
      const total = this.data.length;
      const records = this.data.slice(offset, offset + limit);
      
      logger.info(`Mock: Fetched ${records.length} records (${offset}-${offset + limit} of ${total})`);
      
      return {
        records: records.map(r => ({ ...r, total_count: total })),
        total
      };
    } catch (error) {
      logger.error('Error in mock getAllRecords:', error);
      throw error;
    }
  }

  async searchRecords(query, filters = {}) {
    try {
      let results = [...this.data];
      
      // Apply search query
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        results = results.filter(record => {
          const stockId = record.STOCK_ID.toLowerCase();
          const contractor = record.CONTRACTOR.toLowerCase();
          
          return stockId.includes(searchTerm) || contractor.includes(searchTerm);
        });
        
        // Sort by relevance (exact match, prefix match, contains)
        results.sort((a, b) => {
          const aStockId = a.STOCK_ID.toLowerCase();
          const bStockId = b.STOCK_ID.toLowerCase();
          
          if (aStockId === searchTerm && bStockId !== searchTerm) return -1;
          if (bStockId === searchTerm && aStockId !== searchTerm) return 1;
          if (aStockId.startsWith(searchTerm) && !bStockId.startsWith(searchTerm)) return -1;
          if (bStockId.startsWith(searchTerm) && !aStockId.startsWith(searchTerm)) return 1;
          
          return aStockId.length - bStockId.length;
        });
      }
      
      // Apply contractor filter
      if (filters.contractor) {
        results = results.filter(record => record.CONTRACTOR === filters.contractor);
      }
      
      // Apply status filter
      if (filters.status) {
        results = results.filter(record => record.STOCK_STATUS === filters.status);
      }
      
      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit);
      
      logger.info(`Mock: Search "${query}" returned ${total} results`);
      
      return {
        records: paginatedResults.map(r => ({ ...r, total_count: total })),
        total
      };
    } catch (error) {
      logger.error('Error in mock searchRecords:', error);
      throw error;
    }
  }

  async updateRecord(id, field, value) {
    try {
      const recordIndex = this.data.findIndex(r => r.ID === id);
      
      if (recordIndex === -1) {
        throw new Error(`Record with ID ${id} not found`);
      }
      
      // Validate field
      const allowedFields = ['SHIFT', 'STOCK_STATUS'];
      if (!allowedFields.includes(field)) {
        throw new Error(`Invalid field: ${field}`);
      }
      
      this.data[recordIndex][field] = value;
      
      logger.info(`Mock: Updated record ${id}: ${field} = ${value}`);
      
      return this.data[recordIndex];
    } catch (error) {
      logger.error('Error in mock updateRecord:', error);
      throw error;
    }
  }

  async bulkUpdate(updates) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };
      
      for (const update of updates) {
        try {
          const { id, field, value } = update;
          await this.updateRecord(id, field, value);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: update.id,
            error: error.message
          });
        }
      }
      
      logger.info(`Mock: Bulk update completed: ${results.successful} successful, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      logger.error('Error in mock bulkUpdate:', error);
      throw error;
    }
  }

  async getContractors() {
    try {
      const contractors = [...new Set(this.data.map(r => r.CONTRACTOR))].sort();
      logger.info(`Mock: Fetched ${contractors.length} contractors`);
      return contractors;
    } catch (error) {
      logger.error('Error in mock getContractors:', error);
      throw error;
    }
  }

  async getStatuses() {
    try {
      const statuses = [...new Set(this.data.map(r => r.STOCK_STATUS))].sort();
      logger.info(`Mock: Fetched ${statuses.length} statuses`);
      return statuses;
    } catch (error) {
      logger.error('Error in mock getStatuses:', error);
      throw error;
    }
  }
}

module.exports = new MockTOSModel();