import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { content, accessToken } = await req.json() as { content: string; accessToken: string };

    if (!content || !accessToken) {
        return NextResponse.json({ error: "Missing content or access token" }, { status: 400 });
    }

    // Get the authenticated user's LinkedIn ID first
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
        return NextResponse.json({ error: "Failed to fetch LinkedIn profile" }, { status: 401 });
    }

    const profile = await profileRes.json() as { sub: string };
    const authorUrn = `urn:li:person:${profile.sub}`;

    // Post the share
    const shareRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: content },
                    shareMediaCategory: "NONE",
                },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
    });

    if (!shareRes.ok) {
        const err = await shareRes.text();
        return NextResponse.json({ error: err }, { status: shareRes.status });
    }

    return NextResponse.json({ success: true });
}
