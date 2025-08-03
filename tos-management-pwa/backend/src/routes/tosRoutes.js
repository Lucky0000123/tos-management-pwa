const express = require('express');
const Joi = require('joi');
const tosModel = require('../models/tosModel');
const logger = require('../config/logger');

const router = express.Router();

// Validation schemas
const searchSchema = Joi.object({
  q: Joi.string().allow(''),
  contractor: Joi.string().allow(''),
  status: Joi.string().allow(''),
  dateStart: Joi.date(),
  dateEnd: Joi.date(),
  limit: Joi.number().integer().min(1).max(500).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

const updateSchema = Joi.object({
  field: Joi.string().valid('SHIFT', 'STOCK_STATUS').required(),
  value: Joi.string().required()
});

const bulkUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().required(),
      field: Joi.string().valid('SHIFT', 'STOCK_STATUS').required(),
      value: Joi.string().required()
    })
  ).min(1).max(100).required()
});

// GET /api/tos - Retrieve all TOS records with pagination
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await tosModel.getAllRecords(limit, offset);
    
    res.json({
      success: true,
      data: result.records,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total
      }
    });
  } catch (error) {
    logger.error('Error in GET /tos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve TOS records',
      message: error.message
    });
  }
});

// GET /api/tos/search - Enhanced search with partial STOCK_ID matching
router.get('/search', async (req, res) => {
  try {
    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: error.details
      });
    }

    const { q, contractor, status, dateStart, dateEnd, limit, offset } = value;
    
    const filters = {
      contractor: contractor || null,
      status: status || null,
      dateStart: dateStart || null,
      dateEnd: dateEnd || null,
      limit,
      offset
    };

    const result = await tosModel.searchRecords(q, filters);
    
    res.json({
      success: true,
      data: result.records,
      query: q,
      filters,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total
      }
    });
  } catch (error) {
    logger.error('Error in GET /tos/search:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// PUT /api/tos/:id - Update individual TOS record
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID parameter'
      });
    }

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: error.details
      });
    }

    const { field, value: newValue } = value;
    const updatedRecord = await tosModel.updateRecord(id, field, newValue);
    
    res.json({
      success: true,
      data: updatedRecord,
      message: `Successfully updated ${field} for record ${id}`
    });
  } catch (error) {
    logger.error('Error in PUT /tos/:id:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Update failed',
      message: error.message
    });
  }
});

// POST /api/tos/bulk-update - Bulk operations for multiple records
router.post('/bulk-update', async (req, res) => {
  try {
    const { error, value } = bulkUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bulk update data',
        details: error.details
      });
    }

    const { updates } = value;
    const result = await tosModel.bulkUpdate(updates);
    
    res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.successful} successful, ${result.failed} failed`
    });
  } catch (error) {
    logger.error('Error in POST /tos/bulk-update:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk update failed',
      message: error.message
    });
  }
});

// GET /api/tos/contractors - Get list of contractors
router.get('/contractors', async (req, res) => {
  try {
    const contractors = await tosModel.getContractors();
    
    res.json({
      success: true,
      data: contractors
    });
  } catch (error) {
    logger.error('Error in GET /tos/contractors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contractors',
      message: error.message
    });
  }
});

// GET /api/tos/statuses - Get list of statuses
router.get('/statuses', async (req, res) => {
  try {
    const statuses = await tosModel.getStatuses();
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    logger.error('Error in GET /tos/statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statuses',
      message: error.message
    });
  }
});

module.exports = router;