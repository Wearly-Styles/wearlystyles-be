# Wearly Styles Backend API

Enterprise-level REST API built with Express.js, TypeScript, and Prisma.

## Project Structure

```
wearly-styles-be/
  src/
    app.ts                  # Express app initialization
    server.ts               # Server entry point
    api/                    # API versioning (v1, v2)
    common/                 # Shared utilities and interfaces
      constants/
      enums/
      errors/
      interfaces/
      middleware/
      repositories/
      responses/
      utils/
    config/                 # Configuration files
    helpers/                # Helper functions
    modules/                # Business modules (Auth, User, Prisma)
      auth/
      user/
      prisma/
    validations/            # Request validators (Zod)
  prisma/
    migrations/             # Prisma migrations
    seed/                   # Prisma seed scripts
    schema.prisma
  docker/
    Dockerfile
  docker-compose.yml
  logs/
  .env.example
  package.json
  tsconfig.json
  README.md
```

## Prerequisites

- Node.js 16+
- PostgreSQL 13+
- Redis (optional, for queues)

## Installation

### 1. Clone the repository and install dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

For Docker Compose, the default configuration uses `.env.example` so you can run containers without creating a local `.env`.

### 3. Database Setup

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or manually create PostgreSQL database
createdb wearly_styles
```

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Start the server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Visit `http://localhost:3000/health` to verify the server is running.

## API Endpoints

### Authentication

- `POST /api/v1/web/auth/register` - Register new user
- `POST /api/v1/web/auth/login` - Login user
- `POST /api/v1/web/auth/logout` - Logout user
- `POST /api/v1/web/auth/refresh-token` - Refresh access token

### Users

- `GET /api/v1/web/users` - Get all users
- `GET /api/v1/web/users/:id` - Get user by ID
- `POST /api/v1/web/users` - Create new user (Admin only)
- `PATCH /api/v1/web/users/:id` - Update user
- `DELETE /api/v1/web/users/:id` - Delete user (Admin only)

## Features

- ✅ TypeScript for type safety
- ✅ Express.js web framework
- ✅ Prisma for database management
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Request validation with Zod
- ✅ Rate limiting
- ✅ Error handling middleware
- ✅ Request logging with Winston
- ✅ API versioning (v1, v2)
- ✅ Docker support
- ✅ Password hashing with bcryptjs

## Middleware

- **Auth Middleware**: Validates JWT tokens
- **Role Middleware**: Enforces role-based access
- **Validation Middleware**: Validates request data
- **Error Middleware**: Global error handling
- **Rate Limit Middleware**: Prevents abuse
- **CORS Middleware**: Cross-origin resource sharing
- **Request ID Middleware**: Tracks requests

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "error": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Development

### Generate database migration

```bash
npm run db:migrate -- --name MigrationName
```

### Run linter

```bash
npm run lint
npm run lint:fix
```

### Seed database

```bash
npm run db:seed
```

## Testing

Tests are located in `src/tests/`. Run tests with:

```bash
npm test
```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t wearly-styles-be:latest .
docker run -p 3000:3000 wearly-styles-be:latest
```

Or use Docker Compose:

```bash
docker-compose up -d --build
```

Run database migrations in the API container:

```bash
docker-compose exec api npm run db:migrate
```

Optional seed data:

```bash
docker-compose exec api npm run db:seed
```

## Environment Variables

See `.env.example` for all available environment variables.

## Contributing

1. Create a feature branch
2. Commit changes
3. Push to branch
4. Create Pull Request

## License

ISC

