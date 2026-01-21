# Wearly Styles API Documentation

## Overview

Complete API documentation for Wearly Styles Backend API using Swagger UI (OpenAPI 3.0).

## Access Documentation

- **Development**: http://localhost:3000/api-docs
- **Production**: https://api.wearly.com/api-docs

## Authentication

All protected endpoints require JWT Bearer token in the Authorization header:

```
Authorization: Bearer {accessToken}
```

## API Versioning

Currently supporting API v1 with planned v2 enhancements.

### Base URLs

- Development: `http://localhost:3000/api/v1`
- Production: `https://api.wearly.com/api/v1`

## Endpoints

### Authentication

- `POST /mobile/auth/register` - Register new user (mobile only)
- `POST /auth/login` - Login and get tokens
- `POST /auth/logout` - Logout user
- `POST /auth/refresh-token` - Refresh access token

### Users

- `GET /users` - Get all users
- `GET /users/{id}` - Get user by ID
- `POST /users` - Create user (admin only)
- `PATCH /users/{id}` - Update user profile
- `DELETE /users/{id}` - Delete user (admin only)

## Response Format

All endpoints return responses in the following format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Handling

Errors follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Rate Limiting

- Global limit: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes per IP

## Default Credentials (Development)

After running `npm run db:seed`:

- Email: `admin@wearly.com`
- Password: `Admin@123`

## Interactive Testing

Visit `/api-docs` in your browser to:

- View all endpoints
- Test endpoints with Swagger UI
- View request/response schemas
- Try authorization flows
