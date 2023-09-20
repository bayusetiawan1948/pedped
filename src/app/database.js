import mysql from 'mysql2/promise';
import redis from 'redis';
import EventsEmitter from 'events';
import { logger } from './logging.js';

const mysqlConfig = {
  connectionLimit: 10,
  host: process.env['DBHOST'] || '127.0.0.1',
  user: process.env['DBUSER'] || 'root',
  password: process.env['DBPASSWORD'] || '',
  database: process.env['DBNAME'] || 'pedped',
};

const redisConfig = {
  url:
    process.env['REDISHOST'] ||
    'redis[s]://[[username][:password]@][host][:port](optional [/db-number]:)',
};

const emitter = new EventsEmitter();
emitter.addListener('error', (e) => {
  logger.error(e);
});
emitter.addListener('warn', (e) => {
  logger.warn(e);
});
emitter.addListener('info', (e) => {
  logger.info(e);
});
emitter.addListener('query', (e) => {
  logger.query(e);
});

async function checkDatabasePrimary() {
  try {
    const result = await query('select 1');
    return true;
  } catch (error) {
    emitter.emit('error', error);
    return false;
  }
}

async function checkRedis() {
  try {
    const client = redis.createClient(redisConfig);
    client.on('error', (err) => console.log('Redis Client Error', err));
    const result = await client.isReady();
    return result;
  } catch (error) {
    emitter.emit('error', error);
    return false;
  }
}

async function redisGet(key, isMap = 1) {
  try {
    const client = redis.createClient(redisConfig);
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    if (isMap === 1) {
      const result = await client.hGetAll(key);
      return JSON.stringify(result, null, 2);
    } else {
      const result = await client.get(key);
      return result;
    }
  } catch (error) {
    emitter.emit('error', error);
  }
}

async function redisSet(key, value, isMap = 1) {
  try {
    const client = redis.createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    if (isMap === 1) {
      const result = await client.hSet(key, value);
    } else {
      const result = await client.set(key, value);
    }
    return result;
  } catch (error) {
    emitter.emit('error', error);
  }
}

async function query(sql, params) {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    const [results] = await connection.execute(sql, params);
    await connection.end();
    return results;
  } catch (error) {
    emitter.emit('error', error);
  }
}

async function getConnectionPrimary() {
  try {
    const connection = await mysql.createConnection(databaseConfig);
    return connection;
  } catch (error) {
    emitter.emit('error', error);
  }
}

export {
  checkDatabasePrimary,
  checkRedis,
  query,
  getConnectionPrimary,
  redisGet,
  redisSet,
};
