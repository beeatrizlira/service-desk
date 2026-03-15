import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

function parseBooleanEnv(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return truthyValues.has(value.trim().toLowerCase());
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  return {
    type: 'sqlite',
    database: process.env.DATABASE_PATH ?? (isTest ? ':memory:' : 'db.sqlite'),
    entities: [Ticket],
    synchronize: parseBooleanEnv(process.env.DB_SYNCHRONIZE, !isProduction),
    logging: parseBooleanEnv(process.env.DB_LOGGING, false),
  };
}
