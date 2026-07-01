/**
 * Codificacao de mensagens HTTP signaling para evitar bloqueio de WAF/proxy
 * em POST com JSON WebRTC (rtpCapabilities, dtlsParameters, etc.).
 */

export const WIRE_ENC = 'b64json';

export function encodeWirePayload(payload) {
  const json = JSON.stringify(payload ?? {});
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  return Buffer.from(json, 'utf8').toString('base64');
}

export function decodeWirePayload(encoded) {
  if (encoded == null || encoded === '') return {};
  if (typeof encoded !== 'string') return encoded;
  if (typeof atob === 'function') {
    const bin = atob(encoded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
}

export function wrapWireMessage(msg) {
  if (!msg || typeof msg.type !== 'string') return msg;
  return {
    type: msg.type,
    enc: WIRE_ENC,
    payload: encodeWirePayload(msg.payload)
  };
}

export function unwrapWireMessage(msg) {
  if (!msg || msg.enc !== WIRE_ENC || typeof msg.payload !== 'string') return msg;
  return {
    type: msg.type,
    payload: decodeWirePayload(msg.payload)
  };
}

export function unwrapWireMessages(messages) {
  return (messages || []).map(unwrapWireMessage);
}
