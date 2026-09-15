import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "../src/utils/razorpay.js";

// RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET come from tests/env.setup.ts.
const KEY_SECRET = "rzp_test_secret";
const WEBHOOK_SECRET = "rzp_test_webhook_secret";

describe("verifyPaymentSignature", () => {
  it("accepts a correctly signed order/payment pair", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const signature = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

    expect(verifyPaymentSignature(orderId, paymentId, signature)).toBe(true);
  });

  it("rejects a tampered payment id", () => {
    const orderId = "order_ABC123";
    const signature = createHmac("sha256", KEY_SECRET).update(`${orderId}|pay_XYZ789`).digest("hex");

    // Attacker swaps in a different payment id after the signature was issued.
    expect(verifyPaymentSignature(orderId, "pay_ATTACKER", signature)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const forged = createHmac("sha256", "not_the_real_secret").update(`${orderId}|${paymentId}`).digest("hex");

    expect(verifyPaymentSignature(orderId, paymentId, forged)).toBe(false);
  });

  it("rejects malformed hex without throwing", () => {
    expect(verifyPaymentSignature("order_1", "pay_1", "not-valid-hex!!")).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed raw body", () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a body that was modified after signing", () => {
    const original = JSON.stringify({ event: "payment.captured", amount: 100 });
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(original).digest("hex");
    const tampered = JSON.stringify({ event: "payment.captured", amount: 999999 });

    expect(verifyWebhookSignature(tampered, signature)).toBe(false);
  });
});
