import mongoose from "mongoose";

let warnedForUri = false;

const resolveMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri && !warnedForUri) {
    console.warn("[mongoose] Missing MONGODB_URI/MONGODB_URL env var");
    warnedForUri = true;
  }
  return uri;
};

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

mongoose.set("strictQuery", false);

export default async function connectMongoose() {
  const mongoUri = resolveMongoUri();
  if (!mongoUri) {
    throw new Error("Mongo connection string env var is not set");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 7000,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
