const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const DEFAULT_JWT_SECRET = 'change-this-to-a-long-random-secret';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

function validateProductionConfig(config = module.exports) {
  if (config.nodeEnv !== 'production') {
    return;
  }

  const errors = [];

  if (!process.env.JWT_SECRET || config.jwt.secret === DEFAULT_JWT_SECRET) {
    errors.push('JWT_SECRET must be set to a strong secret in production');
  }

  if (!process.env.ADMIN_PASSWORD || config.admin.password === DEFAULT_ADMIN_PASSWORD) {
    errors.push('ADMIN_PASSWORD must be changed in production');
  }

  if (config.frontendOrigin === '*') {
    errors.push('FRONTEND_ORIGIN must not be "*" in production');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production configuration: ${errors.join('; ')}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_recipe',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
  },
  validateProductionConfig
};
