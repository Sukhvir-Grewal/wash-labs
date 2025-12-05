import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
const dbName = process.env.MONGODB_DB || process.env.DB_NAME || "washlabs";

if (!uri || !dbName) {
  console.warn("[mongodb] Missing Mongo connection env vars");
}

let cached = global._mongoCache;
if (!cached) {
	cached = global._mongoCache = { client: null, db: null, connecting: null };
}

export async function getClient() {
  if (!uri) throw new Error("Mongo connection string env var is not set");
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
  if (!dbName) throw new Error("Mongo database name env var is not set");
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
