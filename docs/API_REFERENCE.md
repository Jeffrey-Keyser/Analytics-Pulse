# Analytics-Pulse API Reference

Complete REST API documentation for Analytics-Pulse.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Projects](#projects)
  - [API Keys](#api-keys)
  - [Event Tracking](#event-tracking)
  - [Analytics](#analytics)
  - [Events](#events)
  - [Campaigns](#campaigns)
  - [Goals](#goals)
  - [Email Preferences](#email-preferences)
  - [Export](#export)
  - [Aggregation](#aggregation)
  - [Performance](#performance)
  - [Partitions](#partitions)

## Authentication

Analytics-Pulse uses two authentication methods:

### 1. Bearer Token (Management APIs)

Used for dashboard and management operations.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.yourdomain.com/api/v1/projects
```

### 2. API Key (Tracking APIs)

Used for event tracking from websites/apps.

**Header-based** (recommended):
```bash
curl -H "X-API-Key: ap_your_api_key_here" \
  -X POST https://api.yourdomain.com/api/v1/track/event \
  -d '{"event_type":"pageview","url":"https://example.com"}'
```

**Query parameter** (fallback):
```bash
curl -X POST "https://api.yourdomain.com/api/v1/track/event?apiKey=ap_your_api_key_here" \
  -d '{"event_type":"pageview","url":"https://example.com"}'
```

## Base URL

```
Production: https://api.yourdomain.com
Development: http://localhost:3001
```

All endpoints are versioned:
```
/api/v1/*
```

## Rate Limiting

| API Type | Limit | Window |
|----------|-------|--------|
| Tracking APIs | 10,000 requests | per hour per API key |
| Management APIs | Standard limits | per user |
| Batch Tracking | 100 events | per request |

**Rate limit headers**:
```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9987
X-RateLimit-Reset: 1640995200
```

**Rate limit exceeded response**:
```json
{
  "error": "Rate limit exceeded",
  "status": 429,
  "retry_after": 3600
}
```

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "status": 400,
  "details": {
    "field": "validation error details"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Endpoints

## Projects

Manage analytics projects for your websites and applications.

### List Projects

```
GET /api/v1/projects
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `search` | string | Search by name or domain |
| `is_active` | boolean | Filter by active status |

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.yourdomain.com/api/v1/projects?page=1&limit=20&is_active=true"
```

**Example Response**:
```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Website",
      "domain": "example.com",
      "description": "Main website analytics",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Create Project

```
POST /api/v1/projects
```

**Authentication**: Bearer token required

**Request Body**:
```json
{
  "name": "My Website",
  "domain": "example.com",
  "description": "Main website analytics (optional)"
}
```

**Validation**:
- `name`: Required, 1-100 characters
- `domain`: Required, valid domain format
- `description`: Optional, max 500 characters

**Example Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Website",
  "domain": "example.com",
  "description": "Main website analytics",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Get Project

```
GET /api/v1/projects/:id
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.yourdomain.com/api/v1/projects/550e8400-e29b-41d4-a716-446655440000
```

**Example Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Website",
  "domain": "example.com",
  "description": "Main website analytics",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Update Project

```
PUT /api/v1/projects/:id
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "domain": "newdomain.com",
  "description": "Updated description",
  "is_active": false
}
```

**Example Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "domain": "newdomain.com",
  "description": "Updated description",
  "is_active": false,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-15T11:00:00.000Z"
}
```

### Delete Project

```
DELETE /api/v1/projects/:id
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Warning**: This operation cascades and deletes:
- All API keys for this project
- All events for this project
- All goals for this project
- All email preferences for this project
- All daily analytics data for this project

**Example Response** (204 No Content)

---

## API Keys

Generate and manage API keys for event tracking.

### List API Keys

```
GET /api/v1/projects/:projectId/api-keys
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | UUID | Project ID |

**Example Response**:
```json
{
  "api_keys": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "key_prefix": "ap_abc123",
      "name": "Production Website",
      "description": "Main website tracking",
      "is_active": true,
      "last_used_at": "2025-01-15T10:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

**Note**: Full API keys are never returned (only `key_prefix`). The full key is shown only once during creation.

### Generate API Key

```
POST /api/v1/projects/:projectId/api-keys
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | UUID | Project ID |

**Request Body**:
```json
{
  "name": "Production Website",
  "description": "Main website tracking (optional)"
}
```

**Example Response** (201 Created):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "ap_abc123def456ghi789jkl012mno345pqr678",
  "key_prefix": "ap_abc123",
  "name": "Production Website",
  "description": "Main website tracking",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**⚠️ Important**: The full `key` field is shown only once! Save it immediately. Future API calls will only return `key_prefix`.

### Revoke API Key

```
DELETE /api/v1/projects/:projectId/api-keys/:keyId
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | UUID | Project ID |
| `keyId` | UUID | API Key ID |

**Example Response** (204 No Content)

---

## Event Tracking

Track events from your websites and applications.

### Track Single Event

```
POST /api/v1/track/event
```

**Authentication**: API key required (header: `X-API-Key` or query param: `apiKey`)

**Request Body**:
```json
{
  "event_type": "pageview",
  "event_name": null,
  "url": "https://example.com/products",
  "referrer": "https://google.com/search?q=widgets",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1",
  "screen_width": 1920,
  "screen_height": 1080,
  "viewport_width": 1200,
  "viewport_height": 800,
  "language": "en-US",
  "timezone": "America/New_York",
  "session_id": "770e8400-e29b-41d4-a716-446655440002",
  "custom_data": {
    "category": "electronics",
    "page_type": "product_listing"
  },
  "utm_params": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "spring_sale",
    "utm_term": "widgets",
    "utm_content": "banner_a"
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | string | Yes | Event type: "pageview", "click", "custom" |
| `event_name` | string | No | Custom event name (required if event_type is "custom") |
| `url` | string | Yes | Page URL where event occurred |
| `referrer` | string | No | Referrer URL |
| `user_agent` | string | No | Browser user agent string |
| `ip_address` | string | No | Client IP address (hashed on server) |
| `screen_width` | integer | No | Screen width in pixels |
| `screen_height` | integer | No | Screen height in pixels |
| `viewport_width` | integer | No | Viewport width in pixels |
| `viewport_height` | integer | No | Viewport height in pixels |
| `language` | string | No | Browser language (e.g., "en-US") |
| `timezone` | string | No | Client timezone (e.g., "America/New_York") |
| `session_id` | UUID | No | Session identifier (generated by tracking library) |
| `custom_data` | object | No | Custom event properties (max 5KB) |
| `utm_params` | object | No | UTM campaign parameters |

**Example Response** (201 Created):
```json
{
  "event_id": "880e8400-e29b-41d4-a716-446655440003",
  "status": "success"
}
```

### Track Batch Events

```
POST /api/v1/track/batch
```

**Authentication**: API key required

**Request Body**:
```json
{
  "events": [
    {
      "event_type": "pageview",
      "url": "https://example.com/page1",
      "session_id": "770e8400-e29b-41d4-a716-446655440002"
    },
    {
      "event_type": "pageview",
      "url": "https://example.com/page2",
      "session_id": "770e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

**Limits**:
- Max 100 events per batch
- Max 100KB total payload size
- Max 5KB per individual event's `custom_data`

**Example Response** (201 Created):
```json
{
  "status": "success",
  "processed": 2,
  "failed": 0,
  "event_ids": [
    "880e8400-e29b-41d4-a716-446655440003",
    "880e8400-e29b-41d4-a716-446655440004"
  ]
}
```

**Error Response** (partial failure):
```json
{
  "status": "partial_success",
  "processed": 1,
  "failed": 1,
  "event_ids": [
    "880e8400-e29b-41d4-a716-446655440003"
  ],
  "errors": [
    {
      "index": 1,
      "error": "Invalid URL format"
    }
  ]
}
```

---

## Analytics

Retrieve analytics data for your projects.

### Get Historical Analytics

```
GET /api/v1/projects/:id/analytics
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | date | Yes | Start date (YYYY-MM-DD) |
| `endDate` | date | Yes | End date (YYYY-MM-DD) |
| `granularity` | string | No | "day", "week", or "month" (default: "day") |

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.yourdomain.com/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/analytics?startDate=2025-01-01&endDate=2025-01-31&granularity=day"
```

**Example Response**:
```json
{
  "summary": {
    "pageviews": 125430,
    "unique_visitors": 8542,
    "sessions": 15234,
    "bounce_rate": 42.5,
    "avg_session_duration_seconds": 245
  },
  "timeseries": [
    {
      "date": "2025-01-01",
      "pageviews": 4200,
      "unique_visitors": 320,
      "sessions": 580,
      "bounce_rate": 43.1,
      "avg_session_duration_seconds": 238
    },
    {
      "date": "2025-01-02",
      "pageviews": 3950,
      "unique_visitors": 305,
      "sessions": 542,
      "bounce_rate": 41.8,
      "avg_session_duration_seconds": 251
    }
  ],
  "top_pages": [
    {
      "url": "/products",
      "pageviews": 25430,
      "unique_visitors": 4321
    },
    {
      "url": "/pricing",
      "pageviews": 18920,
      "unique_visitors": 3542
    }
  ],
  "top_referrers": [
    {
      "referrer": "https://google.com",
      "sessions": 5234,
      "percentage": 34.3
    },
    {
      "referrer": "(direct)",
      "sessions": 4123,
      "percentage": 27.1
    }
  ],
  "geographic_distribution": {
    "countries": [
      {
        "country": "United States",
        "country_code": "US",
        "sessions": 8420,
        "percentage": 55.3
      },
      {
        "country": "United Kingdom",
        "country_code": "GB",
        "sessions": 2134,
        "percentage": 14.0
      }
    ],
    "cities": [
      {
        "city": "New York",
        "country": "United States",
        "sessions": 2145,
        "percentage": 14.1
      },
      {
        "city": "London",
        "country": "United Kingdom",
        "sessions": 1234,
        "percentage": 8.1
      }
    ]
  },
  "device_breakdown": {
    "desktop": 8234,
    "mobile": 5890,
    "tablet": 1110
  },
  "browser_breakdown": [
    {
      "browser": "Chrome",
      "sessions": 9876,
      "percentage": 64.8
    },
    {
      "browser": "Safari",
      "sessions": 3210,
      "percentage": 21.1
    }
  ],
  "os_breakdown": [
    {
      "os": "Windows",
      "sessions": 7654,
      "percentage": 50.2
    },
    {
      "os": "macOS",
      "sessions": 4321,
      "percentage": 28.4
    }
  ]
}
```

### Get Real-Time Analytics

```
GET /api/v1/projects/:id/realtime
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Example Response**:
```json
{
  "active_visitors": 42,
  "recent_pageviews": 156,
  "current_pages": [
    {
      "url": "/products",
      "visitors": 12,
      "last_activity": "2025-01-15T10:30:45.000Z"
    },
    {
      "url": "/pricing",
      "visitors": 8,
      "last_activity": "2025-01-15T10:30:52.000Z"
    }
  ],
  "last_updated": "2025-01-15T10:31:00.000Z"
}
```

**Definitions**:
- `active_visitors`: Visitors with activity in the last 5 minutes
- `recent_pageviews`: Pageview count in the last 30 minutes
- `current_pages`: Pages being viewed right now (last 5 minutes)

---

## Events

Query custom events and event history.

### Get Events

```
GET /api/v1/projects/:id/events
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | date | No | Start date (YYYY-MM-DD) |
| `endDate` | date | No | End date (YYYY-MM-DD) |
| `event_name` | string | No | Filter by event name |
| `event_type` | string | No | Filter by event type |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50, max: 1000) |

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.yourdomain.com/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/events?event_name=purchase&startDate=2025-01-01&endDate=2025-01-31&limit=100"
```

**Example Response**:
```json
{
  "events": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "770e8400-e29b-41d4-a716-446655440002",
      "event_type": "custom",
      "event_name": "purchase",
      "url": "https://example.com/checkout/success",
      "referrer": "https://example.com/cart",
      "country": "United States",
      "city": "New York",
      "browser": "Chrome",
      "os": "Windows",
      "device_type": "desktop",
      "custom_data": {
        "order_id": "ORD-12345",
        "total": 299.99,
        "currency": "USD",
        "items": 3
      },
      "utm_params": {
        "utm_source": "google",
        "utm_medium": "cpc",
        "utm_campaign": "spring_sale"
      },
      "timestamp": "2025-01-15T10:30:00.000Z",
      "created_at": "2025-01-15T10:30:00.123Z"
    }
  ],
  "pagination": {
    "total": 1542,
    "page": 1,
    "limit": 100,
    "pages": 16
  }
}
```

---

## Campaigns

Analyze UTM campaign performance.

### Get Campaign Statistics

```
GET /api/v1/projects/:id/campaigns
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | date | Yes | Start date (YYYY-MM-DD) |
| `endDate` | date | Yes | End date (YYYY-MM-DD) |

**Example Response**:
```json
{
  "campaigns": [
    {
      "campaign_name": "spring_sale",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_term": "widgets",
      "utm_content": "banner_a",
      "sessions": 5234,
      "pageviews": 18420,
      "unique_visitors": 4321,
      "bounce_rate": 38.5,
      "avg_session_duration_seconds": 287,
      "conversions": 234,
      "conversion_rate": 4.47
    },
    {
      "campaign_name": "newsletter_jan",
      "utm_source": "newsletter",
      "utm_medium": "email",
      "sessions": 2134,
      "pageviews": 8920,
      "unique_visitors": 1987,
      "bounce_rate": 22.1,
      "avg_session_duration_seconds": 345,
      "conversions": 156,
      "conversion_rate": 7.31
    }
  ]
}
```

### Compare Campaigns

```
POST /api/v1/projects/:id/campaigns/compare
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Request Body**:
```json
{
  "campaigns": ["spring_sale", "summer_promo"],
  "start_date": "2025-01-01",
  "end_date": "2025-06-30"
}
```

**Example Response**:
```json
{
  "comparison": [
    {
      "campaign_name": "spring_sale",
      "sessions": 5234,
      "pageviews": 18420,
      "conversions": 234,
      "conversion_rate": 4.47
    },
    {
      "campaign_name": "summer_promo",
      "sessions": 6789,
      "pageviews": 22130,
      "conversions": 312,
      "conversion_rate": 4.60
    }
  ],
  "winner": {
    "by_sessions": "summer_promo",
    "by_conversion_rate": "summer_promo",
    "by_conversions": "summer_promo"
  }
}
```

### Get Top Campaigns

```
GET /api/v1/projects/:id/campaigns/top
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metric` | string | No | "sessions", "pageviews", "conversions", "conversion_rate" (default: "sessions") |
| `limit` | integer | No | Number of campaigns (default: 10, max: 50) |
| `startDate` | date | Yes | Start date |
| `endDate` | date | Yes | End date |

**Example Response**:
```json
{
  "top_campaigns": [
    {
      "campaign_name": "summer_promo",
      "sessions": 6789,
      "rank": 1
    },
    {
      "campaign_name": "spring_sale",
      "sessions": 5234,
      "rank": 2
    }
  ]
}
```

---

## Goals

Create and track conversion goals.

### Create Goal

```
POST /api/v1/projects/:id/goals
```

**Authentication**: Bearer token required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Project ID |

**Request Body**:
```json
{
  "name": "Newsletter Signup",
  "description": "User subscribed to newsletter (optional)",
  "goal_type": "event",
  "target_event_name": "newsletter_signup",
  "is_active": true
}
```

**Goal Types**:

**Event Goal**:
```json
{
  "name": "Purchase",
  "goal_type": "event",
  "target_event_name": "purchase"
}
```

**Pageview Goal**:
```json
{
  "name": "Thank You Page",
  "goal_type": "pageview",
  "target_url_pattern": "/thank-you"
}
```

**Value Goal**:
```json
{
  "name": "High-Value Purchase",
  "goal_type": "value",
  "target_event_name": "purchase",
  "target_value": 100.00
}
```

**Example Response** (201 Created):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Newsletter Signup",
  "description": "User subscribed to newsletter",
  "goal_type": "event",
  "target_event_name": "newsletter_signup",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### List Goals

```
GET /api/v1/projects/:id/goals
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_stats` | boolean | No | Include completion statistics (default: false) |
| `startDate` | date | No | Start date for stats |
| `endDate` | date | No | End date for stats |

**Example Response**:
```json
{
  "goals": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440005",
      "name": "Newsletter Signup",
      "goal_type": "event",
      "target_event_name": "newsletter_signup",
      "is_active": true,
      "stats": {
        "completions": 1234,
        "sessions": 15234,
        "conversion_rate": 8.10
      }
    }
  ]
}
```

### Get Goal Details

```
GET /api/v1/projects/:id/goals/:goalId
```

**Authentication**: Bearer token required

**Example Response**:
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Newsletter Signup",
  "description": "User subscribed to newsletter",
  "goal_type": "event",
  "target_event_name": "newsletter_signup",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

### Update Goal

```
PUT /api/v1/projects/:id/goals/:goalId
```

**Authentication**: Bearer token required

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "is_active": false
}
```

### Delete Goal

```
DELETE /api/v1/projects/:id/goals/:goalId
```

**Authentication**: Bearer token required

**Example Response** (204 No Content)

### Get Conversion Funnel

```
POST /api/v1/projects/:id/goals/funnel
```

**Authentication**: Bearer token required

**Request Body**:
```json
{
  "goal_ids": [
    "goal-id-1",
    "goal-id-2",
    "goal-id-3"
  ],
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

**Example Response**:
```json
{
  "funnel": [
    {
      "step": 1,
      "goal_id": "goal-id-1",
      "goal_name": "View Product",
      "completions": 10000,
      "drop_off": 0,
      "conversion_rate": 100.0
    },
    {
      "step": 2,
      "goal_id": "goal-id-2",
      "goal_name": "Add to Cart",
      "completions": 3500,
      "drop_off": 6500,
      "conversion_rate": 35.0
    },
    {
      "step": 3,
      "goal_id": "goal-id-3",
      "goal_name": "Purchase",
      "completions": 1200,
      "drop_off": 2300,
      "conversion_rate": 34.3
    }
  ],
  "overall_conversion_rate": 12.0
}
```

---

## Email Preferences

Configure automated email reports.

### Get Email Preferences

```
GET /api/v1/projects/:id/email-preferences
```

**Authentication**: Bearer token required

**Example Response**:
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440006",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_email": "user@example.com",
  "daily_report_enabled": true,
  "daily_report_time": "09:00",
  "weekly_report_enabled": true,
  "weekly_report_day": "monday",
  "weekly_report_time": "09:00",
  "monthly_report_enabled": true,
  "monthly_report_day": 1,
  "monthly_report_time": "09:00",
  "timezone": "America/New_York",
  "is_active": true,
  "unsubscribed_at": null
}
```

### Update Email Preferences

```
PUT /api/v1/projects/:id/email-preferences
```

**Authentication**: Bearer token required

**Request Body**:
```json
{
  "daily_report_enabled": true,
  "daily_report_time": "09:00",
  "weekly_report_enabled": true,
  "weekly_report_day": "monday",
  "weekly_report_time": "09:00",
  "monthly_report_enabled": false,
  "timezone": "America/New_York"
}
```

### Send Test Report

```
POST /api/v1/projects/:id/email-preferences/test
```

**Authentication**: Bearer token required

**Example Response**:
```json
{
  "status": "sent",
  "message": "Test report sent to user@example.com"
}
```

### Unsubscribe

```
GET /api/v1/unsubscribe?token=UNSUBSCRIBE_TOKEN
```

**Authentication**: None (token-based)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Unsubscribe token from email |

**Example Response**:
```json
{
  "status": "unsubscribed",
  "message": "You have been unsubscribed from email reports"
}
```

---

## Export

Export analytics data for external analysis.

### Export Analytics

```
GET /api/v1/projects/:id/analytics/export
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | Yes | "csv" or "json" |
| `startDate` | date | Yes | Start date (YYYY-MM-DD) |
| `endDate` | date | Yes | End date (YYYY-MM-DD) |

**Example Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.yourdomain.com/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/analytics/export?format=csv&startDate=2025-01-01&endDate=2025-01-31" \
  -o analytics.csv
```

**CSV Format**:
```
Date,Pageviews,Unique Visitors,Sessions,Bounce Rate,Avg Session Duration
2025-01-01,4200,320,580,43.1,238
2025-01-02,3950,305,542,41.8,251
...
```

**JSON Format**:
```json
{
  "export_date": "2025-01-15T10:30:00.000Z",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "data": [
    {
      "date": "2025-01-01",
      "pageviews": 4200,
      "unique_visitors": 320,
      "sessions": 580,
      "bounce_rate": 43.1,
      "avg_session_duration_seconds": 238
    }
  ]
}
```

### Export Events

```
GET /api/v1/projects/:id/events/export
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | Yes | "csv" or "json" |
| `startDate` | date | No | Start date |
| `endDate` | date | No | End date |
| `event_name` | string | No | Filter by event name |

### Export Campaigns

```
GET /api/v1/projects/:id/campaigns/export
```

**Authentication**: Bearer token required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | Yes | "csv" or "json" |
| `startDate` | date | Yes | Start date |
| `endDate` | date | Yes | End date |

---

## Aggregation

Trigger daily aggregation for analytics data (admin/maintenance).

### Trigger Daily Aggregation

```
POST /api/v1/aggregation/daily
```

**Authentication**: Bearer token required (admin only)

**Request Body**:
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2025-01-14"
}
```

**Example Response**:
```json
{
  "status": "success",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2025-01-14",
  "metrics_computed": true
}
```

### Aggregate All Projects

```
POST /api/v1/aggregation/daily/all
```

**Authentication**: Bearer token required (admin only)

**Request Body**:
```json
{
  "date": "2025-01-14"
}
```

---

## Performance

Monitor system performance and query execution.

### Get Performance Metrics

```
GET /api/v1/performance/metrics
```

**Authentication**: Bearer token required

**Example Response**:
```json
{
  "query_performance": {
    "slow_queries": 3,
    "avg_query_time_ms": 42.5,
    "p99_query_time_ms": 187.2
  },
  "cache_performance": {
    "hit_rate": 87.3,
    "miss_rate": 12.7,
    "total_requests": 125430
  },
  "database": {
    "active_connections": 12,
    "max_connections": 20,
    "idle_connections": 3
  }
}
```

---

## Partitions

Monitor database partition health (admin/maintenance).

### Get Partition Health

```
GET /api/v1/partitions/health
```

**Authentication**: Bearer token required (admin only)

**Example Response**:
```json
{
  "status": "healthy",
  "tables": {
    "events": {
      "total_partitions": 24,
      "upcoming_partitions": 6,
      "oldest_partition": "events_2023_01",
      "newest_partition": "events_2025_06"
    },
    "goal_completions": {
      "total_partitions": 24,
      "upcoming_partitions": 6,
      "oldest_partition": "goal_completions_2023_01",
      "newest_partition": "goal_completions_2025_06"
    }
  }
}
```

### List Partitions

```
GET /api/v1/partitions/list
```

**Authentication**: Bearer token required (admin only)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table` | string | No | "events" or "goal_completions" |

**Example Response**:
```json
{
  "partitions": [
    {
      "table_name": "events",
      "partition_name": "events_2025_01",
      "partition_start": "2025-01-01",
      "partition_end": "2025-02-01",
      "row_count": 1250430,
      "size_mb": 2450.7
    },
    {
      "table_name": "events",
      "partition_name": "events_2025_02",
      "partition_start": "2025-02-01",
      "partition_end": "2025-03-01",
      "row_count": 980234,
      "size_mb": 1987.3
    }
  ]
}
```

---

## Webhooks (Coming Soon)

Future webhook support for real-time event notifications.

---

## SDKs and Libraries

Official SDKs:
- **JavaScript/TypeScript**: [@analytics-pulse/tracking-library](https://www.npmjs.com/package/@analytics-pulse/tracking-library)
- **React**: Coming soon
- **Vue**: Coming soon
- **Python**: Coming soon
- **PHP**: Coming soon

---

## Support

- **Documentation**: [https://github.com/Jeffrey-Keyser/Analytics-Pulse](https://github.com/Jeffrey-Keyser/Analytics-Pulse)
- **Issues**: [GitHub Issues](https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues)
- **API Updates**: Check [CHANGELOG.md](../CHANGELOG.md) for API changes
- **OpenAPI Spec**: Available at `/api-docs` (Swagger UI)

---

**API Version**: v1
**Last Updated**: January 2025
