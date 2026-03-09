import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { to, subject, body, accessToken } = await req.json() as {
        to: string; subject: string; body: string; accessToken: string;
    };

    if (!to || !body || !accessToken) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Build RFC 2822 email
    const emailLines = [
        `To: ${to}`,
        `Subject: ${subject || "(No subject)"}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "",
        body,
    ];
    const raw = Buffer.from(emailLines.join("\r\n")).toString("base64url");

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
}
