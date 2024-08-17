import { connect, disconnect } from 'mongoose';

let isInitialized: boolean;

export const ensureMongoConnection = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  try {
    const user = process.env.MONGODB_USERNAME;
    const pass = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST;
    const port = process.env.MONGODB_PORT;
    const dbName = process.env.MONGODB_DATABASE_NAME;

    const uri = `mongodb://${user}:${pass}@${host}:${port}`;
    const options = {
      dbName,
      autoIndex: (process.env.MONGODB_AUTO_INDEX as string).toLowerCase() === 'true',
      autoCreate: (process.env.MONGODB_AUTO_CREATE as string).toLowerCase() === 'true',
      minPoolSize: +(process.env.MONGODB_MIN_POOL_SIZE as string),
      maxPoolSize: +(process.env.MONGODB_MAX_POOL_SIZE as string),
    };

    await connect(uri, options);
    isInitialized = true;
  } catch (error) {
    console.error('Error during MongoDB initialization:', error);
    throw error;
  }
};

export const dropMongoConnections = async (): Promise<void> => {
  try {
    if (isInitialized) {
      await disconnect();
    }
  } catch (error) {
    console.error('Error during MongoDB disconnection:', error);
  }
};
