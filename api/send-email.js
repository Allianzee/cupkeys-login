export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, type, username } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if SendGrid API key exists
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid not configured, skipping email');
      return res.status(200).json({ success: true, message: 'Email service not configured' });
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    let subject, htmlContent;

    if (type === 'register') {
      subject = '🧁 Welcome to Cupkeys!';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Welcome to Cupkeys!</h2>
          <p>Hi ${username || 'Player'},</p>
          <p>Your account has been successfully created! 🎉</p>
          <p>You're now ready to start serving delicious cupcakes and earning points!</p>
          <p style="margin-top: 30px;">
            <a href="https://cupkeys-login-xyz.vercel.app/" style="padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Open Cupkeys
            </a>
          </p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            If you didn't create this account, please ignore this email.
          </p>
          <p style="color: #999; font-size: 12px;">Happy cooking! 🧁</p>
        </div>
      `;
    } else if (type === 'login') {
      subject = '🧁 Login Notification - Cupkeys';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Login Successful!</h2>
          <p>Hi ${username || 'Player'},</p>
          <p>You just logged into your Cupkeys account.</p>
          <p><strong>Location:</strong> ${req.headers['x-forwarded-for'] || 'Unknown'}</p>
          <p style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; color: #666;">
            If this wasn't you, please change your password immediately!
          </p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            Happy serving! 🧁
          </p>
        </div>
      `;
    } else {
      return res.status(400).json({ error: 'Invalid email type' });
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cupkeys.com',
      subject: subject,
      html: htmlContent
    };

    await sgMail.send(msg);

    return res.status(200).json({ success: true, message: 'Email sent' });

  } catch (error) {
    console.error('SendGrid error:', error);
    // Don't fail if email fails - just log it
    return res.status(200).json({ success: true, message: 'Email service unavailable' });
  }
}
