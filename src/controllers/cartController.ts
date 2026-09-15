import type { Request, Response } from "express";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

function cartExpiry(): Date {
  return new Date(Date.now() + env.CART_TTL_HOURS * 60 * 60 * 1000);
}

function withTotal(cart: { items: { price: number; qty: number }[] }) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { ...cart, subtotal };
}

async function getOrCreateCart(sessionId: string) {
  let cart = await Cart.findOne({ sessionId });
  if (!cart) {
    cart = await Cart.create({ sessionId, items: [], expiresAt: cartExpiry() });
  }
  return cart;
}

export async function getCart(req: Request, res: Response) {
  const cart = await getOrCreateCart(req.cartSessionId!);
  res.json(withTotal(cart.toObject()));
}

export async function addCartItem(req: Request, res: Response) {
  const { productId, qty } = req.body as { productId: string; qty: number };

  const product = await Product.findById(productId);
  if (!product || product.status !== "live") throw ApiError.notFound("Product not available");
  if (product.stock < qty) throw ApiError.conflict(`Only ${product.stock} left in stock`);

  const cart = await getOrCreateCart(req.cartSessionId!);
  const existing = cart.items.find((i) => String(i.product) === productId);

  if (existing) {
    existing.qty = Math.min(99, existing.qty + qty);
  } else {
    cart.items.push({ product: product._id, name: product.name, price: product.price, qty });
  }

  cart.expiresAt = cartExpiry();
  await cart.save();
  res.status(201).json(withTotal(cart.toObject()));
}

export async function updateCartItem(req: Request, res: Response) {
  const { qty } = req.body as { qty: number };
  const cart = await getOrCreateCart(req.cartSessionId!);

  const item = cart.items.find((i) => String(i.product) === req.params.productId);
  if (!item) throw ApiError.notFound("Item not in cart");

  item.qty = qty;
  cart.expiresAt = cartExpiry();
  await cart.save();
  res.json(withTotal(cart.toObject()));
}

export async function removeCartItem(req: Request, res: Response) {
  const cart = await getOrCreateCart(req.cartSessionId!);
  cart.items = cart.items.filter((i) => String(i.product) !== req.params.productId) as typeof cart.items;
  await cart.save();
  res.json(withTotal(cart.toObject()));
}
