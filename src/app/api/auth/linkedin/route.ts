import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/api/auth/linkedin/callback";

    if (!clientId) {
        return NextResponse.json(
            { error: "LINKEDIN_CLIENT_ID not set in .env.local" },
            { status: 500 }
        );
    }

    const scope = encodeURIComponent("openid profile email w_member_social");
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

    return NextResponse.redirect(url);
}
