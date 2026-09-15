// Zero-install dev mode: runs the real API against an in-memory MongoDB
// replica set (the same mechanism the test suite uses) instead of a real
// MongoDB install. Handy for local frontend integration work, or anyone
// without Docker/MongoDB set up yet. Data is wiped when the process exits.
//
// Usage: npm run dev:memory
process.env.NODE_ENV ??= "development";
process.env.JWT_ACCESS_SECRET ??= "dev_access_secret_at_least_20_chars";
process.env.JWT_REFRESH_SECRET ??= "dev_refresh_secret_at_least_20_chars";
process.env.CORS_ORIGIN ??= "http://localhost:5173,http://localhost:8080";
process.env.ADMIN_BOOTSTRAP_EMAIL ??= "admin@celestial.local";
process.env.ADMIN_BOOTSTRAP_PASSWORD ??= "DevPassword123!";
process.env.RAZORPAY_KEY_ID ??= "rzp_test_dev_placeholder";
process.env.RAZORPAY_KEY_SECRET ??= "dev_placeholder_secret";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "dev_placeholder_webhook_secret";

const { MongoMemoryReplSet } = await import("mongodb-memory-server");
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

// getUri() returns e.g. "mongodb://127.0.0.1:PORT/?replicaSet=testset" —
// the db name is a path segment, not a suffix to blindly append (doing so
// previously corrupted the replicaSet query param into "testsetcelestial-dev").
const uri = new URL(replSet.getUri());
uri.pathname = "/celestial-dev";
process.env.MONGO_URI = uri.toString();

console.log(`[dev-memory-db] In-memory MongoDB ready at ${process.env.MONGO_URI}`);
console.log("[dev-memory-db] Data will NOT persist across restarts — auto-seeding now.");

const { app } = await import("../src/app.js");
const { env } = await import("../src/config/env.js");
const { connectDb } = await import("../src/config/db.js");
const { execSeed } = await import("../src/seed.js");

await connectDb();

// Seed this ephemeral DB automatically so the frontend has real catalog
// data to render without a manual extra step.
await execSeed();

app.listen(env.PORT, () => {
  console.log(`[dev-memory-db] Celestial API listening on :${env.PORT}`);
  console.log(
    `[dev-memory-db] Create the first admin with: curl -X POST http://localhost:${env.PORT}/auth/bootstrap-admin -H "Content-Type: application/json" -d '{"name":"Admin","email":"${process.env.ADMIN_BOOTSTRAP_EMAIL}","password":"${process.env.ADMIN_BOOTSTRAP_PASSWORD}"}'`,
  );
});

process.on("SIGINT", async () => {
  await replSet.stop();
  process.exit(0);
});
