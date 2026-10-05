const bearerSecurity = [{ bearerAuth: [] }];

const jsonRequest = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});

const success = (description, data) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", enum: [true] },
          message: { type: "string" },
          ...(data ? { data } : {}),
        },
      },
    },
  },
});

const errorResponse = (description) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
  },
});

const commonErrors = {
  400: errorResponse("Invalid request"),
  404: errorResponse("Resource not found"),
};

const protectedErrors = {
  ...commonErrors,
  401: errorResponse("Authentication required or token invalid"),
};

const adminErrors = {
  ...protectedErrors,
  403: errorResponse("Administrator role required"),
};

const pathParameter = (name, description = `${name} identifier`) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
});

const paginationParameters = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
];

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Shop Backend API",
    version: "1.0.0",
    description:
      "REST API for authentication, users, catalog administration, inventory, and shopping carts.",
  },
  servers: [{ url: "/api/v1", description: "Current server" }],
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "Users" },
    { name: "Addresses" },
    { name: "Categories" },
    { name: "Products" },
    { name: "Cart" },
    { name: "Orders" },
    { name: "Admin Orders" },
    { name: "Admin Categories" },
    { name: "Admin Products" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: { 200: success("Server is running") },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a customer account",
        requestBody: jsonRequest({ $ref: "#/components/schemas/RegisterRequest" }),
        responses: {
          201: success("Registration successful", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponse("Validation failed"),
          409: errorResponse("Email already registered"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in",
        requestBody: jsonRequest({ $ref: "#/components/schemas/LoginRequest" }),
        responses: {
          200: success("Login successful", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponse("Validation failed"),
          401: errorResponse("Invalid credentials or inactive account"),
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Rotate a refresh token",
        requestBody: jsonRequest({ $ref: "#/components/schemas/RefreshTokenRequest" }),
        responses: {
          200: success("Token refreshed", { $ref: "#/components/schemas/TokenPair" }),
          400: errorResponse("Validation failed"),
          401: errorResponse("Refresh token invalid, expired, revoked, or already used"),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Revoke a refresh token",
        requestBody: jsonRequest({ $ref: "#/components/schemas/RefreshTokenRequest" }),
        responses: {
          200: success("Logout successful"),
          400: errorResponse("Validation failed"),
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get the current user profile",
        security: bearerSecurity,
        responses: {
          200: success("Profile retrieved", { $ref: "#/components/schemas/User" }),
          ...protectedErrors,
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update the current user profile",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/UpdateProfileRequest" }),
        responses: {
          200: success("Profile updated", { $ref: "#/components/schemas/User" }),
          ...protectedErrors,
        },
      },
    },
    "/users/me/password": {
      patch: {
        tags: ["Users"],
        summary: "Change password and revoke refresh sessions",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/ChangePasswordRequest" }),
        responses: {
          200: success("Password changed"),
          400: errorResponse("Validation failed"),
          401: errorResponse("Current password incorrect or access token invalid"),
          404: errorResponse("User not found"),
        },
      },
    },
    "/users/me/addresses": {
      get: {
        tags: ["Addresses"],
        summary: "List current user addresses",
        security: bearerSecurity,
        responses: {
          200: success("Addresses retrieved", {
            type: "array",
            items: { $ref: "#/components/schemas/Address" },
          }),
          ...protectedErrors,
        },
      },
      post: {
        tags: ["Addresses"],
        summary: "Create an address",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/AddressInput" }),
        responses: {
          201: success("Address created", { $ref: "#/components/schemas/Address" }),
          ...protectedErrors,
        },
      },
    },
    "/users/me/addresses/{id}": {
      parameters: [pathParameter("id", "Address identifier")],
      patch: {
        tags: ["Addresses"],
        summary: "Update an owned address",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/AddressInput" }),
        responses: {
          200: success("Address updated", { $ref: "#/components/schemas/Address" }),
          ...protectedErrors,
        },
      },
      delete: {
        tags: ["Addresses"],
        summary: "Delete an owned address",
        security: bearerSecurity,
        responses: { 200: success("Address deleted"), ...protectedErrors },
      },
    },
    "/users/me/addresses/{id}/default": {
      patch: {
        tags: ["Addresses"],
        summary: "Set the default address",
        security: bearerSecurity,
        parameters: [pathParameter("id", "Address identifier")],
        responses: {
          200: success("Default address updated", { $ref: "#/components/schemas/Address" }),
          ...protectedErrors,
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "List active categories as a tree",
        responses: {
          200: success("Categories retrieved", {
            type: "array",
            items: { $ref: "#/components/schemas/Category" },
          }),
        },
      },
    },
    "/categories/{slug}": {
      get: {
        tags: ["Categories"],
        summary: "Get an active category by slug",
        parameters: [pathParameter("slug", "Category slug")],
        responses: {
          200: success("Category retrieved", { $ref: "#/components/schemas/Category" }),
          404: errorResponse("Category not found"),
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Search and filter active products",
        parameters: [
          ...paginationParameters,
          { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
          { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["newest", "price_asc", "price_desc", "name_asc"],
              default: "newest",
            },
          },
        ],
        responses: {
          200: success("Products retrieved", { $ref: "#/components/schemas/ProductList" }),
          400: errorResponse("Invalid filters"),
        },
      },
    },
    "/products/{slug}": {
      get: {
        tags: ["Products"],
        summary: "Get an active product by slug",
        parameters: [pathParameter("slug", "Product slug")],
        responses: {
          200: success("Product retrieved", { $ref: "#/components/schemas/Product" }),
          404: errorResponse("Product not found"),
        },
      },
    },
    "/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get or create the current user cart",
        security: bearerSecurity,
        responses: {
          200: success("Cart retrieved", { $ref: "#/components/schemas/Cart" }),
          ...protectedErrors,
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear the current user cart",
        security: bearerSecurity,
        responses: {
          200: success("Cart cleared", { $ref: "#/components/schemas/Cart" }),
          ...protectedErrors,
        },
      },
    },
    "/cart/items": {
      post: {
        tags: ["Cart"],
        summary: "Add a product variant to the cart",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/AddCartItemRequest" }),
        responses: {
          201: success("Item added", { $ref: "#/components/schemas/Cart" }),
          ...protectedErrors,
          409: errorResponse("Requested quantity exceeds available stock"),
        },
      },
    },
    "/cart/items/{itemId}": {
      parameters: [pathParameter("itemId", "Cart item identifier")],
      patch: {
        tags: ["Cart"],
        summary: "Set cart item quantity",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/CartQuantityRequest" }),
        responses: {
          200: success("Cart item updated", { $ref: "#/components/schemas/Cart" }),
          ...protectedErrors,
          409: errorResponse("Requested quantity exceeds available stock"),
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Delete an owned cart item",
        security: bearerSecurity,
        responses: {
          200: success("Cart item deleted", { $ref: "#/components/schemas/Cart" }),
          ...protectedErrors,
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"], summary: "List current user orders", security: bearerSecurity,
        parameters: [
          ...paginationParameters,
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/OrderStatus" } },
        ],
        responses: { 200: success("Orders retrieved", { $ref: "#/components/schemas/OrderList" }), ...protectedErrors },
      },
      post: {
        tags: ["Orders"], summary: "Create an order from the current cart", security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/CreateOrderRequest" }),
        responses: { 201: success("Order created", { $ref: "#/components/schemas/Order" }), ...protectedErrors, 409: errorResponse("Cart empty or stock unavailable") },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"], summary: "Get an owned order", security: bearerSecurity,
        parameters: [pathParameter("id", "Order identifier")],
        responses: { 200: success("Order retrieved", { $ref: "#/components/schemas/Order" }), ...protectedErrors },
      },
    },
    "/orders/{id}/cancel": {
      post: {
        tags: ["Orders"], summary: "Cancel a pending or confirmed order", security: bearerSecurity,
        parameters: [pathParameter("id", "Order identifier")],
        responses: { 200: success("Order cancelled", { $ref: "#/components/schemas/Order" }), ...protectedErrors, 409: errorResponse("Order cannot be cancelled") },
      },
    },
    "/admin/orders": {
      get: {
        tags: ["Admin Orders"], summary: "List all orders", security: bearerSecurity,
        parameters: [...paginationParameters, { name: "status", in: "query", schema: { $ref: "#/components/schemas/OrderStatus" } }],
        responses: { 200: success("Orders retrieved", { $ref: "#/components/schemas/OrderList" }), ...adminErrors },
      },
    },
    "/admin/orders/{id}": {
      get: {
        tags: ["Admin Orders"], summary: "Get any order", security: bearerSecurity,
        parameters: [pathParameter("id", "Order identifier")],
        responses: { 200: success("Order retrieved", { $ref: "#/components/schemas/Order" }), ...adminErrors },
      },
    },
    "/admin/orders/{id}/status": {
      patch: {
        tags: ["Admin Orders"], summary: "Change order status", security: bearerSecurity,
        parameters: [pathParameter("id", "Order identifier")],
        requestBody: jsonRequest({ type: "object", required: ["status"], properties: { status: { $ref: "#/components/schemas/OrderStatus" } } }),
        responses: { 200: success("Order status updated", { $ref: "#/components/schemas/Order" }), ...adminErrors, 409: errorResponse("Invalid status transition") },
      },
    },
    "/admin/categories": {
      get: {
        tags: ["Admin Categories"],
        summary: "List all categories",
        security: bearerSecurity,
        responses: {
          200: success("Categories retrieved", {
            type: "array",
            items: { $ref: "#/components/schemas/Category" },
          }),
          ...adminErrors,
        },
      },
      post: {
        tags: ["Admin Categories"],
        summary: "Create a category",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/CategoryInput" }),
        responses: {
          201: success("Category created", { $ref: "#/components/schemas/Category" }),
          ...adminErrors,
          409: errorResponse("Slug already exists"),
        },
      },
    },
    "/admin/categories/{id}": {
      parameters: [pathParameter("id", "Category identifier")],
      patch: {
        tags: ["Admin Categories"],
        summary: "Update a category",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/CategoryInput" }),
        responses: {
          200: success("Category updated", { $ref: "#/components/schemas/Category" }),
          ...adminErrors,
          409: errorResponse("Slug already exists"),
        },
      },
      delete: {
        tags: ["Admin Categories"],
        summary: "Delete an empty category",
        security: bearerSecurity,
        responses: {
          200: success("Category deleted"),
          ...adminErrors,
          409: errorResponse("Category has children or products"),
        },
      },
    },
    "/admin/products": {
      get: {
        tags: ["Admin Products"],
        summary: "List all products",
        security: bearerSecurity,
        parameters: [
          ...paginationParameters,
          { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          200: success("Products retrieved", { $ref: "#/components/schemas/ProductList" }),
          ...adminErrors,
        },
      },
      post: {
        tags: ["Admin Products"],
        summary: "Create a product with variants and images",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/CreateProductRequest" }),
        responses: {
          201: success("Product created", { $ref: "#/components/schemas/Product" }),
          ...adminErrors,
          409: errorResponse("Slug or SKU already exists"),
        },
      },
    },
    "/admin/products/{id}": {
      parameters: [pathParameter("id", "Product identifier")],
      get: {
        tags: ["Admin Products"],
        summary: "Get a product for administration",
        security: bearerSecurity,
        responses: {
          200: success("Product retrieved", { $ref: "#/components/schemas/Product" }),
          ...adminErrors,
        },
      },
      patch: {
        tags: ["Admin Products"],
        summary: "Update product details",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/UpdateProductRequest" }),
        responses: {
          200: success("Product updated", { $ref: "#/components/schemas/Product" }),
          ...adminErrors,
          409: errorResponse("Slug already exists"),
        },
      },
      delete: {
        tags: ["Admin Products"],
        summary: "Archive a product",
        security: bearerSecurity,
        responses: { 200: success("Product archived"), ...adminErrors },
      },
    },
    "/admin/products/{id}/images": {
      post: {
        tags: ["Admin Products"],
        summary: "Add a product image",
        security: bearerSecurity,
        parameters: [pathParameter("id", "Product identifier")],
        requestBody: jsonRequest({ $ref: "#/components/schemas/ProductImageInput" }),
        responses: {
          201: success("Product image created", { $ref: "#/components/schemas/ProductImage" }),
          ...adminErrors,
        },
      },
    },
    "/admin/products/{productId}/images/{imageId}": {
      parameters: [
        pathParameter("productId", "Product identifier"),
        pathParameter("imageId", "Product image identifier"),
      ],
      patch: {
        tags: ["Admin Products"],
        summary: "Update a product image",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/ProductImageInput" }),
        responses: {
          200: success("Product image updated", { $ref: "#/components/schemas/ProductImage" }),
          ...adminErrors,
        },
      },
      delete: {
        tags: ["Admin Products"],
        summary: "Delete a product image",
        security: bearerSecurity,
        responses: { 200: success("Product image deleted"), ...adminErrors },
      },
    },
    "/admin/products/{id}/variants": {
      post: {
        tags: ["Admin Products"],
        summary: "Add a product variant",
        security: bearerSecurity,
        parameters: [pathParameter("id", "Product identifier")],
        requestBody: jsonRequest({ $ref: "#/components/schemas/ProductVariantInput" }),
        responses: {
          201: success("Product variant created", { $ref: "#/components/schemas/ProductVariant" }),
          ...adminErrors,
          409: errorResponse("SKU already exists"),
        },
      },
    },
    "/admin/products/{productId}/variants/{variantId}": {
      parameters: [
        pathParameter("productId", "Product identifier"),
        pathParameter("variantId", "Product variant identifier"),
      ],
      patch: {
        tags: ["Admin Products"],
        summary: "Update a product variant",
        security: bearerSecurity,
        requestBody: jsonRequest({ $ref: "#/components/schemas/ProductVariantInput" }),
        responses: {
          200: success("Product variant updated", { $ref: "#/components/schemas/ProductVariant" }),
          ...adminErrors,
          409: errorResponse("SKU conflict or last active variant"),
        },
      },
      delete: {
        tags: ["Admin Products"],
        summary: "Archive a product variant",
        security: bearerSecurity,
        responses: {
          200: success("Product variant archived", { $ref: "#/components/schemas/ProductVariant" }),
          ...adminErrors,
          409: errorResponse("Cannot archive the last active variant"),
        },
      },
    },
    "/admin/products/{productId}/variants/{variantId}/inventory": {
      patch: {
        tags: ["Admin Products"],
        summary: "Set physical inventory quantity",
        security: bearerSecurity,
        parameters: [
          pathParameter("productId", "Product identifier"),
          pathParameter("variantId", "Product variant identifier"),
        ],
        requestBody: jsonRequest({
          type: "object",
          required: ["quantity"],
          properties: { quantity: { type: "integer", minimum: 0, maximum: 1000000 } },
        }),
        responses: {
          200: success("Inventory updated", { $ref: "#/components/schemas/Inventory" }),
          ...adminErrors,
          409: errorResponse("Quantity is lower than reserved quantity"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          details: { nullable: true },
        },
      },
      TokenPair: {
        type: "object",
        required: ["accessToken", "refreshToken"],
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] },
          role: { type: "string", enum: ["CUSTOMER", "ADMIN"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResult: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          tokens: { $ref: "#/components/schemas/TokenPair" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "customer@example.com" },
          password: { type: "string", format: "password", minLength: 8, maxLength: 72 },
          firstName: { type: "string", maxLength: 100 },
          lastName: { type: "string", maxLength: 100 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@shop.test" },
          password: { type: "string", format: "password", example: "Admin@123456" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
      UpdateProfileRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          firstName: { type: "string", maxLength: 100 },
          lastName: { type: "string", maxLength: 100 },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", format: "password", minLength: 8 },
          newPassword: { type: "string", format: "password", minLength: 8 },
        },
      },
      AddressInput: {
        type: "object",
        properties: {
          recipientName: { type: "string", maxLength: 100 },
          phone: { type: "string", maxLength: 20 },
          addressLine: { type: "string", maxLength: 255 },
          ward: { type: "string", maxLength: 100 },
          district: { type: "string", maxLength: 100 },
          province: { type: "string", maxLength: 100 },
          postalCode: { type: "string", maxLength: 20 },
          isDefault: { type: "boolean" },
        },
      },
      Address: {
        allOf: [
          { $ref: "#/components/schemas/AddressInput" },
          {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      CategoryInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          slug: { type: "string", maxLength: 120 },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", format: "uri", nullable: true },
          parentId: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          sortOrder: { type: "integer", minimum: 0 },
        },
      },
      Category: {
        allOf: [
          { $ref: "#/components/schemas/CategoryInput" },
          {
            type: "object",
            properties: {
              id: { type: "string" },
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/Category" },
              },
            },
          },
        ],
      },
      ProductImageInput: {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          altText: { type: "string", nullable: true },
          sortOrder: { type: "integer", minimum: 0 },
          isPrimary: { type: "boolean" },
        },
      },
      ProductImage: {
        allOf: [
          { $ref: "#/components/schemas/ProductImageInput" },
          { type: "object", properties: { id: { type: "string" } } },
        ],
      },
      Inventory: {
        type: "object",
        properties: {
          id: { type: "string" },
          variantId: { type: "string" },
          quantity: { type: "integer" },
          reservedQuantity: { type: "integer" },
          availableQuantity: { type: "integer" },
        },
      },
      ProductVariantInput: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 160 },
          sku: { type: "string", maxLength: 100 },
          attributes: { type: "object", additionalProperties: { type: "string" } },
          price: { type: "number", minimum: 0, example: 15990000 },
          compareAtPrice: { type: "number", nullable: true },
          quantity: { type: "integer", minimum: 0 },
          isActive: { type: "boolean" },
        },
      },
      ProductVariant: {
        allOf: [
          { $ref: "#/components/schemas/ProductVariantInput" },
          {
            type: "object",
            properties: {
              id: { type: "string" },
              inventory: { $ref: "#/components/schemas/Inventory" },
            },
          },
        ],
      },
      UpdateProductRequest: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 160 },
          slug: { type: "string", maxLength: 180 },
          description: { type: "string", nullable: true },
          brand: { type: "string", nullable: true },
          categoryId: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      CreateProductRequest: {
        allOf: [
          { $ref: "#/components/schemas/UpdateProductRequest" },
          {
            type: "object",
            required: ["name", "categoryId", "variants"],
            properties: {
              images: {
                type: "array",
                items: { $ref: "#/components/schemas/ProductImageInput" },
              },
              variants: {
                type: "array",
                minItems: 1,
                items: { $ref: "#/components/schemas/ProductVariantInput" },
              },
            },
          },
        ],
      },
      Product: {
        allOf: [
          { $ref: "#/components/schemas/UpdateProductRequest" },
          {
            type: "object",
            properties: {
              id: { type: "string" },
              minPrice: { type: "string" },
              maxPrice: { type: "string" },
              category: { $ref: "#/components/schemas/Category" },
              images: {
                type: "array",
                items: { $ref: "#/components/schemas/ProductImage" },
              },
              variants: {
                type: "array",
                items: { $ref: "#/components/schemas/ProductVariant" },
              },
            },
          },
        ],
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      ProductList: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Product" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      AddCartItemRequest: {
        type: "object",
        required: ["variantId", "quantity"],
        properties: {
          variantId: { type: "string" },
          quantity: { type: "integer", minimum: 1, maximum: 99 },
        },
      },
      CartQuantityRequest: {
        type: "object",
        required: ["quantity"],
        properties: { quantity: { type: "integer", minimum: 1, maximum: 99 } },
      },
      CartItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          quantity: { type: "integer" },
          unitPrice: { type: "string" },
          subtotal: { type: "string" },
          isAvailable: { type: "boolean" },
          variant: { $ref: "#/components/schemas/ProductVariant" },
          product: { $ref: "#/components/schemas/Product" },
        },
      },
      Cart: {
        type: "object",
        properties: {
          id: { type: "string" },
          items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
          summary: {
            type: "object",
            properties: {
              itemCount: { type: "integer" },
              totalQuantity: { type: "integer" },
              total: { type: "string" },
            },
          },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OrderStatus: { type: "string", enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] },
      CreateOrderRequest: {
        type: "object", required: ["addressId"],
        properties: { addressId: { type: "string" }, note: { type: "string", nullable: true, maxLength: 500 } },
      },
      OrderItem: {
        type: "object",
        properties: { id: { type: "string" }, variantId: { type: "string", nullable: true }, productName: { type: "string" }, variantName: { type: "string" }, sku: { type: "string" }, unitPrice: { type: "string" }, quantity: { type: "integer" }, subtotal: { type: "string" } },
      },
      Order: {
        type: "object",
        properties: { id: { type: "string" }, orderNumber: { type: "string" }, userId: { type: "string" }, status: { $ref: "#/components/schemas/OrderStatus" }, subtotal: { type: "string" }, shippingFee: { type: "string" }, total: { type: "string" }, recipientName: { type: "string" }, phone: { type: "string" }, addressLine: { type: "string" }, ward: { type: "string" }, district: { type: "string" }, province: { type: "string" }, postalCode: { type: "string", nullable: true }, note: { type: "string", nullable: true }, items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
      },
      OrderList: {
        type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Order" } }, pagination: { $ref: "#/components/schemas/Pagination" } },
      },
    },
  },
};
