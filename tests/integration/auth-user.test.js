import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";

let server;
let baseUrl;
const testEmails = [];
const testCategoryIds = [];
const testProductIds = [];
const testOrderIds = [];

const createEmail = () => {
  const email = `integration-${randomUUID()}@example.test`;
  testEmails.push(email);
  return email;
};

const request = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: response.status, body: await response.json() };
};

const register = (email, password = "StrongPass123!") =>
  request("/auth/register", {
    method: "POST",
    body: { email, password, firstName: "Integration", lastName: "Test" },
  });

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: app.fetch });
  baseUrl = `http://127.0.0.1:${server.port}/api/v1`;
});

describe("API documentation", () => {
  test("serves Swagger UI and the OpenAPI document", async () => {
    const origin = baseUrl.replace("/api/v1", "");
    const [uiResponse, specResponse] = await Promise.all([
      fetch(`${origin}/api-docs/`),
      fetch(`${origin}/api-docs.json`),
    ]);
    const spec = await specResponse.json();

    expect(uiResponse.status).toBe(200);
    expect((await uiResponse.text()).includes("Shop Backend API Docs")).toBe(true);
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(26);
  });
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.category.deleteMany({
    where: { id: { in: testCategoryIds }, parentId: { not: null } },
  });
  await prisma.category.deleteMany({ where: { id: { in: testCategoryIds } } });
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
  await server.stop(true);
  await prisma.$disconnect();
});

