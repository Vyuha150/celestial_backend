import type { Request, Response } from "express";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Cart } from "../models/Cart.js";
import { PageView } from "../models/PageView.js";

const REVENUE_STATUSES = ["paid", "shipped", "delivered"];
const DAY_MS = 24 * 60 * 60 * 1000;

function rangeOrDefault(from?: Date, to?: Date) {
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * DAY_MS);
  return { start, end };
}

async function kpisFor(start: Date, end: Date) {
  const [revenueAgg, newCustomers] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: "customer", createdAt: { $gte: start, $lt: end } }),
  ]);

  const revenue = revenueAgg[0]?.revenue ?? 0;
  const orders = revenueAgg[0]?.orders ?? 0;
  const aov = orders > 0 ? revenue / orders : 0;

  return { revenue, orders, newCustomers, aov };
}

// KPI cards on admin.index.tsx: current 30d vs prior 30d for the delta arrows.
export async function getDashboard(_req: Request, res: Response) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * DAY_MS);
  const priorStart = new Date(now.getTime() - 60 * DAY_MS);

  const [current, prior, revenueTrend, categoryMix, topProducts, recentOrders, trafficSources] = await Promise.all([
    kpisFor(periodStart, now),
    kpisFor(priorStart, periodStart),
    getWeeklyTrend(8),
    getCategoryMix(periodStart, now),
    getTopProducts(periodStart, now, 6),
    Order.find().sort({ createdAt: -1 }).limit(6),
    getTrafficSourceBreakdown(periodStart, now),
  ]);

  res.json({
    kpis: {
      revenue: { value: current.revenue, changePct: pctChange(current.revenue, prior.revenue) },
      orders: { value: current.orders, changePct: pctChange(current.orders, prior.orders) },
      newCustomers: { value: current.newCustomers, changePct: pctChange(current.newCustomers, prior.newCustomers) },
      aov: { value: current.aov, changePct: pctChange(current.aov, prior.aov) },
    },
    revenueTrend,
    categoryMix,
    topProducts,
    recentOrders,
    trafficSources,
  });
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function getWeeklyTrend(weeks: number) {
  const since = new Date(Date.now() - weeks * 7 * DAY_MS);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $in: REVENUE_STATUSES } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    d: (r._id as Date).toISOString().slice(0, 10),
    revenue: r.revenue as number,
    orders: r.orders as number,
  }));
}

async function getCategoryMix(start: Date, end: Date) {
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $in: REVENUE_STATUSES } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.category", value: { $sum: "$items.lineTotal" } } },
    { $sort: { value: -1 } },
  ]);

  const total = rows.reduce((sum, r) => sum + (r.value as number), 0);
  if (total === 0) return [];

  return rows.map((r) => ({ name: r._id as string, value: Math.round(((r.value as number) / total) * 1000) / 10 }));
}

async function getTopProducts(start: Date, end: Date, limit: number) {
  return Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $in: REVENUE_STATUSES } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        revenue: { $sum: "$items.lineTotal" },
        qty: { $sum: "$items.qty" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);
}

async function getTrafficSourceBreakdown(start: Date, end: Date) {
  const rows = await PageView.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);

  const total = rows.reduce((sum, r) => sum + (r.count as number), 0);
  if (total === 0) return [];

  return rows
    .map((r) => ({ src: r._id as string, v: Math.round(((r.count as number) / total) * 1000) / 10 }))
    .sort((a, b) => b.v - a.v);
}

// Custom date-ranged trend for admin.analytics.tsx's main chart (daily granularity).
export async function getOverview(req: Request, res: Response) {
  const query = req.validatedQuery as { from?: Date; to?: Date };
  const { start, end } = rangeOrDefault(query.from, query.to);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $in: REVENUE_STATUSES } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    range: { from: start, to: end },
    series: rows.map((r) => ({ d: (r._id as Date).toISOString().slice(0, 10), revenue: r.revenue, orders: r.orders })),
  });
}

// Cohort retention: of customers who signed up in a given month, what
// share placed a second order within 60 days of their first?
export async function getCohortRetention(_req: Request, res: Response) {
  const customers = await User.find({ role: "customer" }, "_id createdAt").lean();
  const cohorts = new Map<string, { customers: Set<string>; repeat: Set<string> }>();

  for (const c of customers) {
    const cohortKey = c.createdAt.toISOString().slice(0, 7);
    if (!cohorts.has(cohortKey)) cohorts.set(cohortKey, { customers: new Set(), repeat: new Set() });
    cohorts.get(cohortKey)!.customers.add(String(c._id));
  }

  const orders = await Order.find({ status: { $in: REVENUE_STATUSES } }, "customer createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const ordersByCustomer = new Map<string, Date[]>();
  for (const o of orders) {
    if (!o.customer) continue;
    const key = String(o.customer);
    if (!ordersByCustomer.has(key)) ordersByCustomer.set(key, []);
    ordersByCustomer.get(key)!.push(o.createdAt);
  }

  for (const group of cohorts.values()) {
    for (const customerId of group.customers) {
      const dates = ordersByCustomer.get(customerId);
      if (dates && dates.length >= 2) {
        const gapDays = (dates[1]!.getTime() - dates[0]!.getTime()) / DAY_MS;
        if (gapDays <= 60) group.repeat.add(customerId);
      }
    }
  }

  const result = Array.from(cohorts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, group]) => ({
      cohort,
      customers: group.customers.size,
      repeatRatePct: group.customers.size > 0 ? Math.round((group.repeat.size / group.customers.size) * 1000) / 10 : 0,
    }));

  res.json(result);
}

// Real purchase funnel: distinct visitor sessions at each stage, from
// first-party pageview + cart + order data — not hardcoded percentages.
export async function getFunnel(_req: Request, res: Response) {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [visited, viewedProduct, cartsWithItems, ordersCreated, ordersPaid] = await Promise.all([
    PageView.distinct("sessionId", { createdAt: { $gte: since } }),
    PageView.distinct("sessionId", { createdAt: { $gte: since }, path: { $regex: "^/products/" } }),
    Cart.countDocuments({ updatedAt: { $gte: since }, "items.0": { $exists: true } }),
    Order.countDocuments({ createdAt: { $gte: since } }),
    Order.countDocuments({ createdAt: { $gte: since }, status: { $in: REVENUE_STATUSES } }),
  ]);

  res.json([
    { stage: "Visited", count: visited.length },
    { stage: "Viewed product", count: viewedProduct.length },
    { stage: "Added to cart", count: cartsWithItems },
    { stage: "Checkout started", count: ordersCreated },
    { stage: "Purchased", count: ordersPaid },
  ]);
}
