import jwt from "jsonwebtoken";
import { Database } from "../database";
import { findUserById, updateUserPassword, type UserRow } from "../db/repositories/users";
import { generatePasswordHash, shake256, SHAKE256_LENGTH } from "../password-hash";

/**
 * A user record.
 *
 * This used to be a RedBean `BeanModel` that mapped itself onto the `user`
 * table at runtime. It is now a plain class populated from a typed repository
 * row, which keeps the login path free of reflection and database access hidden
 * behind static helpers.
 */
export class User {
    id : number;
    username : string;
    password : string;
    active : boolean;
    timezone : string | null;

    constructor(row : UserRow) {
        this.id = row.id;
        this.username = row.username;
        this.password = row.password ?? "";
        this.active = row.active === 1;
        this.timezone = row.timezone;
    }

    /**
     * Build a `User` from a repository row.
     * @param row Row read from the `user` table
     * @returns The user
     */
    static fromRow(row : UserRow) : User {
        return new User(row);
    }

    /**
     * @param id User id
     * @returns The user, or undefined when missing
     */
    static findById(id : number) : User | undefined {
        const row = findUserById(Database.getDb(), id);
        return row ? new User(row) : undefined;
    }

    /**
     * Reset user password
     * Fix #1510, as in the context reset-password.js, there was no auto model mapping.
     * @param userID ID of user to update
     * @param newPassword Users new password
     */
    static async resetPassword(userID : number, newPassword : string) {
        updateUserPassword(Database.getDb(), userID, generatePasswordHash(newPassword));
    }

    /**
     * Reset this users password
     * @param newPassword New password
     */
    async resetPassword(newPassword : string) {
        await User.resetPassword(this.id, newPassword);
        this.password = generatePasswordHash(newPassword);
    }

    /**
     * Create a new JWT for a user
     * @param user The User to create a JsonWebToken for
     * @param jwtSecret The key used to sign the JsonWebToken
     * @returns the JsonWebToken as a string
     */
    static createJWT(user : User, jwtSecret : string) {
        return jwt.sign({
            username: user.username,
            h: shake256(user.password, SHAKE256_LENGTH),
        }, jwtSecret, {
            expiresIn: "12h",
        });
    }

}

export default User;