describe("Authentication API", () => {
  test("rejects invalid registration input", async () => {
    const response = await request("/auth/register", {
      method: "POST",
      body: { email: "invalid", password: "short" },
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("registers a customer and rejects duplicate email", async () => {
    const email = createEmail();
    const first = await register(email);
    const duplicate = await register(email);

    expect(first.status).toBe(201);
    expect(first.body.data.user.role).toBe("CUSTOMER");
    expect(first.body.data.user.passwordHash).toBeUndefined();
    expect(duplicate.status).toBe(409);
  });

  test("logs in, reads profile, rotates refresh token, and logs out", async () => {
    const email = createEmail();
    await register(email);

    const login = await request("/auth/login", {
      method: "POST",
      body: { email, password: "StrongPass123!" },
    });
    expect(login.status).toBe(200);

    const { accessToken, refreshToken } = login.body.data.tokens;
    const profile = await request("/users/me", { token: accessToken });
    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe(email);

    const refresh = await request("/auth/refresh-token", {
      method: "POST",
      body: { refreshToken },
    });
    expect(refresh.status).toBe(200);

    const reused = await request("/auth/refresh-token", {
      method: "POST",
      body: { refreshToken },
    });
    expect(reused.status).toBe(401);

    const nextRefreshToken = refresh.body.data.refreshToken;
    const logout = await request("/auth/logout", {
      method: "POST",
      body: { refreshToken: nextRefreshToken },
    });
    expect(logout.status).toBe(200);

    const afterLogout = await request("/auth/refresh-token", {
      method: "POST",
      body: { refreshToken: nextRefreshToken },
    });
    expect(afterLogout.status).toBe(401);
  });
});

describe("User and address API", () => {
  test("updates profile, manages default addresses, and changes password", async () => {
    const email = createEmail();
    const registration = await register(email);
    const { accessToken, refreshToken } = registration.body.data.tokens;

    const updatedProfile = await request("/users/me", {
      method: "PATCH",
      token: accessToken,
      body: { firstName: "Updated", lastName: "Customer" },
    });
    expect(updatedProfile.status).toBe(200);
    expect(updatedProfile.body.data.firstName).toBe("Updated");

    const firstAddress = await request("/users/me/addresses", {
      method: "POST",
      token: accessToken,
      body: {
        recipientName: "Updated Customer",
        phone: "+84901234567",
        addressLine: "1 Nguyen Hue",
        ward: "Ben Nghe",
        district: "District 1",
        province: "Ho Chi Minh City",
      },
    });
    expect(firstAddress.status).toBe(201);
    expect(firstAddress.body.data.isDefault).toBe(true);

    const secondAddress = await request("/users/me/addresses", {
      method: "POST",
      token: accessToken,
      body: {
        recipientName: "Updated Customer",
        phone: "0907654321",
        addressLine: "2 Le Loi",
        ward: "Ben Thanh",
        district: "District 1",
        province: "Ho Chi Minh City",
      },
    });
    expect(secondAddress.status).toBe(201);
    expect(secondAddress.body.data.isDefault).toBe(false);

    const secondId = secondAddress.body.data.id;
    const setDefault = await request(`/users/me/addresses/${secondId}/default`, {
      method: "PATCH",
      token: accessToken,
    });
    expect(setDefault.status).toBe(200);
    expect(setDefault.body.data.isDefault).toBe(true);

    const addresses = await request("/users/me/addresses", {
      token: accessToken,
    });
    expect(addresses.status).toBe(200);
    expect(addresses.body.data).toHaveLength(2);
    expect(addresses.body.data.filter((address) => address.isDefault)).toHaveLength(1);

    const firstId = firstAddress.body.data.id;
    const updatedAddress = await request(`/users/me/addresses/${firstId}`, {
      method: "PATCH",
      token: accessToken,
      body: { addressLine: "10 Nguyen Hue" },
    });
    expect(updatedAddress.status).toBe(200);
    expect(updatedAddress.body.data.addressLine).toBe("10 Nguyen Hue");

    const otherEmail = createEmail();
    const otherRegistration = await register(otherEmail);
    const otherAccessToken = otherRegistration.body.data.tokens.accessToken;
    const forbiddenByOwnership = await request(
      `/users/me/addresses/${firstId}`,
      {
        method: "PATCH",
        token: otherAccessToken,
        body: { addressLine: "Unauthorized update" },
      },
    );
    expect(forbiddenByOwnership.status).toBe(404);

    const deletedAddress = await request(`/users/me/addresses/${firstId}`, {
      method: "DELETE",
      token: accessToken,
    });
    expect(deletedAddress.status).toBe(200);

    const addressesAfterDelete = await request("/users/me/addresses", {
      token: accessToken,
    });
    expect(addressesAfterDelete.body.data).toHaveLength(1);
    expect(addressesAfterDelete.body.data[0].id).toBe(secondId);
    expect(addressesAfterDelete.body.data[0].isDefault).toBe(true);

    const changedPassword = await request("/users/me/password", {
      method: "PATCH",
      token: accessToken,
      body: {
        currentPassword: "StrongPass123!",
        newPassword: "NewStrongPass456!",
      },
    });
    expect(changedPassword.status).toBe(200);

    const revokedRefresh = await request("/auth/refresh-token", {
      method: "POST",
      body: { refreshToken },
    });
    expect(revokedRefresh.status).toBe(401);

    const oldLogin = await request("/auth/login", {
      method: "POST",
      body: { email, password: "StrongPass123!" },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request("/auth/login", {
      method: "POST",
      body: { email, password: "NewStrongPass456!" },
    });
    expect(newLogin.status).toBe(200);
  });
});

describe("Category API", () => {
  test("enforces admin access and manages a category hierarchy", async () => {
    const customerEmail = createEmail();
    const customer = await register(customerEmail);
    const customerToken = customer.body.data.tokens.accessToken;

    const forbidden = await request("/admin/categories", {
      method: "POST",
      token: customerToken,
      body: { name: "Forbidden Category" },
    });
    expect(forbidden.status).toBe(403);

    const adminEmail = createEmail();
    await register(adminEmail);
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { roleId: adminRole.id },
    });

    const adminLogin = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "StrongPass123!" },
    });
    const adminToken = adminLogin.body.data.tokens.accessToken;
    expect(adminLogin.body.data.user.role).toBe("ADMIN");

    const suffix = randomUUID().slice(0, 8);
    const parent = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: {
        name: `Integration Category ${suffix}`,
        description: "Integration test parent category",
        sortOrder: 10,
      },
    });
    expect(parent.status).toBe(201);
    expect(parent.body.data.slug).toBe(`integration-category-${suffix}`);
    testCategoryIds.push(parent.body.data.id);

    const child = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: {
        name: `Integration Child ${suffix}`,
        parentId: parent.body.data.id,
      },
    });
    expect(child.status).toBe(201);
    expect(child.body.data.parentId).toBe(parent.body.data.id);
    testCategoryIds.push(child.body.data.id);

    const duplicate = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: { name: "Duplicate", slug: parent.body.data.slug },
    });
    expect(duplicate.status).toBe(409);

    const publicCategory = await request(`/categories/${parent.body.data.slug}`);
    expect(publicCategory.status).toBe(200);
    expect(publicCategory.body.data.children).toHaveLength(1);

    const publicTree = await request("/categories");
    const publicParent = publicTree.body.data.find(
      (category) => category.id === parent.body.data.id,
    );
    expect(publicParent.children).toHaveLength(1);

    const cycle = await request(`/admin/categories/${parent.body.data.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { parentId: child.body.data.id },
    });
    expect(cycle.status).toBe(400);

    const parentDeleteBlocked = await request(
      `/admin/categories/${parent.body.data.id}`,
      { method: "DELETE", token: adminToken },
    );
    expect(parentDeleteBlocked.status).toBe(409);

    const updatedChild = await request(
      `/admin/categories/${child.body.data.id}`,
      {
        method: "PATCH",
        token: adminToken,
        body: { name: `Updated Child ${suffix}`, isActive: false },
      },
    );
    expect(updatedChild.status).toBe(200);
    expect(updatedChild.body.data.isActive).toBe(false);

    const deleteChild = await request(`/admin/categories/${child.body.data.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    expect(deleteChild.status).toBe(200);
    testCategoryIds.splice(testCategoryIds.indexOf(child.body.data.id), 1);

    const deleteParent = await request(`/admin/categories/${parent.body.data.id}`, {
      method: "DELETE",
      token: adminToken,
    });
    expect(deleteParent.status).toBe(200);
    testCategoryIds.splice(testCategoryIds.indexOf(parent.body.data.id), 1);
  });
});

