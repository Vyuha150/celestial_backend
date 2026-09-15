// Populates required env vars before any module (via env.ts) validates
// them — must run before the DB/replica-set setup and before any test
// file imports src/ modules.
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://placeholder/test"; // overridden by tests/setup.ts's real connection
process.env.JWT_ACCESS_SECRET = "test_access_secret_at_least_20_chars";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_at_least_20_chars";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@test.local";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "TestPassword123!";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_test_webhook_secret";
