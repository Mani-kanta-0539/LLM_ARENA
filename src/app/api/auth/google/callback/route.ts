import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(new URL(`/automation/gmail?error=${error ?? "no_code"}`, req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return NextResponse.redirect(new URL(`/automation/gmail?error=${encodeURIComponent(err)}`, req.url));
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const token = tokenData.access_token;

    return NextResponse.redirect(new URL(`/automation/gmail?token=${encodeURIComponent(token)}`, req.url));
}
