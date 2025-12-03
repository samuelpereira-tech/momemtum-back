# Scheduled Absence API Documentation

This folder contains the API specification for managing scheduled absences and absence types.

## Overview

The Scheduled Absence API provides endpoints for:
- Managing scheduled absences (férias, feriados, licenças, etc.) for persons
- Managing absence types (tipos de ausência) with their configurations

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## Scheduled Absences Endpoints

### Create Scheduled Absence

**POST** `/api/scheduled-absences`

Creates a new scheduled absence for a person.

**Request Body:**
```json
{
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "startDate": "2024-12-20",
  "endDate": "2025-01-10",
  "description": "Férias de fim de ano"
}
```

**Response (201 Created):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com"
  },
  "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "absenceType": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Férias",
    "color": "#79D9C7"
  },
  "startDate": "2024-12-20",
  "endDate": "2025-01-10",
  "description": "Férias de fim de ano",
  "createdAt": "2024-12-01T10:30:00.000Z",
  "updatedAt": "2024-12-01T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid input data (e.g., endDate before startDate)
- `404` - Person or absence type not found
- `409` - Conflict - Overlapping absence dates for the same person
- `401` - Unauthorized

### List Scheduled Absences

**GET** `/api/scheduled-absences`

Retrieves a paginated list of scheduled absences with optional filters.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10, max: 100) - Items per page
- `personId` (UUID, optional) - Filter by person ID
- `personName` (string, optional) - Filter by person name (partial match, case-insensitive)
- `absenceTypeId` (UUID, optional) - Filter by absence type ID
- `startDate` (date, optional) - Filter by start date (returns absences starting from this date)
- `endDate` (date, optional) - Filter by end date (returns absences ending before or on this date)
- `dateRange` (string, optional) - Filter by date range (format: `YYYY-MM-DD,YYYY-MM-DD`) - Returns absences that overlap with the specified range

**Example Request:**
```
GET /api/scheduled-absences?page=1&limit=10&personName=João&startDate=2024-12-01
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "personId": "123e4567-e89b-12d3-a456-426614174000",
      "person": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "fullName": "João Silva",
        "email": "joao.silva@example.com"
      },
      "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
      "absenceType": {
        "id": "456e7890-e89b-12d3-a456-426614174001",
        "name": "Férias",
        "color": "#79D9C7"
      },
      "startDate": "2024-12-20",
      "endDate": "2025-01-10",
      "description": "Férias de fim de ano",
      "createdAt": "2024-12-01T10:30:00.000Z",
      "updatedAt": "2024-12-01T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Get Scheduled Absence by ID

**GET** `/api/scheduled-absences/{id}`

Retrieves a specific scheduled absence by its ID.

**Path Parameters:**
- `id` (UUID, required) - Scheduled absence unique identifier

**Response (200 OK):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com"
  },
  "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "absenceType": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Férias",
    "color": "#79D9C7"
  },
  "startDate": "2024-12-20",
  "endDate": "2025-01-10",
  "description": "Férias de fim de ano",
  "createdAt": "2024-12-01T10:30:00.000Z",
  "updatedAt": "2024-12-01T10:30:00.000Z"
}
```

**Error Responses:**
- `404` - Scheduled absence not found
- `401` - Unauthorized

### Update Scheduled Absence

**PUT** `/api/scheduled-absences/{id}`

Updates an existing scheduled absence.

**Path Parameters:**
- `id` (UUID, required) - Scheduled absence unique identifier

**Request Body:**
```json
{
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "startDate": "2024-12-25",
  "endDate": "2025-01-15",
  "description": "Férias de fim de ano atualizadas"
}
```

**Response (200 OK):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com"
  },
  "absenceTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "absenceType": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Férias",
    "color": "#79D9C7"
  },
  "startDate": "2024-12-25",
  "endDate": "2025-01-15",
  "description": "Férias de fim de ano atualizadas",
  "createdAt": "2024-12-01T10:30:00.000Z",
  "updatedAt": "2024-12-15T14:20:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid input data
- `404` - Scheduled absence, person, or absence type not found
- `409` - Conflict - Overlapping absence dates for the same person
- `401` - Unauthorized

### Delete Scheduled Absence

**DELETE** `/api/scheduled-absences/{id}`

Deletes a scheduled absence by its ID.

**Path Parameters:**
- `id` (UUID, required) - Scheduled absence unique identifier

**Response (200 OK):**
```json
{
  "message": "Scheduled absence deleted successfully"
}
```

**Error Responses:**
- `404` - Scheduled absence not found
- `401` - Unauthorized

## Absence Types Endpoints

### Create Absence Type

**POST** `/api/absence-types`

Creates a new absence type (e.g., Férias, Feriado, Licença).

**Request Body:**
```json
{
  "name": "Férias",
  "description": "Período de férias",
  "color": "#79D9C7",
  "active": true
}
```

**Response (201 Created):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Férias",
  "description": "Período de férias",
  "color": "#79D9C7",
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid input data (e.g., invalid color format)
- `409` - Conflict - Absence type with this name already exists
- `401` - Unauthorized

### List Absence Types

**GET** `/api/absence-types`

Retrieves a paginated list of absence types with optional filters.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10, max: 100) - Items per page
- `name` (string, optional) - Filter by name (partial match, case-insensitive)
- `active` (boolean, optional) - Filter by active status

