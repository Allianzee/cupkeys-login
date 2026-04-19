// In-memory token store
// Survives as long as the Vercel serverless function is warm
// Good enough for a 5 minute code exchange window
const tokenStore = new Map();

export default function handler(req, res)
{
    // Allow UE5 HTTP requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS')
    {
        return res.status(200).end();
    }

    // -------------------------
    // POST - Website stores token, gets short code
    // -------------------------
    if (req.method === 'POST')
    {
        const { idToken, userId, email } = req.body;

        if (!idToken || !userId)
        {
            return res.status(400).json(
            {
                error: 'Missing idToken or userId'
            });
        }

        const code = generateCode();

        tokenStore.set(code,
        {
            idToken,
            userId,
            email,
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        });

        // Clean up old expired entries
        cleanupExpired();

        console.log(`[exchange-token] Stored code: ${code} for user: ${userId}`);

        return res.status(200).json({ code });
    }

    // -------------------------
    // GET - UE5 exchanges short code for real token
    // -------------------------
    if (req.method === 'GET')
    {
        const { code } = req.query;

        if (!code)
        {
            return res.status(400).json(
            {
                error: 'Missing code parameter'
            });
        }

        const stored = tokenStore.get(code);

        if (!stored)
        {
            console.log(`[exchange-token] Code not found: ${code}`);
            return res.status(404).json(
            {
                error: 'Code not found or already used'
            });
        }

        if (Date.now() > stored.expiresAt)
        {
            tokenStore.delete(code);
            console.log(`[exchange-token] Code expired: ${code}`);
            return res.status(410).json(
            {
                error: 'Code has expired'
            });
        }

        // Delete immediately - one time use only
        tokenStore.delete(code);

        console.log(`[exchange-token] Code exchanged successfully: ${code}`);

        return res.status(200).json(
        {
            idToken: stored.idToken,
            userId:  stored.userId,
            email:   stored.email
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// -------------------------
// Generate 8 char code
// No 0/O or 1/I to avoid confusion
// -------------------------
function generateCode()
{
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++)
    {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// -------------------------
// Clean up expired entries
// -------------------------
function cleanupExpired()
{
    const now = Date.now();
    for (const [key, value] of tokenStore.entries())
    {
        if (now > value.expiresAt)
        {
            tokenStore.delete(key);
        }
    }
}
