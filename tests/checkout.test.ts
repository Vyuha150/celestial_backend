import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/utils/razorpay.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/utils/razorpay.js")>();
  return {
    ...actual,
    razorpay: {
      orders: {
        create: vi.fn(async (opts: { amount: number; currency: string; receipt: string }) => ({
          id: `order_mock_${opts.receipt}`,
          amount: opts.amount,
          currency: opts.currency,
        })),
      },
    },
  };
});

const { app } = await import("../src/app.js");
const { Category } = await import("../src/models/Category.js");
const { Product } = await import("../src/models/Product.js");
const { Order } = await import("../src/models/Order.js");
const { InventoryLog } = await import("../src/models/InventoryLog.js");

async function seedProduct(stock: number) {
  const category = await Category.create({
    slug: "test-cat",
    title: "Test Category",
    tagline: "t",
    image: "img.jpg",
    hero: { eyebrow: "e", headline: "h", italic: "i", pitch: "p", badge: "b" },
  });
  const product = await Product.create({
    category: category._id,
    sku: "TEST-0001",
    name: "Test Product",
    price: 100,
    stock,
    status: "live",
  });
  return { category, product };
}

describe("checkout stock reservation", () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(() => {
    agent = request.agent(app);
  });

  it("decrements stock atomically and creates a pending order", async () => {
    const { product } = await seedProduct(5);

    await agent.post("/cart/items").send({ productId: String(product._id), qty: 3 }).expect(201);

    const res = await agent
      .post("/checkout/session")
      .send({
        customerName: "Ada Lovelace",
        customerEmail: "ada@example.com",
        shippingAddress: {
          line1: "1 Analytical Engine Way",
          city: "London",
          state: "London",
          postalCode: "SW1A 1AA",
          country: "GB",
          phone: "+441234567890",
        },
      })
      .expect(201);

    expect(res.body.orderNumber).toMatch(/^CEL-/);

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(2);

    const order = await Order.findOne({ orderNumber: res.body.orderNumber });
    expect(order).not.toBeNull();
    expect(order!.status).toBe("pending");
    expect(order!.total).toBe(300);
    expect(order!.items[0]!.qty).toBe(3);

    const log = await InventoryLog.findOne({ product: product._id });
    expect(log!.change).toBe(-3);
    expect(log!.reason).toBe("order");
  });

  it("rejects checkout and leaves stock untouched when cart qty exceeds available stock", async () => {
    const { product } = await seedProduct(2);

    // Add 2 (valid), then a later stock drop simulates a race — directly
    // reduce stock in DB to below the cart's reserved qty before checkout.
    await agent.post("/cart/items").send({ productId: String(product._id), qty: 2 }).expect(201);
    await Product.findByIdAndUpdate(product._id, { stock: 1 });

    await agent
      .post("/checkout/session")
      .send({
        customerName: "Grace Hopper",
        customerEmail: "grace@example.com",
        shippingAddress: {
          line1: "1 Navy Yard",
          city: "Arlington",
          state: "VA",
          postalCode: "22202",
          country: "US",
          phone: "+15551234567",
        },
      })
      .expect(409);

    const unchanged = await Product.findById(product._id);
    expect(unchanged!.stock).toBe(1); // no partial decrement occurred

    const orders = await Order.countDocuments({ customerEmail: "grace@example.com" });
    expect(orders).toBe(0); // transaction rolled back, no order left behind
  });

  it("rejects adding more to cart than is in stock", async () => {
    const { product } = await seedProduct(1);

    await agent.post("/cart/items").send({ productId: String(product._id), qty: 5 }).expect(409);
  });
});
