export function gmailConfiguration() { return { configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "" }; }
export async function syncGmailHistory(_historyId: string) { throw new Error("Sincronización Gmail pendiente de implementación"); }
