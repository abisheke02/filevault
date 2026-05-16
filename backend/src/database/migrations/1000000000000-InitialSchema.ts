import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Represents the schema that was created by synchronize:true.
 * The "up" is a no-op because the tables already exist on the live server.
 * Future schema changes get their own migration files.
 */
export class InitialSchema1000000000000 implements MigrationInterface {
  name = 'InitialSchema1000000000000';

  async up(_qr: QueryRunner): Promise<void> {
    // Schema already created by synchronize:true — nothing to do.
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS "shares" CASCADE');
    await qr.query('DROP TABLE IF EXISTS "file_versions" CASCADE');
    await qr.query('DROP TABLE IF EXISTS "files" CASCADE');
    await qr.query('DROP TABLE IF EXISTS "folders" CASCADE');
    await qr.query('DROP TABLE IF EXISTS "users" CASCADE');
  }
}
