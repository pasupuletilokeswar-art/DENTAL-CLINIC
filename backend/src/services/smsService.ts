/**
 * Automated SMS Gateway Service
 * Dispatches real SMS messages to patient mobile phones using:
 * 1. Fast2SMS (Indian carrier telecom networks - Jio, Airtel, Vi)
 * 2. Twilio (Global cellular SMS)
 * 3. Fallback Console Simulator
 */

export interface SendSmsPayload {
  to: string; // 10-digit Indian number or E.164 (+91...)
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  response?: any;
  error?: string;
}

/**
 * Clean phone number to 10-digit Indian standard
 */
export function cleanIndianMobile(raw: string): string {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Send real SMS using Fast2SMS API
 * https://www.fast2sms.com/
 */
async function sendViaFast2SMS(apiKey: string, mobile: string, message: string): Promise<SendSmsResult> {
  const url = 'https://www.fast2sms.com/dev/bulkV2';

  const body = {
    route: 'q', // Quick transactional route
    message: message,
    language: 'english',
    flash: 0,
    numbers: mobile,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json();

    if (data && data.return === true) {
      console.log(`[SMS Gateway: Fast2SMS] Real SMS delivered to +91${mobile}:`, data.request_id || 'OK');
      return {
        success: true,
        provider: 'FAST2SMS',
        messageId: data.request_id,
        response: data,
      };
    } else {
      console.error(`[SMS Gateway: Fast2SMS Error] Failed to send to +91${mobile}:`, data.message || data);
      return {
        success: false,
        provider: 'FAST2SMS',
        error: Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'SMS failed'),
        response: data,
      };
    }
  } catch (err: any) {
    console.error(`[SMS Gateway: Fast2SMS Network Error]:`, err.message);
    return {
      success: false,
      provider: 'FAST2SMS',
      error: err.message,
    };
  }
}

/**
 * Send real SMS using Twilio API
 */
async function sendViaTwilio(
  accountSid: string,
  authToken: string,
  fromPhone: string,
  mobile: string,
  message: string
): Promise<SendSmsResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const toNumber = mobile.startsWith('+') ? mobile : `+91${mobile}`;

  const params = new URLSearchParams();
  params.append('To', toNumber);
  params.append('From', fromPhone);
  params.append('Body', message);

  try {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data: any = await res.json();
    if (res.ok && data.sid) {
      console.log(`[SMS Gateway: Twilio] Real SMS delivered to ${toNumber}:`, data.sid);
      return {
        success: true,
        provider: 'TWILIO',
        messageId: data.sid,
        response: data,
      };
    } else {
      console.error(`[SMS Gateway: Twilio Error] Failed to send to ${toNumber}:`, data.message || data);
      return {
        success: false,
        provider: 'TWILIO',
        error: data.message || 'Twilio SMS failed',
        response: data,
      };
    }
  } catch (err: any) {
    console.error(`[SMS Gateway: Twilio Network Error]:`, err.message);
    return {
      success: false,
      provider: 'TWILIO',
      error: err.message,
    };
  }
}

/**
 * Main automated SMS dispatch function
 */
export async function sendAutomatedPatientSms(payload: SendSmsPayload): Promise<SendSmsResult> {
  const cleanMobile = cleanIndianMobile(payload.to);
  if (!cleanMobile || cleanMobile.length !== 10) {
    console.warn(`[SMS Gateway] Invalid phone number provided: "${payload.to}". Must be a valid 10-digit number.`);
    return {
      success: false,
      provider: 'NONE',
      error: `Invalid mobile number: "${payload.to}"`,
    };
  }

  const fast2SmsKey = process.env.FAST2SMS_API_KEY || '';
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || '';

  // 1. Check if Fast2SMS is configured
  if (fast2SmsKey) {
    return await sendViaFast2SMS(fast2SmsKey, cleanMobile, payload.message);
  }

  // 2. Check if Twilio is configured
  if (twilioSid && twilioAuth && twilioFrom) {
    return await sendViaTwilio(twilioSid, twilioAuth, twilioFrom, cleanMobile, payload.message);
  }

  // 3. Fallback: Simulation mode with alert in logs
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`[SMS GATEWAY READY FOR PRODUCTION KEY]`);
  console.log(`Target Patient Mobile: +91 ${cleanMobile}`);
  console.log(`Message Body:\n${payload.message}`);
  console.log(`NOTE: To transmit to real physical carrier towers, add FAST2SMS_API_KEY to docker-compose.yml.`);
  console.log(`--------------------------------------------------------------------------------`);

  return {
    success: true,
    provider: 'SIMULATED',
    messageId: `SIM-${Date.now()}`,
  };
}
