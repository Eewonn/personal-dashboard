import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

// API route to fetch Gmail messages for the authenticated user
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Retrieve the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) return res.status(401).json({ error: "Unauthorized" });

    // Initialize OAuth2 client with the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken as string });

    // Fetch recent emails from Gmail
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const response = await gmail.users.messages.list({ userId: "me", maxResults: 10 });
    const messages = response.data.messages || [];

    // Fetch details for each email
    const details = await Promise.all(
        messages.map(async msg => {
            const full = await gmail.users.messages.get({ userId: "me", id: msg.id! });
            const snippet = full.data.snippet;
            const subject = full.data.payload?.headers?.find(h => h.name === "Subject")?.value;
            return {
                title: subject || "(No Subject)",
                date: new Date(Number(full.data.internalDate)).toISOString(),
                source: "gmail",
                content: snippet,
            };
        })
    );

    // Return the email details as JSON response
    res.json(details);
}
