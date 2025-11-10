import { google } from "googleapis";

// Function to create and return a Google API client with given tokens
export function getGoogleClient(accessToken: string, refreshToken?: string) {
    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    // Set the credentials for the OAuth2 client
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return google; // return the google API instance (gmail and calendar)
}
