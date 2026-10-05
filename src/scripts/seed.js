import "dotenv/config";
import { prisma } from "../database/prisma.js";
import { hashPassword } from "../utils/password.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Sample data seeding is disabled in production");
}

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@shop.test")
  .trim()
  .toLowerCase();
const customerEmail = (process.env.SEED_CUSTOMER_EMAIL ?? "customer@shop.test")
  .trim()
  .toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123456";
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer@123456";

if (adminPassword.length < 8 || customerPassword.length < 8) {
  throw new Error("Seed passwords must contain at least 8 characters");
}

const [adminPasswordHash, customerPasswordHash] = await Promise.all([
  hashPassword(adminPassword),
  hashPassword(customerPassword),
]);

const seedProduct = async (transaction, definition) => {
  const prices = definition.variants.map((variant) => Number(variant.price));
  const product = await transaction.product.upsert({
    where: { slug: definition.slug },
    update: {
      name: definition.name,
      description: definition.description,
      brand: definition.brand,
      categoryId: definition.categoryId,
      minPrice: Math.min(...prices).toFixed(2),
      maxPrice: Math.max(...prices).toFixed(2),
      isActive: true,
    },
    create: {
      name: definition.name,
      slug: definition.slug,
      description: definition.description,
      brand: definition.brand,
      categoryId: definition.categoryId,
      minPrice: Math.min(...prices).toFixed(2),
      maxPrice: Math.max(...prices).toFixed(2),
      isActive: true,
    },
  });

  await transaction.productImage.deleteMany({ where: { productId: product.id } });
  await transaction.productImage.createMany({
    data: definition.images.map((image, index) => ({
      productId: product.id,
      url: image.url,
      altText: image.altText,
      sortOrder: index,
      isPrimary: index === 0,
    })),
  });

  for (const variantData of definition.variants) {
    const { quantity, ...variantFields } = variantData;
    const variant = await transaction.productVariant.upsert({
      where: { sku: variantFields.sku },
      update: { ...variantFields, productId: product.id, isActive: true },
      create: { ...variantFields, productId: product.id, isActive: true },
    });
    await transaction.inventory.upsert({
      where: { variantId: variant.id },
      update: { quantity, reservedQuantity: 0 },
      create: { variantId: variant.id, quantity },
    });
  }

  return product;
};

