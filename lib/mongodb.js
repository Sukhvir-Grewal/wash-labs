import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
	console.warn("[mongodb] Missing MONGODB_URI or MONGODB_DB env vars");
}

let cached = global._mongoCache;
if (!cached) {
	cached = global._mongoCache = { client: null, db: null, connecting: null };
}

export async function getClient() {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (cached.client) return cached.client;
  if (cached.connecting) return cached.connecting;

  const options = {
    serverSelectionTimeoutMS: 7000,
    maxPoolSize: 10,
    serverApi: { version: '1', strict: false, deprecationErrors: true },
    tls: true,
    tlsAllowInvalidCertificates: process.env.MONGODB_TLS_ALLOW_INVALID === 'true',
    tlsAllowInvalidHostnames: process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAMES === 'true',
  };

  cached.connecting = MongoClient.connect(uri, options)
    .then((client) => {
      cached.client = client;
      cached.connecting = null;
      return client;
    })
    .catch((err) => {
      cached.connecting = null;
      throw err;
    });

  return cached.connecting;
}

export async function getDb() {
	if (!dbName) throw new Error("MONGODB_DB is not set");
	const client = await getClient();
	if (cached.db) return cached.db;
	cached.db = client.db(dbName);
	return cached.db;
}

export async function closeClient() {
	if (cached.client) {
		await cached.client.close();
		cached.client = null;
		cached.db = null;
	}
}
