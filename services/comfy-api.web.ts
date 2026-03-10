import { useServersStore } from "@/features/server/stores/server-store";
import { buildServerUrl, fetchWithAuth } from "./network";

interface UploadImageResponse {
  name: string;
  subfolder: string;
  type: string;
  previewUrl: string;
}

function resolveImageMimeType(fileName: string, mimeType?: string): string {
  if (mimeType && mimeType.startsWith('image/')) {
    return mimeType;
  }
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

export interface ServerWorkflowFile {
  filename: string;
  size: number;
  modified: number;
  raw_content?: string;
}

interface ListWorkflowsResponse {
  status: string;
  workflows: ServerWorkflowFile[];
}

export const uploadImage = (
  fileUri: string,
  fileName: string,
  serverId: string,
  mimeType?: string,
  onProgress?: (progress: number) => void
): { promise: Promise<UploadImageResponse>; cancel: () => Promise<void> } => {
  const server = useServersStore.getState().servers.find((s) => s.id === serverId);
  if (!server) {
    return {
      promise: Promise.reject(new Error('server not found')),
      cancel: async () => {},
    };
  }

  let abortController: AbortController | null = new AbortController();

  const promise = (async () => {
    const uploadPath = server.token
      ? `/upload/image?token=${encodeURIComponent(server.token)}`
      : '/upload/image';
    const url = await buildServerUrl(server.useSSL, server.host, server.port, uploadPath);

    const response = await window.fetch(fileUri);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('image', blob, fileName);
    formData.append('type', 'input');
    formData.append('overwrite', 'true');

    const headers: Record<string, string> = {};
    if (server.token) {
      headers['Authorization'] = `Bearer ${server.token}`;
    }

    const uploadResponse = await window.fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: abortController?.signal,
    });

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text().catch(() => '');
      throw new Error(`Failed to upload image (${uploadResponse.status}): ${details || 'empty response'}`);
    }

    if (onProgress) onProgress(1);

    const data = await uploadResponse.json();
    const baseUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/view');
    const params = new URLSearchParams();
    params.append('filename', data.name);
    if (data.subfolder) params.append('subfolder', data.subfolder);
    if (data.type) params.append('type', data.type);
    if (server.token) params.append('token', server.token);
    params.append('preview', 'webp;90');
    params.append('channel', 'rgba');
    return {
      name: data.name,
      subfolder: data.subfolder,
      type: data.type,
      previewUrl: `${baseUrl}?${params.toString()}`,
    };
  })();

  return {
    promise,
    cancel: async () => {
      abortController?.abort();
      abortController = null;
    },
  };
};

export const listWorkflows = async (serverId: string): Promise<ServerWorkflowFile[]> => {
  try {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) throw new Error('Server not found');

    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/api/cpe/workflow/list');
    const response = await fetchWithAuth(url, server.token, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list workflows: ${response.status} ${errorText}`);
    }

    const data: ListWorkflowsResponse = await response.json();
    if (data.status !== 'success') {
      throw new Error('Failed to list workflows: Server reported an error');
    }
    return data.workflows;
  } catch (error) {
    console.warn('Error listing workflows:', error);
    throw error;
  }
};

interface GetAndConvertWorkflowSuccessResponse {
  status: 'success';
  message: string;
  filename: string;
  data: { workflow: any };
}

interface GetAndConvertWorkflowErrorResponse {
  status: 'error';
  message: string;
  details?: string;
}

type GetAndConvertWorkflowResponse = GetAndConvertWorkflowSuccessResponse | GetAndConvertWorkflowErrorResponse;

export const getAndConvertWorkflow = async (serverId: string, filename: string): Promise<any> => {
  try {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) throw new Error('Server not found');

    const params = new URLSearchParams();
    params.append('filename', filename);
    const url = await buildServerUrl(server.useSSL, server.host, server.port, `/cpe/workflow/get-and-convert?${params.toString()}`);

    const response = await fetchWithAuth(url, server.token, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails = errorText;
      try {
        const errorJson: GetAndConvertWorkflowErrorResponse = JSON.parse(errorText);
        errorDetails = errorJson.message || errorText;
        if (errorJson.details) errorDetails += ` (Details: ${errorJson.details})`;
      } catch { /* raw text */ }
      throw new Error(`Failed to get and convert workflow: ${response.status} ${errorDetails}`);
    }

    const data: GetAndConvertWorkflowResponse = await response.json();
    if (data.status !== 'success') {
      const errorResponse = data as GetAndConvertWorkflowErrorResponse;
      let errorMessage = `Failed to get and convert workflow: ${errorResponse.message}`;
      if (errorResponse.details) errorMessage += ` (Details: ${errorResponse.details})`;
      throw new Error(errorMessage);
    }
    if (!data.data || typeof data.data.workflow === 'undefined') {
      throw new Error('Converted workflow data is missing in the response');
    }
    return data.data.workflow;
  } catch (error) {
    console.warn('Error getting and converting workflow:', error);
    throw error;
  }
};