try {
  const result = await prisma.$transaction(async (transaction) => {
    const [adminRole, customerRole] = await Promise.all([
      transaction.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" },
      }),
      transaction.role.upsert({
        where: { name: "CUSTOMER" },
        update: {},
        create: { name: "CUSTOMER" },
      }),
    ]);

    const admin = await transaction.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: adminPasswordHash,
        firstName: "Store",
        lastName: "Admin",
        roleId: adminRole.id,
        status: "ACTIVE",
      },
      create: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        firstName: "Store",
        lastName: "Admin",
        roleId: adminRole.id,
      },
    });

    const customer = await transaction.user.upsert({
      where: { email: customerEmail },
      update: {
        passwordHash: customerPasswordHash,
        firstName: "Sample",
        lastName: "Customer",
        roleId: customerRole.id,
        status: "ACTIVE",
      },
      create: {
        email: customerEmail,
        passwordHash: customerPasswordHash,
        firstName: "Sample",
        lastName: "Customer",
        roleId: customerRole.id,
      },
    });

    await transaction.address.upsert({
      where: { id: "seed-customer-address" },
      update: {
        userId: customer.id,
        recipientName: "Sample Customer",
        phone: "0901234567",
        addressLine: "1 Nguyen Hue",
        ward: "Ben Nghe",
        district: "District 1",
        province: "Ho Chi Minh City",
        postalCode: "700000",
        isDefault: true,
      },
      create: {
        id: "seed-customer-address",
        userId: customer.id,
        recipientName: "Sample Customer",
        phone: "0901234567",
        addressLine: "1 Nguyen Hue",
        ward: "Ben Nghe",
        district: "District 1",
        province: "Ho Chi Minh City",
        postalCode: "700000",
        isDefault: true,
      },
    });

    const electronics = await transaction.category.upsert({
      where: { slug: "sample-electronics" },
      update: { name: "Electronics", isActive: true, sortOrder: 10 },
      create: {
        name: "Electronics",
        slug: "sample-electronics",
        description: "Sample electronics category",
        isActive: true,
        sortOrder: 10,
      },
    });
    const smartphones = await transaction.category.upsert({
      where: { slug: "sample-smartphones" },
      update: {
        name: "Smartphones",
        parentId: electronics.id,
        isActive: true,
        sortOrder: 10,
      },
      create: {
        name: "Smartphones",
        slug: "sample-smartphones",
        description: "Sample smartphone category",
        parentId: electronics.id,
        isActive: true,
        sortOrder: 10,
      },
    });
    const fashion = await transaction.category.upsert({
      where: { slug: "sample-fashion" },
      update: { name: "Fashion", isActive: true, sortOrder: 20 },
      create: {
        name: "Fashion",
        slug: "sample-fashion",
        description: "Sample fashion category",
        isActive: true,
        sortOrder: 20,
      },
    });
    const tshirts = await transaction.category.upsert({
      where: { slug: "sample-tshirts" },
      update: {
        name: "T-Shirts",
        parentId: fashion.id,
        isActive: true,
        sortOrder: 10,
      },
      create: {
        name: "T-Shirts",
        slug: "sample-tshirts",
        description: "Sample T-shirt category",
        parentId: fashion.id,
        isActive: true,
        sortOrder: 10,
      },
    });

    const products = [];
    products.push(
      await seedProduct(transaction, {
        name: "Sample Phone X",
        slug: "sample-phone-x",
        description: "A sample smartphone for API testing.",
        brand: "SampleTech",
        categoryId: smartphones.id,
        images: [
          {
            url: "https://placehold.co/800x800/png?text=Sample+Phone+Front",
            altText: "Sample Phone X front view",
          },
          {
            url: "https://placehold.co/800x800/png?text=Sample+Phone+Back",
            altText: "Sample Phone X back view",
          },
        ],
        variants: [
          {
            name: "Black / 128GB",
            sku: "SAMPLE-PHONE-X-BLK-128",
            attributes: { color: "Black", storage: "128GB" },
            price: "15990000.00",
            compareAtPrice: "17990000.00",
            quantity: 25,
          },
          {
            name: "Blue / 256GB",
            sku: "SAMPLE-PHONE-X-BLU-256",
            attributes: { color: "Blue", storage: "256GB" },
            price: "18990000.00",
            compareAtPrice: "19990000.00",
            quantity: 12,
          },
        ],
      }),
    );
    products.push(
      await seedProduct(transaction, {
        name: "Sample Wireless Earbuds",
        slug: "sample-wireless-earbuds",
        description: "Sample wireless earbuds with charging case.",
        brand: "SampleTech",
        categoryId: electronics.id,
        images: [
          {
            url: "https://placehold.co/800x800/png?text=Sample+Earbuds",
            altText: "Sample Wireless Earbuds",
          },
        ],
        variants: [
          {
            name: "White",
            sku: "SAMPLE-EARBUDS-WHT",
            attributes: { color: "White" },
            price: "1290000.00",
            compareAtPrice: "1490000.00",
            quantity: 40,
          },
        ],
      }),
    );
    products.push(
      await seedProduct(transaction, {
        name: "Sample Essential T-Shirt",
        slug: "sample-essential-tshirt",
        description: "Sample cotton T-shirt for catalog testing.",
        brand: "SampleWear",
        categoryId: tshirts.id,
        images: [
          {
            url: "https://placehold.co/800x800/png?text=Sample+T-Shirt",
            altText: "Sample Essential T-Shirt",
          },
        ],
        variants: [
          {
            name: "Black / M",
            sku: "SAMPLE-TSHIRT-BLK-M",
            attributes: { color: "Black", size: "M" },
            price: "399000.00",
            compareAtPrice: null,
            quantity: 50,
          },
          {
            name: "Black / L",
            sku: "SAMPLE-TSHIRT-BLK-L",
            attributes: { color: "Black", size: "L" },
            price: "399000.00",
            compareAtPrice: null,
            quantity: 35,
          },
        ],
      }),
    );

    return { admin, customer, categoryCount: 4, productCount: products.length };
  });

  console.log("Sample data seeded successfully.");
  console.log(`Admin: ${result.admin.email}`);
  console.log(`Customer: ${result.customer.email}`);
  console.log(`Categories: ${result.categoryCount}`);
  console.log(`Products: ${result.productCount}`);
} finally {
  await prisma.$disconnect();
}
