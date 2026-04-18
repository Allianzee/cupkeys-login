export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange Discord code for token
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Discord token error:', tokenData);
      return res.status(401).json({ error: 'Failed to exchange code for token' });
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = await userResponse.json();

    if (!user.email) {
      return res.status(400).json({ error: 'Discord account missing email' });
    }

    // Return user info (frontend will handle Firebase auth)
    return res.status(200).json({
      success: true,
      email: user.email,
      discordId: user.id,
      username: user.username
    });

  } catch (error) {
    console.error('Discord API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
