interface Recipient {
    email: string;
    name?: string;
}

export async function sendMail(to: Recipient, subject: string, html: string) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.MAIL_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
        throw new Error('Email is not configured (BREVO_API_KEY or MAIL_FROM_EMAIL missing)');
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
        },
        body: JSON.stringify({
            sender: { name: process.env.MAIL_FROM_NAME || 'COLCOMPS Project Archive', email: fromEmail },
            to: [{ email: to.email, name: to.name }],
            subject,
            htmlContent: html,
        }),
    });

    if (!res.ok) {
        throw new Error(`Brevo returned ${res.status}: ${await res.text()}`);
    }
}