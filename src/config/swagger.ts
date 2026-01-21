import swaggerJsdoc from "swagger-jsdoc"
import config from "./env"

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${config.app_name} API`,
      version: "1.0.0",
      description: "RESTful API for Wearly Styles - Fashion Platform",
      contact: {
        name: "API Support",
        email: "support@wearly.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.swagger.apiVersion}/web`,
        description: "Development Server (Web)",
      },
      {
        url: `http://localhost:${config.port}/api/${config.swagger.apiVersion}/mobile`,
        description: "Development Server (Mobile)",
      },
      {
        url: `https://api.wearly.com/api/${config.swagger.apiVersion}/web`,
        description: "Production Server (Web)",
      },
      {
        url: `https://api.wearly.com/api/${config.swagger.apiVersion}/mobile`,
        description: "Production Server (Mobile)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Authorization header using the Bearer scheme",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["id", "email", "role"],
          properties: {
            id: {
              type: "integer",
              format: "int32",
              description: "User ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            role: {
              type: "string",
              enum: ["user", "seller", "admin"],
              description: "User role",
            },
            status: {
              type: "string",
              enum: ["active", "inactive", "suspended"],
              description: "User status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        Product: {
          type: "object",
          required: ["id", "name", "price", "userId"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Product ID",
            },
            name: {
              type: "string",
              description: "Product name",
            },
            description: {
              type: "string",
              description: "Product description",
            },
            price: {
              type: "number",
              format: "decimal",
              description: "Product price",
            },
            image: {
              type: "string",
              description: "Product image URL",
            },
            userId: {
              type: "string",
              format: "uuid",
              description: "ID of the seller",
            },
            status: {
              type: "string",
              enum: ["active", "inactive", "archived"],
              description: "Product status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              description: "Password (min 8 characters)",
            },
            fullName: {
              type: "string",
              description: "Full name",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            statusCode: {
              type: "integer",
            },
            message: {
              type: "string",
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                accessToken: {
                  type: "string",
                  description: "JWT access token",
                },
                refreshToken: {
                  type: "string",
                  description: "Refresh token",
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            statusCode: {
              type: "integer",
              example: 400,
            },
            message: {
              type: "string",
              example: "Bad Request",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/modules/*/*.route.ts"],
}

export const swaggerSpec = swaggerJsdoc(options)
