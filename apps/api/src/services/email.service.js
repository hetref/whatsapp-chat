import nodemailer from 'nodemailer';

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getTransport() {
    const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
    let pass = (process.env.SMTP_PASS || '').trim();
    pass = pass.replace(/^["']|["']$/g, '').replace(/\s+/g, '');

    if (!user || !pass) {
        throw new Error('SMTP_USER and SMTP_PASS must be configured to send Flow submission emails.');
    }

    const port = Number.parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE.toLowerCase() === 'true'
        : port === 465;

    return {
        user,
        transport: nodemailer.createTransport({
            host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, ''),
            port,
            secure,
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
        }),
    };
}

export async function sendFlowSubmissionEmail({
    flowName,
    ownerEmail,
    ownerName,
    contactName,
    contactPhone,
    responseData,
    submittedAt,
}) {
    if (!ownerEmail) {
        throw new Error('The Flow owner does not have an email address configured.');
    }

    const { user, transport } = getTransport();
    const from = (process.env.SMTP_FROM || `"WaChat" <${user}>`).replace(/^["']|["']$/g, '');
    const submittedDate = new Date(submittedAt).toLocaleString();
    const response = JSON.stringify(responseData, null, 2);
    const greeting = ownerName ? `Hi ${ownerName},` : 'Hello,';
    const contact = [contactName, contactPhone].filter(Boolean).join(' | ') || 'Unknown contact';

    await transport.sendMail({
        from,
        to: ownerEmail,
        subject: `New submission for ${flowName}`,
        text: `${greeting}\n\nA user completed your WhatsApp Flow "${flowName}".\n\nSubmitted by: ${contact}\nSubmitted at: ${submittedDate}\n\nResponse:\n${response}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #292524; line-height: 1.5;">
                <p>${escapeHtml(greeting)}</p>
                <p>A user completed your WhatsApp Flow <strong>${escapeHtml(flowName)}</strong>.</p>
                <p><strong>Submitted by:</strong> ${escapeHtml(contact)}<br>
                <strong>Submitted at:</strong> ${escapeHtml(submittedDate)}</p>
                <p><strong>Response</strong></p>
                <pre style="white-space: pre-wrap; overflow-wrap: anywhere; background: #f5f5f4; padding: 16px; border-radius: 8px;">${escapeHtml(response)}</pre>
            </div>
        `,
    });
}
