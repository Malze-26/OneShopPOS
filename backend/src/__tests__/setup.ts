// These must be set before app.ts loads (app.ts imports dotenv which may override)
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1d';
