require('dotenv').config();

const { dbConnection, sql } = require('../config/database');
const logger = require('../config/logger');

async function initializeDatabase() {
  try {
    logger.info('Starting database initialization...');
    
    const pool = await dbConnection.connect();
    
    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as table_exists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TOS_STATUS'
    `);
    
    if (tableCheck.recordset[0].table_exists === 0) {
      logger.info('Creating TOS_STATUS table...');
      
      // Create table
      await pool.request().query(`
        CREATE TABLE TOS_STATUS (
          ID INT IDENTITY(1,1) PRIMARY KEY,
          CONTRACTOR NVARCHAR(100) NOT NULL,
          DATE DATE NOT NULL,
          SHIFT NVARCHAR(50) NOT NULL,
          STOCK_ID NVARCHAR(100) NOT NULL UNIQUE,
          STOCK_STATUS NVARCHAR(50) NOT NULL,
          CREATED_AT DATETIME2 DEFAULT GETDATE(),
          UPDATED_AT DATETIME2 DEFAULT GETDATE()
        )
      `);
      
      // Create indexes for performance
      await pool.request().query(`
        CREATE INDEX IX_TOS_STATUS_STOCK_ID ON TOS_STATUS(STOCK_ID);
        CREATE INDEX IX_TOS_STATUS_CONTRACTOR ON TOS_STATUS(CONTRACTOR);
        CREATE INDEX IX_TOS_STATUS_DATE ON TOS_STATUS(DATE);
        CREATE INDEX IX_TOS_STATUS_STATUS ON TOS_STATUS(STOCK_STATUS);
      `);
      
      logger.info('TOS_STATUS table created successfully');
    }
    
    // Check if sample data exists
    const dataCheck = await pool.request().query('SELECT COUNT(*) as record_count FROM TOS_STATUS');
    
    if (dataCheck.recordset[0].record_count === 0) {
      logger.info('Inserting sample data...');
      
      const sampleData = [
        { contractor: 'ABC Mining Co', date: '2024-01-15', shift: 'Day Shift', stock_id: 'BB.D.5348', status: 'Active' },
        { contractor: 'XYZ Contractors', date: '2024-01-15', shift: 'Night Shift', stock_id: 'CC.A.5348.01', status: 'Full' },
        { contractor: 'DEF Industries', date: '2024-01-16', shift: 'Morning Shift', stock_id: 'DD.C.5348.02', status: 'Empty' },
        { contractor: 'GHI Mining', date: '2024-01-16', shift: 'Afternoon Shift', stock_id: 'EE.B.7621', status: 'Processing' },
        { contractor: 'JKL Corp', date: '2024-01-17', shift: 'Day Shift', stock_id: 'FF.A.9834.05', status: 'Maintenance' },
        { contractor: 'MNO Services', date: '2024-01-17', shift: 'Night Shift', stock_id: 'GG.D.1122', status: 'Reserved' },
        { contractor: 'PQR Limited', date: '2024-01-18', shift: 'Morning Shift', stock_id: 'HH.C.4455', status: 'Inactive' },
        { contractor: 'STU Mining', date: '2024-01-18', shift: 'Afternoon Shift', stock_id: 'II.A.6677.03', status: 'Active' }
      ];
      
      for (const record of sampleData) {
        await pool.request()
          .input('contractor', sql.NVarChar, record.contractor)
          .input('date', sql.Date, record.date)
          .input('shift', sql.NVarChar, record.shift)
          .input('stock_id', sql.NVarChar, record.stock_id)
          .input('status', sql.NVarChar, record.status)
          .query(`
            INSERT INTO TOS_STATUS (CONTRACTOR, DATE, SHIFT, STOCK_ID, STOCK_STATUS)
            VALUES (@contractor, @date, @shift, @stock_id, @status)
          `);
      }
      
      logger.info(`Inserted ${sampleData.length} sample records`);
    }
    
    logger.info('Database initialization completed successfully');
    await dbConnection.disconnect();
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;