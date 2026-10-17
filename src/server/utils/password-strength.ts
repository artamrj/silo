/**
 * Minimal password strength check, replacing the `check-password-strength`
 * dependency while preserving its "Too weak" rule: a password is too weak when
 * it uses fewer than two character categories (lowercase, uppercase, digit,
 * symbol) or is shorter than eight characters.
 * @param password Password to evaluate
 * @returns True when the password is considered too weak
 */
export function isPasswordTooWeak(password : string) : boolean {
    if (typeof password !== "string" || password.length < 8) {
        return true;
    }
    const categories = [
        /[a-z]/,
        /[A-Z]/,
        /[0-9]/,
        /[^a-zA-Z0-9]/,
    ].filter((pattern) => pattern.test(password)).length;
    return categories < 2;
}
