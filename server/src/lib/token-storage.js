// File: /Users/narcisbrindusescu/cod/Narcissus/agent/server/src/lib/token-storage.ts
import { Database } from "bun:sqlite";
import { GoogleOAuth2Helper } from "./google-oauth2";
// Initialize the database connection
const db = new Database("secret.sqlite");
console.log("Database 'secret.sqlite' initialized.");
// --- Database Schema Initialization ---
export function initializeTokenStorage() {
    try {
        db.run(`
            CREATE TABLE IF NOT EXISTS google_tokens (
                user_email TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                scope TEXT,
                token_type TEXT,
                expiry_date INTEGER NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'google_tokens' is ready.");
    }
    catch (error) {
        console.error("Failed to initialize token storage:", error);
        process.exit(1); // Exit if the database can't be set up
    }
}
/**
 * Saves or updates tokens for a specific user.
 * It uses INSERT ... ON CONFLICT to perform an "upsert".
 * @param email The user's email address (primary key).
 * @param tokens The tokens received from Google.
 */
export function saveOrUpdateTokens(email, tokens) {
    if (!tokens.refresh_token) {
        // If Google doesn't return a refresh token (e.g., on subsequent logins),
        // we must update the other fields without overwriting the existing refresh token.
        const stmt = db.prepare(`
            UPDATE google_tokens
            SET access_token = ?, scope = ?, token_type = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_email = ?
        `);
        stmt.run(tokens.access_token ?? null, tokens.scope ?? null, tokens.token_type ?? null, tokens.expiry_date ?? null, email);
        console.log(`Tokens updated for ${email} (without changing refresh_token).`);
    }
    else {
        // This is for the first-time login or when a new refresh token is explicitly granted.
        const stmt = db.prepare(`
            INSERT INTO google_tokens (user_email, access_token, refresh_token, scope, token_type, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_email) DO UPDATE SET
                access_token = excluded.access_token,
                scope = excluded.scope,
                token_type = excluded.token_type,
                expiry_date = excluded.expiry_date,
                updated_at = CURRENT_TIMESTAMP;
        `);
        stmt.run(email, tokens.access_token ?? null, tokens.refresh_token ?? null, tokens.scope ?? null, tokens.token_type ?? null, tokens.expiry_date ?? null);
        console.log(`Tokens saved/updated for ${email} (with new refresh_token).`);
    }
}
/**
 * Retrieves the stored token information for a user.
 * @param email The user's email.
 * @returns The stored token info or null if not found.
 */
export function getTokensForUser(email) {
    const stmt = db.prepare("SELECT * FROM google_tokens WHERE user_email = ?");
    const result = stmt.get(email);
    return result;
}
/**
 * Deletes stored tokens for a user (e.g., when the refresh token is invalid).
 * @param email The user's email.
 */
export function deleteTokensForUser(email) {
    const stmt = db.prepare("DELETE FROM google_tokens WHERE user_email = ?");
    stmt.run(email);
    console.log(`Deleted tokens for ${email}.`);
}
/**
 * Gets a valid access token for a user, automatically refreshing it if it's expired.
 * This is the primary function your application should use to get a token for API calls.
 * @param email The user's email.
 * @param oauth2Helper An instance of the GoogleOAuth2Helper.
 * @returns A valid access token, or null if no refresh token is found or refresh fails.
 */
export async function getValidAccessToken(email, oauth2Helper) {
    const storedTokens = getTokensForUser(email);
    if (!storedTokens || !storedTokens.refresh_token) {
        console.warn(`No stored refresh token for ${email}. Cannot get access token.`);
        return null;
    }
    // Check if the token is expired or will expire in the next 60 seconds
    const isExpired = storedTokens.expiry_date ? Date.now() >= (storedTokens.expiry_date - 60000) : true;
    if (isExpired) {
        console.log(`Access token for ${email} has expired. Refreshing...`);
        try {
            // Use the stored refresh token to get a new access token
            const newCredentials = await oauth2Helper.refreshAccessToken(storedTokens.refresh_token);
            // IMPORTANT: The refresh response does NOT include a new refresh token.
            // We must combine the new credentials with our existing refresh token.
            const updatedTokens = {
                ...newCredentials,
                refresh_token: storedTokens.refresh_token,
            };
            // Save the newly refreshed token information back to the database
            saveOrUpdateTokens(email, updatedTokens);
            return updatedTokens.access_token;
        }
        catch (error) {
            console.error(`Failed to refresh access token for ${email}:`, error);
            // Check if this is an invalid_grant error (refresh token expired/revoked)
            if (error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant') {
                console.warn(`Refresh token for ${email} is invalid (expired or revoked). Deleting stored tokens.`);
                deleteTokensForUser(email);
                // Throw a specific error that the API can catch
                throw new Error('REFRESH_TOKEN_EXPIRED');
            }
            return null; // Other refresh errors
        }
    }
    else {
        console.log(`Existing access token for ${email} is still valid.`);
        return storedTokens.access_token;
    }
}
