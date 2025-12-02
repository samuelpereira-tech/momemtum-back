# Person API Documentation

This folder contains the API specification for managing persons and their photos.

## Overview

The Person API provides endpoints for creating, reading, updating, and deleting person records, as well as managing person photos.

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

### Create Person

**POST** `/api/persons`

Creates a new person with the provided information.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "11987654321",
  "cpf": "12345678901",
  "birthDate": "1990-01-15",
  "emergencyContact": "11987654322",
  "address": "Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567"
}
```

**Response (201 Created):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "11987654321",
  "cpf": "12345678901",
  "birthDate": "1990-01-15",
  "emergencyContact": "11987654322",
  "address": "Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567",
  "photoUrl": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Validation Rules:**
- `fullName`: Required, 3-255 characters
- `email`: Required, valid email format, must be unique
- `phone`: Required, 10-11 digits (numbers only, no formatting)
- `cpf`: Required, 11 digits (numbers only, no formatting), must be unique
- `birthDate`: Required, ISO 8601 date format (YYYY-MM-DD)
- `emergencyContact`: Required, 10-11 digits (numbers only, no formatting)
- `address`: Required, 10-500 characters

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication token
- `409 Conflict`: Email or CPF already exists
- `500 Internal Server Error`: Server error

---

### Upload Person Photo

**POST** `/api/persons/{id}/photo`

Uploads or updates a photo for a specific person.

**Parameters:**
- `id` (path, required): Person UUID

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `photo`
- File types: JPG, PNG, GIF
- Maximum file size: 5MB

**Example using cURL:**
```bash
curl -X POST \
  http://localhost:3000/api/persons/123e4567-e89b-12d3-a456-426614174000/photo \
  -H "Authorization: Bearer <your-access-token>" \
  -F "photo=@/path/to/image.jpg"
```

**Response (200 OK):**
```json
{
  "message": "Photo uploaded successfully",
  "photoUrl": "https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg",
  "personId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format or invalid file
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person not found
- `413 Payload Too Large`: File size exceeds 5MB
- `500 Internal Server Error`: Server error

---

### Delete Person Photo

**DELETE** `/api/persons/{id}/photo`

Removes the photo from a specific person.

**Parameters:**
- `id` (path, required): Person UUID

**Response (204 No Content):** Success, no response body

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Person not found or photo does not exist

---

### Get Person by ID

**GET** `/api/persons/{id}`

Retrieves a specific person by their ID.

**Parameters:**
- `id` (path, required): Person UUID

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "11987654321",
  "cpf": "12345678901",
  "birthDate": "1990-01-15",
  "emergencyContact": "11987654322",
  "address": "Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567",
  "photoUrl": "https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### List All Persons

**GET** `/api/persons`

Retrieves a paginated list of all persons.

**Query Parameters:**
- `page` (optional): Page number (default: 1, minimum: 1)
- `limit` (optional): Items per page (default: 10, minimum: 1, maximum: 100)

**Example:**
```
GET /api/persons?page=1&limit=10
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      ...
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

### Update Person

**PUT** `/api/persons/{id}`

Updates an existing person's information.

**Parameters:**
- `id` (path, required): Person UUID

**Request Body:** Same as Create Person, but all fields are optional

**Response (200 OK):** Updated person object (same format as Get Person)

---

### Delete Person

**DELETE** `/api/persons/{id}`

Deletes a person by their ID.

**Parameters:**
- `id` (path, required): Person UUID

**Response (204 No Content):** Success, no response body

---

## Data Formats

### Phone Number Format
- Send: Numbers only, 10-11 digits (e.g., `11987654321`)
- Display: Can be formatted on the client side (e.g., `(11) 98765-4321`)

### CPF Format
- Send: Numbers only, 11 digits (e.g., `12345678901`)
- Display: Can be formatted on the client side (e.g., `123.456.789-01`)

### Date Format
- ISO 8601 format: `YYYY-MM-DD` (e.g., `1990-01-15`)

---

## Example Workflow

1. **Create a person:**
   ```bash
   POST /api/persons
   ```

2. **Upload photo (optional):**
   ```bash
   POST /api/persons/{id}/photo
   ```

3. **Retrieve person:**
   ```bash
   GET /api/persons/{id}
   ```

---

## File Specification

- **api.json**: OpenAPI 3.0 specification file containing the complete API definition

