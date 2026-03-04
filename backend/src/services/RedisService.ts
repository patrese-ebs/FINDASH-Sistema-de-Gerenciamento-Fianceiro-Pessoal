import { createClient, RedisClientType } from 'redis';

class RedisService {
    private client: RedisClientType | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.init();
    }

    private async init() {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';

        try {
            this.client = createClient({ url });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Connected to Redis successfully');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                console.log('Reconnecting to Redis...');
            });

            await this.client.connect();
        } catch (error: any) {
            console.error('Failed to initialize Redis:', error.message);
            this.isConnected = false;
        }
    }

    /**
     * Set a value in Redis with an optional expiration time in seconds.
     * Fails silently if Redis is disconnected.
     */
    async set(key: string, value: string, expireSeconds?: number): Promise<void> {
        if (!this.isConnected || !this.client) return;

        try {
            if (expireSeconds) {
                await this.client.setEx(key, expireSeconds, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error: any) {
            console.error(`Redis SET error for key ${key}:`, error.message);
        }
    }

    /**
     * Get a value from Redis. 
     * Returns null if key doesn't exist, or if Redis is disconnected.
     */
    async get(key: string): Promise<string | null> {
        if (!this.isConnected || !this.client) return null;

        try {
            return await this.client.get(key);
        } catch (error: any) {
            console.error(`Redis GET error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Delete a key from Redis.
     * Fails silently if Redis is disconnected.
     */
    async del(key: string): Promise<void> {
        if (!this.isConnected || !this.client) return;

        try {
            await this.client.del(key);
        } catch (error: any) {
            console.error(`Redis DEL error for key ${key}:`, error.message);
        }
    }

    /**
     * Close the Redis connection gracefully.
     */
    async quit(): Promise<void> {
        if (this.client && this.isConnected) {
            await this.client.quit();
        }
    }
}

export default new RedisService();
