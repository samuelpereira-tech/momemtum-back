# Person Area API Documentation

This folder contains the API specification for managing the association between persons and scheduled areas, including their assigned responsibilities (roles).

## Overview

The Person Area API provides endpoints for associating persons with scheduled areas and managing their responsibilities within those areas. A person can be associated with a scheduled area and have multiple responsibilities (functions) assigned to them in that area.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## Endpoints

### Add Person to Scheduled Area

**POST** `/api/scheduled-areas/{scheduledAreaId}/persons`

Associates a person with a scheduled area and assigns one or more responsibilities to them.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)

**Request Body:**
```json
{
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "responsibilityIds": [
    "456e7890-e89b-12d3-a456-426614174001",
    "789e0123-e89b-12d3-a456-426614174002"
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "abc12345-e89b-12d3-a456-426614174003",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com",
    "photoUrl": "https://example.com/photos/person-123e4567.jpg"
  },
  "scheduledAreaId": "def67890-e89b-12d3-a456-426614174004",
  "scheduledArea": {
    "id": "def67890-e89b-12d3-a456-426614174004",
    "name": "Área de Produção"
  },
  "responsibilities": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "Operador",
      "description": "Responsável por operar equipamentos",
      "imageUrl": "https://example.com/images/responsibility-456e7890.jpg"
    },
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Supervisor",
      "description": "Supervisiona operações",
      "imageUrl": null
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Validation Rules:**
- `personId`: Required, must exist
- `responsibilityIds`: Required, array with at least one responsibility ID, all IDs must exist and belong to the scheduled area

**Error Responses:**
- `400 Bad Request`: Invalid input data (person not found, responsibility not found, or responsibility doesn't belong to the area)
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Scheduled area not found
- `409 Conflict`: Person is already associated with this scheduled area
- `500 Internal Server Error`: Server error

---

### List Persons in Scheduled Area

**GET** `/api/scheduled-areas/{scheduledAreaId}/persons`

Retrieves a paginated list of all persons associated with a scheduled area, including their assigned responsibilities.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)

**Query Parameters:**
- `page` (optional): Page number (starts at 1, default: 1)
- `limit` (optional): Number of items per page (max 100, default: 10)
- `personName` (optional): Filter by person name (partial match, case-insensitive)
- `personEmail` (optional): Filter by person email (partial match, case-insensitive)
- `responsibilityId` (optional): Filter by responsibility ID (show only persons with this responsibility)

**Example Request:**
```
GET /api/scheduled-areas/def67890-e89b-12d3-a456-426614174004/persons?page=1&limit=10
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174003",
      "personId": "123e4567-e89b-12d3-a456-426614174000",
      "person": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "fullName": "João Silva",
        "email": "joao.silva@example.com",
        "photoUrl": "https://example.com/photos/person-123e4567.jpg"
      },
      "scheduledAreaId": "def67890-e89b-12d3-a456-426614174004",
      "scheduledArea": {
        "id": "def67890-e89b-12d3-a456-426614174004",
        "name": "Área de Produção"
      },
      "responsibilities": [
        {
          "id": "456e7890-e89b-12d3-a456-426614174001",
          "name": "Operador",
          "description": "Responsável por operar equipamentos",
          "imageUrl": "https://example.com/images/responsibility-456e7890.jpg"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Scheduled area not found

---

### Get Person Area Association by ID

**GET** `/api/scheduled-areas/{scheduledAreaId}/persons/{personAreaId}`

Retrieves a specific person-area association by its ID.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)
- `personAreaId` (required): Person area association unique identifier (UUID)

**Response (200 OK):**
```json
{
  "id": "abc12345-e89b-12d3-a456-426614174003",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com",
    "photoUrl": "https://example.com/photos/person-123e4567.jpg"
  },
  "scheduledAreaId": "def67890-e89b-12d3-a456-426614174004",
  "scheduledArea": {
    "id": "def67890-e89b-12d3-a456-426614174004",
    "name": "Área de Produção"
  },
  "responsibilities": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "Operador",
      "description": "Responsável por operar equipamentos",
      "imageUrl": "https://example.com/images/responsibility-456e7890.jpg"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person area association or scheduled area not found

---

### Update Person Responsibilities in Area

**PATCH** `/api/scheduled-areas/{scheduledAreaId}/persons/{personAreaId}`

Updates the responsibilities assigned to a person in a scheduled area. Only the responsibilities list will be updated.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)
- `personAreaId` (required): Person area association unique identifier (UUID)

**Request Body:**
```json
{
  "responsibilityIds": [
    "456e7890-e89b-12d3-a456-426614174001",
    "789e0123-e89b-12d3-a456-426614174002",
    "012e3456-e89b-12d3-a456-426614174005"
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "abc12345-e89b-12d3-a456-426614174003",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com",
    "photoUrl": "https://example.com/photos/person-123e4567.jpg"
  },
  "scheduledAreaId": "def67890-e89b-12d3-a456-426614174004",
  "scheduledArea": {
    "id": "def67890-e89b-12d3-a456-426614174004",
    "name": "Área de Produção"
  },
  "responsibilities": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "Operador",
      "description": "Responsável por operar equipamentos",
      "imageUrl": "https://example.com/images/responsibility-456e7890.jpg"
    },
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Supervisor",
      "description": "Supervisiona operações",
      "imageUrl": null
    },
    {
      "id": "012e3456-e89b-12d3-a456-426614174005",
      "name": "Técnico",
      "description": "Suporte técnico",
      "imageUrl": null
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**Validation Rules:**
- `responsibilityIds`: Required, array with at least one responsibility ID, all IDs must exist and belong to the scheduled area

**Error Responses:**
- `400 Bad Request`: Invalid input data (responsibility not found or doesn't belong to the area)
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person area association or scheduled area not found
- `500 Internal Server Error`: Server error

---

### Remove Person from Scheduled Area

**DELETE** `/api/scheduled-areas/{scheduledAreaId}/persons/{personAreaId}`

Removes a person from a scheduled area, including all their assigned responsibilities.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)
- `personAreaId` (required): Person area association unique identifier (UUID)

**Response (204 No Content):** Success, no response body

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person area association or scheduled area not found
- `500 Internal Server Error`: Server error

---

### Get Person Area by Person ID

**GET** `/api/scheduled-areas/{scheduledAreaId}/persons/by-person/{personId}`

Retrieves the person-area association for a specific person in a scheduled area. This is useful when you know the person ID but not the association ID.

**Path Parameters:**
- `scheduledAreaId` (required): Scheduled area unique identifier (UUID)
- `personId` (required): Person unique identifier (UUID)

**Response (200 OK):**
```json
{
  "id": "abc12345-e89b-12d3-a456-426614174003",
  "personId": "123e4567-e89b-12d3-a456-426614174000",
  "person": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com",
    "photoUrl": "https://example.com/photos/person-123e4567.jpg"
  },
  "scheduledAreaId": "def67890-e89b-12d3-a456-426614174004",
  "scheduledArea": {
    "id": "def67890-e89b-12d3-a456-426614174004",
    "name": "Área de Produção"
  },
  "responsibilities": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "Operador",
      "description": "Responsável por operar equipamentos",
      "imageUrl": "https://example.com/images/responsibility-456e7890.jpg"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person not associated with this scheduled area, or scheduled area not found

---

## Data Models

### CreatePersonAreaDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| personId | UUID | Yes | ID of the person to associate with the area |
| responsibilityIds | UUID[] | Yes | Array of responsibility IDs (must belong to the scheduled area, at least one required) |

### UpdatePersonAreaDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| responsibilityIds | UUID[] | Yes | Array of responsibility IDs (must belong to the scheduled area, at least one required) |

### PersonAreaResponseDto

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier for the person-area association |
| personId | UUID | ID of the associated person |
| person | PersonInfoDto | Person information (populated when requested) |
| scheduledAreaId | UUID | ID of the scheduled area |
| scheduledArea | ScheduledAreaDto | Scheduled area information (populated when requested) |
| responsibilities | ResponsibilityInfoDto[] | Array of responsibilities assigned to the person in this area |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### PersonInfoDto

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Person unique identifier |
| fullName | string | Person's full name |
| email | string | Person's email address |
| photoUrl | string \| null | URL to the person's photo |

### ScheduledAreaDto

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Scheduled area unique identifier |
| name | string | Scheduled area name |

### ResponsibilityInfoDto

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Responsibility unique identifier |
| name | string | Responsibility name |
| description | string \| null | Responsibility description |
| imageUrl | string \| null | URL to the responsibility image |

### PaginatedPersonAreaResponseDto

| Field | Type | Description |
|-------|------|-------------|
| data | PersonAreaResponseDto[] | Array of person-area associations |
| meta | PaginationMetaDto | Pagination metadata |

### PaginationMetaDto

| Field | Type | Description |
|-------|------|-------------|
| page | number | Current page number |
| limit | number | Items per page |
| total | number | Total number of items |
| totalPages | number | Total number of pages |

---

## Business Rules

1. **One Person Per Area**: A person can only be associated once with a specific scheduled area. Attempting to add the same person again will result in a 409 Conflict error.

2. **Responsibilities Must Belong to Area**: All responsibility IDs provided must belong to the scheduled area. If any responsibility doesn't belong to the area, a 400 Bad Request error will be returned.

3. **At Least One Responsibility**: A person must have at least one responsibility assigned when added to an area, and when updating responsibilities.

4. **Cascade Deletion**: When a person is removed from an area, all their responsibility assignments in that area are also removed.

5. **Responsibility Updates**: When updating responsibilities, the entire list is replaced. To add a responsibility, include all existing responsibilities plus the new one.

---

## Example Workflow

1. **Add a person to an area with responsibilities:**
   ```bash
   POST /api/scheduled-areas/{scheduledAreaId}/persons
   {
     "personId": "123e4567-e89b-12d3-a456-426614174000",
     "responsibilityIds": [
       "456e7890-e89b-12d3-a456-426614174001",
       "789e0123-e89b-12d3-a456-426614174002"
     ]
   }
   ```

2. **List all persons in an area:**
   ```bash
   GET /api/scheduled-areas/{scheduledAreaId}/persons?page=1&limit=10
   ```

3. **Update person responsibilities:**
   ```bash
   PATCH /api/scheduled-areas/{scheduledAreaId}/persons/{personAreaId}
   {
     "responsibilityIds": [
       "456e7890-e89b-12d3-a456-426614174001",
       "789e0123-e89b-12d3-a456-426614174002",
       "012e3456-e89b-12d3-a456-426614174005"
     ]
   }
   ```

4. **Remove person from area:**
   ```bash
   DELETE /api/scheduled-areas/{scheduledAreaId}/persons/{personAreaId}
   ```

---

## File Specification

- **api.json**: OpenAPI 3.0 specification file containing the complete API definition