**Example Request:**
```
GET /api/absence-types?page=1&limit=10&active=true&name=Férias
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "Férias",
      "description": "Período de férias",
      "color": "#79D9C7",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Feriado",
      "description": "Feriado nacional ou regional",
      "color": "#F2B33D",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Get Absence Type by ID

**GET** `/api/absence-types/{id}`

Retrieves a specific absence type by its ID.

**Path Parameters:**
- `id` (UUID, required) - Absence type unique identifier

**Response (200 OK):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Férias",
  "description": "Período de férias",
  "color": "#79D9C7",
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `404` - Absence type not found
- `401` - Unauthorized

### Update Absence Type

**PUT** `/api/absence-types/{id}`

Updates an existing absence type.

**Path Parameters:**
- `id` (UUID, required) - Absence type unique identifier

**Request Body:**
```json
{
  "name": "Férias",
  "description": "Período de férias atualizado",
  "color": "#79D9C7",
  "active": true
}
```

**Response (200 OK):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Férias",
  "description": "Período de férias atualizado",
  "color": "#79D9C7",
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:20:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid input data
- `404` - Absence type not found
- `409` - Conflict - Absence type with this name already exists
- `401` - Unauthorized

### Delete Absence Type

**DELETE** `/api/absence-types/{id}`

Deletes an absence type by its ID. Cannot delete if there are scheduled absences using this type.

**Path Parameters:**
- `id` (UUID, required) - Absence type unique identifier

**Response (200 OK):**
```json
{
  "message": "Absence type deleted successfully"
}
```

**Error Responses:**
- `404` - Absence type not found
- `409` - Conflict - Cannot delete absence type that is being used by scheduled absences
- `401` - Unauthorized

### Toggle Absence Type Active Status

**PATCH** `/api/absence-types/{id}/toggle`

Toggles the active status of an absence type.

**Path Parameters:**
- `id` (UUID, required) - Absence type unique identifier

**Response (200 OK):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Férias",
  "description": "Período de férias",
  "color": "#79D9C7",
  "active": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T15:30:00.000Z"
}
```

**Error Responses:**
- `404` - Absence type not found
- `401` - Unauthorized

## Data Models

### Scheduled Absence

- `id` (UUID) - Unique identifier
- `personId` (UUID) - Reference to person
- `person` (Object, optional) - Person information (populated when requested)
- `absenceTypeId` (UUID) - Reference to absence type
- `absenceType` (Object, optional) - Absence type information (populated when requested)
- `startDate` (Date) - Start date of absence (YYYY-MM-DD)
- `endDate` (Date) - End date of absence (YYYY-MM-DD)
- `description` (String, optional) - Description or notes
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

### Absence Type

- `id` (UUID) - Unique identifier
- `name` (String) - Name of the absence type (e.g., "Férias", "Feriado", "Licença")
- `description` (String, optional) - Description of the absence type
- `color` (String) - Hex color code for UI display (format: #RRGGBB)
- `active` (Boolean) - Whether the absence type is active and can be used
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

## Validation Rules

### Scheduled Absence

- `personId` - Required, must be a valid UUID and exist in the database
- `absenceTypeId` - Required, must be a valid UUID and exist in the database
- `startDate` - Required, must be a valid date in ISO 8601 format (YYYY-MM-DD)
- `endDate` - Required, must be a valid date in ISO 8601 format (YYYY-MM-DD), must be greater than or equal to `startDate`
- `description` - Optional, maximum 500 characters

### Absence Type

- `name` - Required, 1-100 characters, must be unique
- `description` - Optional, maximum 500 characters
- `color` - Optional, must match pattern `^#[0-9A-Fa-f]{6}$` (default: #AD82D9)
- `active` - Optional, boolean (default: true)

## Business Rules

1. **Scheduled Absence Overlap**: The system should prevent creating scheduled absences with overlapping dates for the same person. An overlap occurs when:
   - The new absence's start date is between an existing absence's start and end dates
   - The new absence's end date is between an existing absence's start and end dates
   - The new absence completely encompasses an existing absence

2. **Absence Type Deletion**: An absence type cannot be deleted if there are any scheduled absences using that type. The system should return a 409 Conflict error in this case.

3. **Absence Type Active Status**: Only active absence types should be available for selection when creating new scheduled absences.

4. **Date Validation**: The `endDate` must always be greater than or equal to the `startDate`.

## Pagination

All list endpoints support pagination with the following query parameters:
- `page` - Page number (default: 1, minimum: 1)
- `limit` - Items per page (default: 10, minimum: 1, maximum: 100)

The response includes a `meta` object with:
- `page` - Current page number
- `limit` - Items per page
- `total` - Total number of items
- `totalPages` - Total number of pages

## Filtering

### Scheduled Absences

- Filter by person ID or name
- Filter by absence type ID
- Filter by date range (start date, end date, or date range)
- Multiple filters can be combined

### Absence Types

- Filter by name (partial match, case-insensitive)
- Filter by active status
- Multiple filters can be combined

## Error Handling

All error responses follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request",
  "details": [
    "startDate must be a valid date",
    "endDate must be greater than or equal to startDate"
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `409` - Conflict (business rule violation)
- `500` - Internal Server Error