describe("Product catalog API", () => {
  test("manages products, images, variants, inventory, and public visibility", async () => {
    const customerEmail = createEmail();
    const customer = await register(customerEmail);
    const customerToken = customer.body.data.tokens.accessToken;
    const customerForbidden = await request("/admin/products", {
      method: "POST",
      token: customerToken,
      body: {},
    });
    expect(customerForbidden.status).toBe(403);

    const adminEmail = createEmail();
    await register(adminEmail);
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { roleId: adminRole.id },
    });
    const adminLogin = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "StrongPass123!" },
    });
    const adminToken = adminLogin.body.data.tokens.accessToken;

    const suffix = randomUUID().slice(0, 8);
    const category = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: { name: `Product Category ${suffix}` },
    });
    expect(category.status).toBe(201);
    testCategoryIds.push(category.body.data.id);

    const product = await request("/admin/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: `Integration Phone ${suffix}`,
        description: "Integration product",
        brand: "Codex",
        categoryId: category.body.data.id,
        images: [
          {
            url: `https://example.com/products/${suffix}-front.jpg`,
            altText: "Front view",
          },
        ],
        variants: [
          {
            name: "Black / 128GB",
            sku: `PHONE-${suffix}-BLACK`,
            attributes: { color: "Black", storage: "128GB" },
            price: "100000.00",
            compareAtPrice: "120000.00",
            quantity: 10,
          },
          {
            name: "White / 128GB",
            sku: `PHONE-${suffix}-WHITE`,
            attributes: { color: "White", storage: "128GB" },
            price: "110000.00",
            quantity: 5,
          },
        ],
      },
    });
    expect(product.status).toBe(201);
    expect(product.body.data.variants).toHaveLength(2);
    expect(product.body.data.images[0].isPrimary).toBe(true);
    testProductIds.push(product.body.data.id);

    const productId = product.body.data.id;
    const productSlug = product.body.data.slug;
    const [firstVariant, secondVariant] = product.body.data.variants;
    const originalImage = product.body.data.images[0];

    const publicList = await request(
      `/products?category=${category.body.data.slug}&minPrice=90000&maxPrice=105000&sort=price_asc`,
    );
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.items.some((item) => item.id === productId)).toBe(true);
    expect(publicList.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const publicDetail = await request(`/products/${productSlug}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.variants[0].inventory.availableQuantity).toBeGreaterThanOrEqual(0);

    const duplicateSku = await request(`/admin/products/${productId}/variants`, {
      method: "POST",
      token: adminToken,
      body: {
        name: "Duplicate SKU",
        sku: firstVariant.sku,
        price: "99000.00",
        quantity: 1,
      },
    });
    expect(duplicateSku.status).toBe(409);

    const updatedVariant = await request(
      `/admin/products/${productId}/variants/${firstVariant.id}`,
      {
        method: "PATCH",
        token: adminToken,
        body: { price: "95000.00", compareAtPrice: "115000.00" },
      },
    );
    expect(updatedVariant.status).toBe(200);

    const inventory = await request(
      `/admin/products/${productId}/variants/${firstVariant.id}/inventory`,
      {
        method: "PATCH",
        token: adminToken,
        body: { quantity: 25 },
      },
    );
    expect(inventory.status).toBe(200);
    expect(inventory.body.data.availableQuantity).toBe(25);

    const secondImage = await request(`/admin/products/${productId}/images`, {
      method: "POST",
      token: adminToken,
      body: {
        url: `https://example.com/products/${suffix}-back.jpg`,
        altText: "Back view",
        isPrimary: true,
      },
    });
    expect(secondImage.status).toBe(201);
    expect(secondImage.body.data.isPrimary).toBe(true);

    const productAdmin = await request(`/admin/products/${productId}`, {
      token: adminToken,
    });
    expect(productAdmin.status).toBe(200);
    expect(
      productAdmin.body.data.images.filter((image) => image.isPrimary),
    ).toHaveLength(1);
    expect(Number(productAdmin.body.data.minPrice)).toBe(95000);

    const deletePrimaryImage = await request(
      `/admin/products/${productId}/images/${secondImage.body.data.id}`,
      { method: "DELETE", token: adminToken },
    );
    expect(deletePrimaryImage.status).toBe(200);

    const productAfterImageDelete = await request(`/admin/products/${productId}`, {
      token: adminToken,
    });
    const replacementImage = productAfterImageDelete.body.data.images.find(
      (image) => image.id === originalImage.id,
    );
    expect(replacementImage.isPrimary).toBe(true);

    const archiveSecondVariant = await request(
      `/admin/products/${productId}/variants/${secondVariant.id}`,
      { method: "DELETE", token: adminToken },
    );
    expect(archiveSecondVariant.status).toBe(200);

    const archiveLastVariant = await request(
      `/admin/products/${productId}/variants/${firstVariant.id}`,
      { method: "DELETE", token: adminToken },
    );
    expect(archiveLastVariant.status).toBe(409);

    const archiveProduct = await request(`/admin/products/${productId}`, {
      method: "DELETE",
      token: adminToken,
    });
    expect(archiveProduct.status).toBe(200);

    const archivedPublicProduct = await request(`/products/${productSlug}`);
    expect(archivedPublicProduct.status).toBe(404);

    const categoryDeleteBlocked = await request(
      `/admin/categories/${category.body.data.id}`,
      { method: "DELETE", token: adminToken },
    );
    expect(categoryDeleteBlocked.status).toBe(409);
  });
});

