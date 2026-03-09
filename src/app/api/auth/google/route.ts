import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

    if (!clientId) {
        return NextResponse.json(
            { error: "GOOGLE_CLIENT_ID not set in .env.local" },
            { status: 500 }
        );
    }

    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send");
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(url);
}
