import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json());

const PORT = Number(process.env.API_PORT ?? 3001);

app.post('/api/send-bank-otp', async (req, res) => {
  const { to, code, amount } = req.body ?? {};

  if (!to || !code) {
    return res.status(400).json({ error: 'Missing required fields: to, code' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(503).json({ error: 'Twilio credentials not configured' });
  }

  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(accountSid, authToken);

    const formattedAmount = Number(amount ?? 0).toFixed(2);
    await client.messages.create({
      from: fromNumber,
      to: String(to),
      body: `ShaurmYAN 3D Secure: უსაფრთხოების კოდი ${code}. თანხა: ₾${formattedAmount}. არ გაუზიაროთ.`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Twilio SMS failed:', error);
    const message = error instanceof Error ? error.message : 'SMS send failed';
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`ShaurmYAN API listening on http://localhost:${PORT}`);
});
