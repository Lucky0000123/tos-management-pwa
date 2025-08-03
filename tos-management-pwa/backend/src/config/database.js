const sql = require('mssql');
const logger = require('./logger');

const config = {
  server: process.env.DB_SERVER || '10.211.10.1',
  database: process.env.DB_NAME || 'WBN_DATABASE',
  user: process.env.DB_USER || 'headofnickel',
  password: process.env.DB_PASSWORD || 'Dataisbeautifulrev001!',
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // For development
    enableArithAbort: true,
    connectTimeout: 60000,
    requestTimeout: 30000,
  },
  connectionTimeout: 60000,
  requestTimeout: 30000,
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000;
  }

  async connect() {
    try {
      logger.info('Attempting to connect to SQL Server...');
      this.pool = await sql.connect(config);
      this.isConnected = true;
      this.retryCount = 0;
      logger.info('Successfully connected to SQL Server');
      return this.pool;
    } catch (error) {
      logger.error('Failed to connect to SQL Server:', error);
      this.isConnected = false;
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying connection in ${this.retryDelay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        logger.error('Max retry attempts reached. Unable to connect to database.');
        throw error;
      }
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      this.isConnected = false;
      logger.info('Disconnected from SQL Server');
    }
  }

  getPool() {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool;
  }

  async testConnection() {
    try {
      const pool = this.getPool();
      const result = await pool.request().query('SELECT 1 as test');
      return result.recordset.length > 0;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.getPool();
  }
}

// Export singleton instance
const dbConnection = new DatabaseConnection();

module.exports = {
  dbConnection,
  sql,
  config
};