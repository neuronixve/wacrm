/**
 * Evolution API Client (Self-Hosted WhatsApp QR Provider)
 * Handles instance management, QR code retrieval, and message dispatch.
 */

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'https://evolution.neuronix.com.ve').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';

export interface EvolutionQrResult {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface EvolutionConnectionState {
  instance?: {
    instanceName?: string;
    state?: 'open' | 'close' | 'connecting';
  };
  state?: 'open' | 'close' | 'connecting';
}

export interface EvolutionSendMessageResult {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: Record<string, unknown>;
  messageTimestamp?: number;
  status?: string;
}

/**
 * Strips non-digits and leading + to format phone number for Baileys/Evolution API
 */
export function formatPhoneNumberForEvolution(phone: string): string {
  if (phone.includes('@lid') || phone.includes('@g.us') || phone.includes('@s.whatsapp.net')) {
    return phone;
  }
  const digits = phone.replace(/\D/g, '');
  // WhatsApp LIDs (Linked Identifiers) are 14-16 digits (e.g. 51874816344264)
  if (digits.length >= 14 && digits.length <= 16) {
    return `${digits}@lid`;
  }
  return digits;
}

async function evolutionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    let errorMsg = '';
    const rawMessage = data?.response?.message || data?.message;
    if (Array.isArray(rawMessage)) {
      errorMsg = rawMessage
        .map((m: any) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
        .join(', ');
    } else if (rawMessage && typeof rawMessage === 'object') {
      errorMsg = JSON.stringify(rawMessage);
    } else if (rawMessage) {
      errorMsg = String(rawMessage);
    } else {
      errorMsg = res.statusText || 'Evolution API request failed';
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Creates an instance in Evolution API.
 */
export async function createEvolutionInstance(instanceName: string): Promise<any> {
  try {
    return await evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  } catch (err: any) {
    // If instance already exists, that's fine
    if (err.message?.includes('already exists') || err.message?.includes('is already in use')) {
      return { instance: { instanceName }, message: 'Instance already exists' };
    }
    throw err;
  }
}

/**
 * Retrieves the QR Code for an instance.
 */
export async function getEvolutionQrCode(instanceName: string): Promise<EvolutionQrResult> {
  return await evolutionFetch<EvolutionQrResult>(`/instance/connect/${encodeURIComponent(instanceName)}`, {
    method: 'GET',
  });
}

/**
 * Checks connection state ('open' = connected, 'connecting' = waiting for scan, 'close' = disconnected).
 */
export async function getEvolutionConnectionState(instanceName: string): Promise<EvolutionConnectionState> {
  return await evolutionFetch<EvolutionConnectionState>(`/instance/connectionState/${encodeURIComponent(instanceName)}`, {
    method: 'GET',
  });
}

/**
 * Sets the webhook URL for receiving messages and status updates for this instance.
 */
export async function configureEvolutionWebhook(instanceName: string, webhookUrl: string): Promise<any> {
  return await evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'SEND_MESSAGE',
      ],
    }),
  });
}

/**
 * Disconnects (logs out) an instance.
 */
export async function logoutEvolutionInstance(instanceName: string): Promise<any> {
  return await evolutionFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });
}

/**
 * Deletes an instance completely from Evolution API.
 */
export async function deleteEvolutionInstance(instanceName: string): Promise<any> {
  return await evolutionFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });
}

/**
 * Sends a text message via Evolution API.
 */
export async function sendEvolutionTextMessage(
  instanceName: string,
  to: string,
  text: string
): Promise<EvolutionSendMessageResult> {
  const recipient = formatPhoneNumberForEvolution(to);
  return await evolutionFetch<EvolutionSendMessageResult>(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: recipient,
      options: {
        delay: 1200,
        presence: 'composing',
        linkPreview: true,
      },
      textMessage: {
        text,
      },
    }),
  });
}

/**
 * Sends a media message (image, video, document, audio) via Evolution API.
 */
export async function sendEvolutionMediaMessage(
  instanceName: string,
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'document' | 'video' | 'audio' = 'image',
  fileName?: string
): Promise<EvolutionSendMessageResult> {
  const recipient = formatPhoneNumberForEvolution(to);
  return await evolutionFetch<EvolutionSendMessageResult>(`/message/sendMedia/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: recipient,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      mediaMessage: {
        mediatype: mediaType,
        caption: caption || '',
        media: mediaUrl,
        fileName: fileName || `file_${Date.now()}`,
      },
    }),
  });
}
