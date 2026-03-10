import { Server } from '@/features/server/types';

export async function fetchWithAuth(
  url: string,
  token: string | undefined,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  return window.fetch(url, {
    ...options,
    headers,
  });
}

export async function isLocalOrLanIP(host: string): Promise<boolean> {
  const ip = host.split(':')[0];
  if (ip === 'localhost' || ip === '127.0.0.1') return true;
  const parts = ip.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
  }
  if (ip.endsWith('.local')) return true;
  return false;
}

export async function buildServerUrl(useSSL: Server['useSSL'], host: string, port: string | number, path: string): Promise<string> {
  if (useSSL === 'Always') {
    return `https://${host}:${port}${path}`;
  } else if (useSSL === 'Never') {
    return `http://${host}:${port}${path}`;
  } else {
    const isLocal = await isLocalOrLanIP(host);
    const protocol = isLocal ? 'http' : 'https';
    return `${protocol}://${host}:${port}${path}`;
  }
}

const MIN_PORT = 1;
const MAX_PORT = 65535;

export function validateHost(host: string): string {
  if (host.length === 0) {
    return 'Host is required';
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9-]{2,})+$/;
  const localhostRegex = /^localhost$/;
  if (!ipRegex.test(host) && !domainRegex.test(host) && !localhostRegex.test(host)) {
    return 'Invalid host or IP address';
  }
  if (ipRegex.test(host)) {
    const parts = host.split('.');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return 'Invalid IP address';
      }
    }
  }
  return '';
}

export function validatePort(port: string): string {
  if (port.length === 0) {
    return 'Port is required';
  }
  const portNum = parseInt(port, 10);
  if (isNaN(portNum)) {
    return 'Port must be a number';
  }
  if (portNum < MIN_PORT || portNum > MAX_PORT) {
    return `Port must be between ${MIN_PORT} and ${MAX_PORT}`;
  }
  return '';
}

export function parseServerUrl(url: string): { host: string; port: string; useSSL: Server['useSSL'] } | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }
    const host = urlObj.hostname;
    let port = urlObj.port;
    if (!port) {
      port = urlObj.protocol === 'https:' ? '443' : '80';
    }
    const useSSL: Server['useSSL'] = 'Auto';
    const hostValidation = validateHost(host);
    if (!host || hostValidation !== '') {
      return null;
    }
    const portValidation = validatePort(port);
    if (portValidation !== '') {
      return null;
    }
    return { host, port, useSSL };
  } catch (error) {
    return null;
  }
}
