import mongoose from 'mongoose';

/**
 * Global cache interface for Mongoose connection.
 * Preserves connections across Hot Module Replacement (HMR) in development
 * and ensures lazy initialization during runtime instead of build time.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export function buildUri(): string {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const {
    MONGODB_ATLAS_USERNAME,
    MONGODB_ATLAS_PASSWORD,
    MONGODB_ATLAS_CLUSTER_URL,
    MONGODB_ATLAS_DB_NAME,
    MONGODB_ATLAS_APP_NAME,
  } = process.env;

  if (!MONGODB_ATLAS_CLUSTER_URL) {
    throw new Error('MongoDB configuration error: MONGODB_URI or MONGODB_ATLAS_CLUSTER_URL is required.');
  }

  return (
    'mongodb+srv://' +
    (MONGODB_ATLAS_USERNAME || '') +
    ':' +
    (MONGODB_ATLAS_PASSWORD || '') +
    '@' +
    MONGODB_ATLAS_CLUSTER_URL +
    '/' +
    (MONGODB_ATLAS_DB_NAME || '') +
    '?retryWrites=true&w=majority&appName=' +
    (MONGODB_ATLAS_APP_NAME || 'Cluster0')
  );
}

/**
 * Connect to MongoDB lazily on demand.
 * Avoids executing connections during Next.js build-time static evaluation.
 */
export async function connectDB() {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn.connection;
  }

  if (!cached.promise) {
    const uri = buildUri();
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn.connection;
}

export default mongoose;