describe("Cart API", () => {
  test("enforces ownership and stock while managing cart items", async () => {
    const unauthenticated = await request("/cart");
    expect(unauthenticated.status).toBe(401);

    const adminEmail = createEmail();
    await register(adminEmail);
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { roleId: adminRole.id },
    });
    const adminLogin = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "StrongPass123!" },
    });
    const adminToken = adminLogin.body.data.tokens.accessToken;

    const suffix = randomUUID().slice(0, 8);
    const category = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: { name: `Cart Category ${suffix}` },
    });
    testCategoryIds.push(category.body.data.id);

    const product = await request("/admin/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: `Cart Product ${suffix}`,
        categoryId: category.body.data.id,
        variants: [
          {
            name: "Default",
            sku: `CART-${suffix}`,
            price: "125000.00",
            quantity: 3,
          },
        ],
      },
    });
    expect(product.status).toBe(201);
    testProductIds.push(product.body.data.id);
    const variantId = product.body.data.variants[0].id;

    const customerEmail = createEmail();
    const customer = await register(customerEmail);
    const customerToken = customer.body.data.tokens.accessToken;
    const otherEmail = createEmail();
    const otherCustomer = await register(otherEmail);
    const otherToken = otherCustomer.body.data.tokens.accessToken;

    const emptyCart = await request("/cart", { token: customerToken });
    expect(emptyCart.status).toBe(200);
    expect(emptyCart.body.data.summary.itemCount).toBe(0);

    const added = await request("/cart/items", {
      method: "POST",
      token: customerToken,
      body: { variantId, quantity: 2 },
    });
    expect(added.status).toBe(201);
    expect(added.body.data.summary.totalQuantity).toBe(2);
    expect(added.body.data.summary.total).toBe("250000.00");
    expect(added.body.data.items[0].isAvailable).toBe(true);
    const itemId = added.body.data.items[0].id;

    const exceedsOnAdd = await request("/cart/items", {
      method: "POST",
      token: customerToken,
      body: { variantId, quantity: 2 },
    });
    expect(exceedsOnAdd.status).toBe(409);

    const updated = await request(`/cart/items/${itemId}`, {
      method: "PATCH",
      token: customerToken,
      body: { quantity: 3 },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.summary.total).toBe("375000.00");

    const ownershipBlocked = await request(`/cart/items/${itemId}`, {
      method: "PATCH",
      token: otherToken,
      body: { quantity: 1 },
    });
    expect(ownershipBlocked.status).toBe(404);

    const exceedsOnUpdate = await request(`/cart/items/${itemId}`, {
      method: "PATCH",
      token: customerToken,
      body: { quantity: 4 },
    });
    expect(exceedsOnUpdate.status).toBe(409);

    const deleted = await request(`/cart/items/${itemId}`, {
      method: "DELETE",
      token: customerToken,
    });
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.summary.itemCount).toBe(0);

    await request("/cart/items", {
      method: "POST",
      token: customerToken,
      body: { variantId, quantity: 1 },
    });
    const cleared = await request("/cart", {
      method: "DELETE",
      token: customerToken,
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.summary.itemCount).toBe(0);
  });
});

