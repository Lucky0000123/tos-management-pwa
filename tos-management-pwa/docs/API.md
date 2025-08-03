# API Documentation

This document provides detailed information about the TOS Management PWA API endpoints.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. This may be added in future versions.

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": [...],
  "error": null,
  "message": "Optional message"
}
```

## Endpoints

### Health Check

**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2024-01-20T10:30:00.000Z",
    "uptime": 3600,
    "database": "connected"
  }
}
```

### Get All TOS Records

**GET** `/tos`

Retrieve all TOS records with pagination support.

**Query Parameters:**
- `limit` (number): Number of records per page (default: 50, max: 100)
- `offset` (number): Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ID": 1,
      "CONTRACTOR": "ABC Mining Co",
      "DATE": "2024-01-15",
      "SHIFT": "Day Shift",
      "STOCK_ID": "BB.D.5348",
      "STOCK_STATUS": "Active",
      "total_count": 8
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Search TOS Records

**GET** `/tos/search`

Search TOS records with enhanced partial matching.

**Query Parameters:**
- `q` (string): Search query
- `contractor` (string): Filter by contractor name
- `status` (string): Filter by stock status
- `dateStart` (string): Start date filter (YYYY-MM-DD)
- `dateEnd` (string): End date filter (YYYY-MM-DD)
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset (default: 0)

**Search Algorithm:**
The search uses a 5-level relevance ranking:
1. **Exact match**: Complete match of search term
2. **Starts with**: Field starts with search term
3. **Word match**: Any word in field matches search term
4. **Contains**: Field contains search term anywhere
5. **Partial**: Partial match within words

**Example Requests:**
```bash
# Search for stock ID containing "5348"
GET /tos/search?q=5348

# Search with filters
GET /tos/search?q=mining&contractor=ABC&status=Active

# Search with date range
GET /tos/search?dateStart=2024-01-01&dateEnd=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ID": 1,
      "CONTRACTOR": "ABC Mining Co",
      "DATE": "2024-01-15",
      "SHIFT": "Day Shift",
      "STOCK_ID": "BB.D.5348",
      "STOCK_STATUS": "Active",
      "total_count": 3
    }
  ],
  "query": "5348",
  "filters": {
    "contractor": null,
    "status": null,
    "dateStart": null,
    "dateEnd": null,
    "limit": 50,
    "offset": 0
  },
  "pagination": {
    "total": 3,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Update TOS Record

**PUT** `/tos/:id`

Update a single TOS record.

**Path Parameters:**
- `id` (number): Record ID

**Request Body:**
```json
{
  "CONTRACTOR": "Updated Contractor Name",
  "STOCK_STATUS": "Updated Status",
  "SHIFT": "Updated Shift"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ID": 1,
    "CONTRACTOR": "Updated Contractor Name",
    "DATE": "2024-01-15",
    "SHIFT": "Updated Shift",
    "STOCK_ID": "BB.D.5348",
    "STOCK_STATUS": "Updated Status"
  }
}
```

### Bulk Update TOS Records

**POST** `/tos/bulk-update`

Update multiple TOS records in a single request.

**Request Body:**
```json
{
  "updates": [
    {
      "id": 1,
      "data": {
        "STOCK_STATUS": "Active"
      }
    },
    {
      "id": 2,
      "data": {
        "CONTRACTOR": "New Contractor"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0,
    "results": [
      {
        "id": 1,
        "success": true,
        "data": { "ID": 1, "STOCK_STATUS": "Active", ... }
      },
      {
        "id": 2,
        "success": true,
        "data": { "ID": 2, "CONTRACTOR": "New Contractor", ... }
      }
    ]
  }
}
```

### Get Contractors List

**GET** `/tos/contractors`

Retrieve a list of all unique contractors.

**Response:**
```json
{
  "success": true,
  "data": [
    "ABC Mining Co",
    "XYZ Contractors",
    "DEF Industries",
    "GHI Mining"
  ]
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "data": null
}
```

### Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

### Example Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Invalid search query parameter"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "TOS record with ID 999 not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

## CORS

The API is configured to accept requests from the frontend origin specified in the environment configuration.

## Database Fallback

If the SQL Server database is not available, the API automatically falls back to using mock data for development and testing purposes.