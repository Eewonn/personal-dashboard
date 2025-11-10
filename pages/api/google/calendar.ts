import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

// API route to fetch Google Calendar events for the authenticated user
export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // Retrieve the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) return res.status(401).json({ error: "Unauthorized" });

    // Initialize OAuth2 client with the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken as string });

    // Fetch upcoming events from Google Calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
        calendarId: "primary",
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
        timeMin: new Date().toISOString(),
    });

    // Map the events to a simplified format
    const events = response.data.items?.map(event => ({
        title: event.summary,
        date: event.start?.dateTime || event.start?.date,
        source: "calendar",
        content: event.description || "",
    }));

    // Return the events as JSON response
    res.json(events);
}
