import { Model, Server } from '@/features/server/types';
import { buildServerUrl, fetchWithAuth } from '@/services/network';

export interface ServerStatus {
  isOnline: boolean;
  latency: number;
}

export interface CheckServerOptions {
  timeout?: number;
  endpoint?: string;
}

interface SystemStats {
  system: {
    os: string;
    comfyui_version: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ModelResponse {
  name: string;
  pathIndex: number;
  [key: string]: any;
}

export async function scanServerModelsByFolder(
  server: Server,
  folderName: string,
  isWindowsServer?: boolean,
): Promise<Model[]> {
  const models: Model[] = [];
  try {
    const modelsUrl = await buildServerUrl(server.useSSL, server.host, server.port, `/experiment/models/${folderName}`);
    const modelsResponse = await fetchWithAuth(modelsUrl, server.token);
    if (!modelsResponse.ok) return [];

    const folderModels = (await modelsResponse.json()) as ModelResponse[];

    for (const model of folderModels) {
      if (!model.name || typeof model.pathIndex !== 'number') continue;
      if (folderName === 'checkpoints' && (
        model.name.includes('/') ||
        (isWindowsServer && model.name.includes('\\'))
      )) {
        continue;
      }
      models.push({ name: model.name, type: folderName, hasPreview: false });
    }
    return models;
  } catch (error) {
    console.error(`Failed to scan folder ${folderName}:`, error);
    return [];
  }
}

export async function scanServerModels(
  server: Server,
): Promise<{ models: Model[]; isCPEEnabled: boolean }> {
  const targetFolders = ['checkpoints', 'loras', 'vae', 'diffusion_models', 'text_encoders', 'upscale_models', 'controlnet', 'clip_vision', 'clip'];
  let models: Model[] = [];
  let isCPEEnabled = false;

  try {
    let isWindowsServer = false;
    try {
      const statsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
      const statsResponse = await fetchWithAuth(statsUrl, server.token);
      if (statsResponse.ok) {
        const systemStats = await statsResponse.json() as SystemStats;
        isWindowsServer = systemStats.system?.os === 'nt';
      }
    } catch { /* ignore */ }

    try {
      const extensionsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/extensions');
      const extensionsResponse = await fetchWithAuth(extensionsUrl, server.token);
      if (extensionsResponse.ok) {
        const extensionsData = await extensionsResponse.json();
        if (
          Array.isArray(extensionsData) &&
          extensionsData.some((ext: unknown) => typeof ext === 'string' && ext.includes('comfy-portal-endpoint'))
        ) {
          isCPEEnabled = true;
        }
      }
    } catch { /* ignore */ }

    const foldersUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/experiment/models');
    const foldersResponse = await fetchWithAuth(foldersUrl, server.token);
    if (!foldersResponse.ok) throw new Error('Failed to get model folders');

    const folders = await foldersResponse.json();

    await Promise.all(folders.map(async (folder: { name: string }) => {
      if (!targetFolders.includes(folder.name)) return;
      const folderModels = await scanServerModelsByFolder(server, folder.name, isWindowsServer);
      models = [...models, ...folderModels];
    }));

    return { models, isCPEEnabled };
  } catch (error) {
    console.error('Failed to scan server models:', error);
    return { models: [], isCPEEnabled: false };
  }
}

export async function checkServerStatus(
  server: Server,
): Promise<{ status: Server['status']; latency?: number; models?: Model[]; CPEEnable?: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
    const startTime = Date.now();
    const response = await fetchWithAuth(url, server.token, { method: 'GET', signal: controller.signal });
    const latency = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { status: 'offline' };
    }

    const { models, isCPEEnabled } = await scanServerModels(server);

    return { status: 'online', latency, models, CPEEnable: isCPEEnabled };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`[${server.name}] Server check timed out.`);
    } else {
      console.error(`[${server.name}] Error during server check:`, error);
    }
    return { status: 'offline' };
  }
}

export async function checkMultipleServers(servers: Server[]) {
  return Promise.all(
    servers.map(async (server) => {
      const result = await checkServerStatus(server);
      return { id: server.id, ...result };
    }),
  );
}
