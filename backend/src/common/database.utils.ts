import * as dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);
const isSqlite = process.env.DATABASE_URL?.startsWith('sqlite');
console.log('isSqlite:', isSqlite);

export const ColumnType = {
  BIGINT: isSqlite ? 'integer' : 'bigint',
  DATETIME: isSqlite ? 'datetime' : 'timestamp',
};
console.log('ColumnType:', ColumnType);
