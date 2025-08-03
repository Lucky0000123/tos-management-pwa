const { dbConnection, sql } = require('../config/database');
const logger = require('../config/logger');
const mockTosModel = require('./mockTosModel');

class TOSModel {
  constructor() {
    this.tableName = 'TOS_STATUS';
  }

  async getAllRecords(limit = 100, offset = 0) {
    try {
      // Try SQL Server first, fallback to mock data
      if (dbConnection.isConnected) {
        const pool = await dbConnection.ensureConnection();
        const result = await pool.request()
          .input('limit', sql.Int, limit)
          .input('offset', sql.Int, offset)
          .query(`
            SELECT 
              ID, CONTRACTOR, DATE, SHIFT, STOCK_ID, STOCK_STATUS,
              COUNT(*) OVER() as total_count
            FROM ${this.tableName} 
            ORDER BY DATE DESC, ID DESC
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY
          `);

        return {
          records: result.recordset,
          total: result.recordset.length > 0 ? result.recordset[0].total_count : 0
        };
      } else {
        logger.info('Database not connected, using mock data');
        return await mockTosModel.getAllRecords(limit, offset);
      }
    } catch (error) {
      logger.warn('SQL Server query failed, falling back to mock data:', error.message);
      return await mockTosModel.getAllRecords(limit, offset);
    }
  }

  async searchRecords(query, filters = {}) {
    try {
      // Try SQL Server first, fallback to mock data
      if (dbConnection.isConnected) {
        const pool = await dbConnection.ensureConnection();
        const request = pool.request();
        
        let whereClause = '1=1';
        let orderClause = 'ORDER BY DATE DESC, ID DESC';

        // Add search query if provided
        if (query && query.trim()) {
          whereClause += ` AND (
            STOCK_ID LIKE @searchQuery OR
            STOCK_ID LIKE @searchQueryPrefix OR
            STOCK_ID LIKE @searchQuerySuffix OR
            CONTRACTOR LIKE @searchQuery
          )`;
          request.input('searchQuery', sql.NVarChar, `%${query}%`);
          request.input('searchQueryPrefix', sql.NVarChar, `${query}%`);
          request.input('searchQuerySuffix', sql.NVarChar, `%${query}`);
          
          // Custom ordering for search relevance
          orderClause = `
            ORDER BY 
              CASE 
                WHEN STOCK_ID = @exactMatch THEN 1
                WHEN STOCK_ID LIKE @searchQueryPrefix THEN 2
                WHEN STOCK_ID LIKE @searchQuery THEN 3
                WHEN CONTRACTOR LIKE @searchQuery THEN 4
                ELSE 5
              END,
              LEN(STOCK_ID),
              STOCK_ID
          `;
          request.input('exactMatch', sql.NVarChar, query);
        }

        // Add contractor filter
        if (filters.contractor) {
          whereClause += ' AND CONTRACTOR = @contractor';
          request.input('contractor', sql.NVarChar, filters.contractor);
        }

        // Add status filter
        if (filters.status) {
          whereClause += ' AND STOCK_STATUS = @status';
          request.input('status', sql.NVarChar, filters.status);
        }

        // Add date range filter
        if (filters.dateStart && filters.dateEnd) {
          whereClause += ' AND DATE BETWEEN @dateStart AND @dateEnd';
          request.input('dateStart', sql.Date, filters.dateStart);
          request.input('dateEnd', sql.Date, filters.dateEnd);
        }

        // Add pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        request.input('limit', sql.Int, limit);
        request.input('offset', sql.Int, offset);

        const sqlQuery = `
          SELECT 
            ID, CONTRACTOR, DATE, SHIFT, STOCK_ID, STOCK_STATUS,
            COUNT(*) OVER() as total_count
          FROM ${this.tableName} 
          WHERE ${whereClause}
          ${orderClause}
          OFFSET @offset ROWS 
          FETCH NEXT @limit ROWS ONLY
        `;

        logger.info('Executing search query:', { query, filters });
        const result = await request.query(sqlQuery);

        return {
          records: result.recordset,
          total: result.recordset.length > 0 ? result.recordset[0].total_count : 0
        };
      } else {
        logger.info('Database not connected, using mock data for search');
        return await mockTosModel.searchRecords(query, filters);
      }
    } catch (error) {
      logger.warn('SQL Server search failed, falling back to mock data:', error.message);
      return await mockTosModel.searchRecords(query, filters);
    }
  }

  async updateRecord(id, field, value) {
    try {
      const pool = await dbConnection.ensureConnection();
      
      // Validate field to prevent SQL injection
      const allowedFields = ['SHIFT', 'STOCK_STATUS'];
      if (!allowedFields.includes(field)) {
        throw new Error(`Invalid field: ${field}`);
      }

      const result = await pool.request()
        .input('id', sql.Int, id)
        .input('value', sql.NVarChar, value)
        .query(`
          UPDATE ${this.tableName} 
          SET ${field} = @value 
          WHERE ID = @id;
          
          SELECT ID, CONTRACTOR, DATE, SHIFT, STOCK_ID, STOCK_STATUS
          FROM ${this.tableName}
          WHERE ID = @id;
        `);

      if (result.recordset.length === 0) {
        throw new Error(`Record with ID ${id} not found`);
      }

      logger.info(`Updated TOS record ${id}: ${field} = ${value}`);
      return result.recordset[0];
    } catch (error) {
      logger.error('Error updating TOS record:', error);
      throw error;
    }
  }

  async bulkUpdate(updates) {
    try {
      const pool = await dbConnection.ensureConnection();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const update of updates) {
        try {
          const { id, field, value } = update;
          
          // Validate field
          const allowedFields = ['SHIFT', 'STOCK_STATUS'];
          if (!allowedFields.includes(field)) {
            throw new Error(`Invalid field: ${field}`);
          }

          await transaction.request()
            .input('id', sql.Int, id)
            .input('value', sql.NVarChar, value)
            .query(`UPDATE ${this.tableName} SET ${field} = @value WHERE ID = @id`);
          
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: update.id,
            error: error.message
          });
          logger.error(`Bulk update failed for ID ${update.id}:`, error);
        }
      }

      await transaction.commit();
      logger.info(`Bulk update completed: ${results.successful} successful, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  async getContractors() {
    try {
      const pool = await dbConnection.ensureConnection();
      const result = await pool.request()
        .query(`SELECT DISTINCT CONTRACTOR FROM ${this.tableName} ORDER BY CONTRACTOR`);
      
      return result.recordset.map(row => row.CONTRACTOR);
    } catch (error) {
      logger.error('Error fetching contractors:', error);
      throw error;
    }
  }

  async getStatuses() {
    try {
      const pool = await dbConnection.ensureConnection();
      const result = await pool.request()
        .query(`SELECT DISTINCT STOCK_STATUS FROM ${this.tableName} ORDER BY STOCK_STATUS`);
      
      return result.recordset.map(row => row.STOCK_STATUS);
    } catch (error) {
      logger.error('Error fetching statuses:', error);
      throw error;
    }
  }
}

module.exports = new TOSModel();