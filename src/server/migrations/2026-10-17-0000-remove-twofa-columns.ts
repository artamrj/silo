import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // 2FA was never implemented; these columns were dead weight.
    await knex.schema.alterTable("user", (table) => {
        table.dropColumn("twofa_secret");
        table.dropColumn("twofa_status");
        table.dropColumn("twofa_last_token");
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("user", (table) => {
        table.string("twofa_secret", 64);
        table.boolean("twofa_status").notNullable().defaultTo(false);
        table.string("twofa_last_token", 6);
    });
}
