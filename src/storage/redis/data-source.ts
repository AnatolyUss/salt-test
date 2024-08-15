import { createClient } from 'redis';

let redisClient: any;

export const getRedisClient = async (): Promise<any> => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = await createClient()
      .on('error', err => console.error('Redis Client Error', err))
      .connect();

    return redisClient;
  } catch (error) {
    console.error('Error during Redis initialization:', error);
    throw error;
  }
};

export const disconnectRedisClient = async (redisClient: any): Promise<void> => {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Error during Redis disconnection:', error);
  }
};