describe("Order API", () => {
  test("creates orders atomically, reserves stock, clears cart, and manages status", async () => {
    const adminEmail = createEmail();
    await register(adminEmail);
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { roleId: adminRole.id },
    });
    const adminLogin = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "StrongPass123!" },
    });
    const adminToken = adminLogin.body.data.tokens.accessToken;

    const suffix = randomUUID().slice(0, 8);
    const category = await request("/admin/categories", {
      method: "POST",
      token: adminToken,
      body: { name: `Order Category ${suffix}` },
    });
    testCategoryIds.push(category.body.data.id);

    const product = await request("/admin/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: `Order Product ${suffix}`,
        categoryId: category.body.data.id,
        variants: [{ name: "Default", sku: `ORDER-${suffix}`, price: "200000.00", quantity: 5 }],
      },
    });
    expect(product.status).toBe(201);
    testProductIds.push(product.body.data.id);
    const variantId = product.body.data.variants[0].id;

    const customerEmail = createEmail();
    const customer = await register(customerEmail);
    const customerToken = customer.body.data.tokens.accessToken;
    const address = await request("/users/me/addresses", {
      method: "POST",
      token: customerToken,
      body: {
        recipientName: "Order Customer",
        phone: "0901234567",
        addressLine: "123 Nguyen Hue",
        ward: "Ben Nghe",
        district: "District 1",
        province: "Ho Chi Minh City",
      },
    });
    const addressId = address.body.data.id;

    await request("/cart/items", {
      method: "POST",
      token: customerToken,
      body: { variantId, quantity: 2 },
    });
    const firstOrder = await request("/orders", {
      method: "POST",
      token: customerToken,
      body: { addressId, note: "Please call before delivery" },
    });
    expect(firstOrder.status).toBe(201);
    expect(firstOrder.body.data.status).toBe("PENDING");
    expect(firstOrder.body.data.items[0].productName).toBe(`Order Product ${suffix}`);
    expect(firstOrder.body.data.items[0].unitPrice).toBe("200000");
    expect(firstOrder.body.data.total).toBe("400000");
    testOrderIds.push(firstOrder.body.data.id);

    const emptyCart = await request("/cart", { token: customerToken });
    expect(emptyCart.body.data.summary.itemCount).toBe(0);
    const reservedAfterCreate = await prisma.inventory.findUnique({ where: { variantId } });
    expect(reservedAfterCreate.reservedQuantity).toBe(2);

    const ownOrders = await request("/orders", { token: customerToken });
    expect(ownOrders.status).toBe(200);
    expect(ownOrders.body.data.items[0].id).toBe(firstOrder.body.data.id);

    const cancelled = await request(`/orders/${firstOrder.body.data.id}/cancel`, {
      method: "POST",
      token: customerToken,
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");
    const reservedAfterCancel = await prisma.inventory.findUnique({ where: { variantId } });
    expect(reservedAfterCancel.reservedQuantity).toBe(0);

    await request("/cart/items", {
      method: "POST",
      token: customerToken,
      body: { variantId, quantity: 3 },
    });
    const secondOrder = await request("/orders", {
      method: "POST",
      token: customerToken,
      body: { addressId },
    });
    expect(secondOrder.status).toBe(201);
    testOrderIds.push(secondOrder.body.data.id);

    const confirmed = await request(`/admin/orders/${secondOrder.body.data.id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "CONFIRMED" },
    });
    expect(confirmed.status).toBe(200);
    const processing = await request(`/admin/orders/${secondOrder.body.data.id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "PROCESSING" },
    });
    expect(processing.status).toBe(200);

    const lateCancel = await request(`/orders/${secondOrder.body.data.id}/cancel`, {
      method: "POST",
      token: customerToken,
    });
    expect(lateCancel.status).toBe(409);

    const shipped = await request(`/admin/orders/${secondOrder.body.data.id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "SHIPPED" },
    });
    expect(shipped.status).toBe(200);
    const delivered = await request(`/admin/orders/${secondOrder.body.data.id}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "DELIVERED" },
    });
    expect(delivered.status).toBe(200);

    const adminOrders = await request("/admin/orders?status=DELIVERED", {
      token: adminToken,
    });
    expect(adminOrders.status).toBe(200);
    expect(adminOrders.body.data.items.some((order) => order.id === secondOrder.body.data.id)).toBe(true);
  });
});
