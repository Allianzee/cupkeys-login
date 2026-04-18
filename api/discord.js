export default async function handler(req, res) {
  console.log('Discord API called, method:', req.method);
  
  // Allow POST and OPTIONS (for CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  console.log('Received code:', code ? 'yes' : 'no');

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    console.log('Exchanging code for token...');
    
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
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Discord token error:', tokenData);
      return res.status(401).json({ 
        success: false,
        error: tokenData.error || 'Failed to exchange code for token' 
      });
    }

    const accessToken = tokenData.access_token;
    console.log('Got access token');

    // Get user info
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = await userResponse.json();
    console.log('Got user:', user.username);

    if (!user.email) {
      return res.status(400).json({ 
        success: false,
        error: 'Discord account missing email - please enable email in Discord settings' 
      });
    }

    console.log('Success - returning user data');
    
    // Return user info (frontend will handle Firebase auth)
    return res.status(200).json({
      success: true,
      email: user.email,
      discordId: user.id,
      username: user.username
    });

  } catch (error) {
    console.error('Discord API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
