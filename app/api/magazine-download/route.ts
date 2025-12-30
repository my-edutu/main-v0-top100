import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, magazineYear, magazineTitle, downloadLink } = body

        // Validate required fields
        if (!name || !email || !magazineYear || !magazineTitle || !downloadLink) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            )
        }

        // Brevo API integration
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
            console.error('[Magazine Download] BREVO_API_KEY is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        console.log(`[Magazine Download] Adding/Updating contact in Brevo: ${email}`);

        // Get optional List ID for magazine downloads
        const listId = process.env.BREVO_MAGAZINE_LIST_ID
            ? parseInt(process.env.BREVO_MAGAZINE_LIST_ID)
            : (process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : undefined);

        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': brevoApiKey,
            },
            body: JSON.stringify({
                email: email.toLowerCase().trim(),
                attributes: {
                    FULLNAME: name.trim(),
                    SOURCE: 'Magazine Download',
                    LAST_MAGAZINE: magazineTitle,
                    MAGAZINE_YEAR: magazineYear.toString(),
                    DOWNLOADED_AT: new Date().toISOString(),
                },
                ...(listId && { listIds: [listId] }),
                updateEnabled: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Magazine Download] Brevo API error:', response.status, errorData);
            // We still return success to the user so they can get their download
            // but we log the error for the admin
        }

        return NextResponse.json({
            success: true,
            message: 'Details stored and redirecting...',
            downloadLink,
        })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
