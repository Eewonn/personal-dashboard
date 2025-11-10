import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CryptoJS from "crypto-js";

// Augment NextAuth Session type to include token fields on user
declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            accessToken?: string | null;
            refreshToken?: string | null;
            expiresAt?: number | null;
        };
    }
}

// Utility functions for encrypting and decrypting data using AES
const encrypt = (text: string) =>
    CryptoJS.AES.encrypt(text, process.env.NEXTAUTH_SECRET!).toString();

const decrypt = (cipher: string) => {
    const bytes = CryptoJS.AES.decrypt(cipher, process.env.NEXTAUTH_SECRET!);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// Function to refresh access token using refresh token
async function refreshAccessToken(refresh_token: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token,
        }),
    });

    const tokens = await res.json();
    if (!res.ok) throw tokens;
    return tokens;
}

// NextAuth configuration
export default NextAuth({
    providers: [
        // Google OAuth Provider
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: { params: { access_type: "offline", prompt: "consent" } },
        }),
    ],

    // Use JWT strategy instead of database sessions
    session: {
        strategy: "jwt",
    },

    // Secret for encrypting tokens
    secret: process.env.NEXTAUTH_SECRET,

    // Callbacks to handle JWT and session
    callbacks: {

        // Encrypt tokens before storing them in the JWT
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = encrypt(account.access_token!);
                token.refreshToken = encrypt(account.refresh_token!);
                const expiresIn = Number(account.expires_in) || 0;
                token.expiresAt = Date.now() + expiresIn * 1000;
            }

            // Refresh access token if expired
            if (Date.now() > (token.expiresAt as number)) {
                try {
                    const refreshed = await refreshAccessToken(decrypt(token.refreshToken as string));
                    token.accessToken = encrypt(refreshed.access_token);
                    token.expiresAt = Date.now() + refreshed.expires_in * 1000;
                } catch (error) {
                    console.error("Failed to refresh access token:", error);
                    token.error = "RefreshAccessTokenError";
                }
            }
            return token;
        },

        // Decrypt tokens when creating the session object
        async session({ session, token }) {
            session.user = { ...(session.user ?? {}), accessToken: decrypt(token.accessToken as string) };
            return session;
        },
    }

});



