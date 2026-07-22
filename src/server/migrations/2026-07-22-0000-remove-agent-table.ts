import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("agent");
}

export async function down(): Promise<void> {
    // Remote instance management was intentionally removed and is not restorable.
}
