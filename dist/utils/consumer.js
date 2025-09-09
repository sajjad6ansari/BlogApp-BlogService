import amqp from 'amqplib';
import { redisClient } from '../server.js';
import { sql } from './db.js';
export const startCacheConsumer = async () => {
    try {
        const connection = await amqp.connect({
            protocol: 'amqp',
            hostname: 'localhost',
            port: 5672,
            username: 'admin',
            password: 'admin123'
        });
        const channel = await connection.createChannel();
        const queueName = 'cache-invalidation';
        await channel.assertQueue(queueName, { durable: true });
        console.log('✅ Blog service cache consumer connected to RabbitMQ or started');
        channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log('📩 Blog service cache invalidation message received:', content);
                    if (content.action === 'invalidateCache') {
                        // Here you would add logic to invalidate the cache based on content.keys
                        for (const pattern of content.keys) {
                            const keys = await redisClient.keys(pattern);
                            if (keys.length > 0) {
                                await redisClient.del(keys);
                                console.log(`🗑️ Blog Service Cache invalidated ${keys.length} 
                                cache keys matching: ${pattern}`);
                                const searchQuery = "";
                                const category = "";
                                const cacheKey = `blogs:${searchQuery}:${category}:`;
                                const blogs = await sql `SELECT * FROM blogs  ORDER BY created_at DESC`;
                                await redisClient.set(cacheKey, JSON.stringify(blogs), { EX: 3600 });
                                console.log(`🔄 Blog Service Cache rebuilt with key: ${cacheKey}`);
                            }
                        }
                        console.log('🔑 Blog Service Invalidating cache for keys:', content.keys);
                    }
                    channel.ack(msg);
                }
                catch (error) {
                    console.error('❌ Error processing cache invalidation in Blog Service:', error);
                    channel.nack(msg, false, true);
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to start RabbitMQ consumer:', error);
    }
};
