# Scheduled Area API Documentation

This folder contains the API specification for managing scheduled areas (Áreas de Escala) with images, responsible persons, and favorite status.

## Overview

The Scheduled Area API provides endpoints for creating, reading, updating, and deleting scheduled area records, as well as managing area images and favorite status. Scheduled areas are used to organize and manage different work areas within the scheduling system.

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

### Create Scheduled Area

**POST** `/api/scheduled-areas`

Creates a new scheduled area with the provided information.

**Request Body:**
```json
{
  "name": "Área de Produção",
  "description": "Setor responsável pela produção",
  "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
  "favorite": false
}
```

**Response (201 Created):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Área de Produção",
  "description": "Setor responsável pela produção",
  "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
  "responsiblePerson": null,
  "imageUrl": null,
  "favorite": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### List Scheduled Areas

**GET** `/api/scheduled-areas`

Retrieves a list of all scheduled areas with pagination support.

**Query Parameters:**
- `page` (optional): Page number (starts at 1, default: 1)
- `limit` (optional): Number of items per page (max 100, default: 10)
- `favorite` (optional): Filter by favorite status (true/false)

**Example Request:**
```
GET /api/scheduled-areas?page=1&limit=10&favorite=true
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Área de Produção",
      "description": "Setor responsável pela produção",
      "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
      "responsiblePerson": null,
      "imageUrl": "https://example.com/images/area-123e4567.jpg",
      "favorite": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
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

### Get Scheduled Area by ID

**GET** `/api/scheduled-areas/{id}`

Retrieves a specific scheduled area by its ID.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Área de Produção",
  "description": "Setor responsável pela produção",
  "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
  "responsiblePerson": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "fullName": "João Silva",
    "email": "joao.silva@example.com"
  },
  "imageUrl": "https://example.com/images/area-123e4567.jpg",
  "favorite": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Update Scheduled Area

**PATCH** `/api/scheduled-areas/{id}`

Updates a scheduled area with the provided information. Only provided fields will be updated.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Request Body:**
```json
{
  "name": "Área de Produção Atualizada",
  "description": "Nova descrição do setor",
  "favorite": true
}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Área de Produção Atualizada",
  "description": "Nova descrição do setor",
  "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
  "responsiblePerson": null,
  "imageUrl": "https://example.com/images/area-123e4567.jpg",
  "favorite": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:20:00.000Z"
}
```

### Delete Scheduled Area

**DELETE** `/api/scheduled-areas/{id}`

Deletes a scheduled area by its ID.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Response (204 No Content):**
No response body.

### Upload Scheduled Area Image

**POST** `/api/scheduled-areas/{id}/image`

Uploads or updates an image for a specific scheduled area. Accepts image files (JPG, PNG, GIF) with a maximum size of 5MB.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Request Body (multipart/form-data):**
- `image` (required): Image file (JPG, PNG, GIF). Maximum size: 5MB

**Response (200 OK):**
```json
{
  "message": "Image uploaded successfully",
  "imageUrl": "https://example.com/images/area-123e4567-e89b-12d3-a456-426614174000.jpg",
  "scheduledAreaId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**
- `400`: Invalid file format or size exceeds 5MB
- `413`: Payload too large - File size exceeds 5MB
- `404`: Scheduled area not found

### Delete Scheduled Area Image

**DELETE** `/api/scheduled-areas/{id}/image`

Removes the image from a specific scheduled area.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Response (204 No Content):**
No response body.

### Toggle Favorite Status

**PATCH** `/api/scheduled-areas/{id}/favorite`

Toggles the favorite status of a scheduled area. Favorite areas appear in the top menu for quick access.

**Path Parameters:**
- `id` (required): Scheduled area unique identifier (UUID)

**Request Body:**
```json
{
  "favorite": true
}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Área de Produção",
  "description": "Setor responsável pela produção",
  "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
  "responsiblePerson": null,
  "imageUrl": "https://example.com/images/area-123e4567.jpg",
  "favorite": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T15:30:00.000Z"
}
```

## Data Models

### CreateScheduledAreaDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Name of the scheduled area (3-255 characters) |
| description | string | No | Description of the scheduled area (max 1000 characters) |
| responsiblePersonId | UUID | Yes | ID of the responsible person (must exist) |
| favorite | boolean | No | Whether the area is marked as favorite (default: false) |

### UpdateScheduledAreaDto

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Name of the scheduled area (3-255 characters) |
| description | string | Description of the scheduled area (max 1000 characters) |
| responsiblePersonId | UUID | ID of the responsible person (must exist) |
| favorite | boolean | Whether the area is marked as favorite |

### ScheduledAreaResponseDto

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| name | string | Name of the scheduled area |
| description | string \| null | Description of the scheduled area |
| responsiblePersonId | UUID | ID of the responsible person |
| responsiblePerson | object \| null | Responsible person details (populated when requested) |
| imageUrl | string \| null | URL to the scheduled area image |
| favorite | boolean | Whether the area is marked as favorite |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

## Error Responses

All error responses follow this structure:

```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request",
  "details": [
    "name must be longer than or equal to 3 characters",
    "responsiblePersonId must be a UUID"
  ]
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate name)
- `413 Payload Too Large`: File size exceeds limit
- `500 Internal Server Error`: Server error

## Usage Examples

### Creating a Scheduled Area

```bash
curl -X POST http://localhost:3000/api/scheduled-areas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Área de Produção",
    "description": "Setor responsável pela produção",
    "responsiblePersonId": "123e4567-e89b-12d3-a456-426614174000",
    "favorite": false
  }'
```

### Uploading an Image

```bash
curl -X POST http://localhost:3000/api/scheduled-areas/123e4567-e89b-12d3-a456-426614174000/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### Toggling Favorite Status

```bash
curl -X PATCH http://localhost:3000/api/scheduled-areas/123e4567-e89b-12d3-a456-426614174000/favorite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "favorite": true
  }'
```

### Listing Favorite Areas

```bash
curl -X GET "http://localhost:3000/api/scheduled-areas?favorite=true&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- The `responsiblePersonId` must reference an existing person from the Person API
- Image uploads are limited to 5MB and must be in JPG, PNG, or GIF format
- Favorite areas are displayed in the top menu for quick access
- The `responsiblePerson` field in responses is only populated when explicitly requested via query parameters or when fetching a single area
- All timestamps are in ISO 8601 format (UTC)

