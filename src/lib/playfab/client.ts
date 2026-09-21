import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from './config';

/**
 * Low-level PlayFab REST API caller.
 * All PlayFab REST endpoints return JSON with shape { code, status, data }.
 */
export interface PlayFabApiResponse<T = unknown> {
  code: number;
  status: string;
  data: T;
}

export class PlayFabError extends Error {
  constructor(
    public readonly code: number,
    public readonly apiError: string,
    public readonly errorCode?: number,
    public readonly errorDetails?: Record<string, string[]>,
  ) {
    super(apiError);
    this.name = 'PlayFabError';
  }
}

/**
 * Make a PlayFab Client API call.
 * @param path - API path, e.g. '/Client/LoginWithEmailAddress'
 * @param body - Request body
 * @param sessionTicket - Optional session ticket for authenticated calls
 */
export async function playfabClientApi<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  sessionTicket?: string,
): Promise<T> {
  if (typeof window !== 'undefined') {
    const proxyResponse = await fetch('/api/playfab/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, body }),
    });
    const proxyJson = await proxyResponse.json();
    if (!proxyResponse.ok || proxyJson.code !== 200) {
      throw new PlayFabError(
        proxyJson.code ?? proxyResponse.status,
        proxyJson.errorMessage ?? proxyJson.status ?? 'PlayFab API error',
        proxyJson.errorCode,
        proxyJson.errorDetails,
      );
    }
    return proxyJson.data as T;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionTicket) {
    headers['X-Authorization'] = sessionTicket;
  }

  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok || json.code !== 200) {
    throw new PlayFabError(
      json.code ?? response.status,
      json.errorMessage ?? json.status ?? 'PlayFab API error',
      json.errorCode,
      json.errorDetails,
    );
  }

  return json.data as T;
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Make a PlayFab Server API call using a secret key.
 * @param path - API path, e.g. '/Server/GetPlayerTags'
 * @param body - Request body
 * @param secretKey - PlayFab Secret Key for authentication
 */
export async function playfabServerApi<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  secretKey: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-SecretKey': secretKey,
  };

  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, TitleId: PLAYFAB_TITLE_ID }),
  });

  const json = await response.json();

  if (!response.ok || json.code !== 200) {
    throw new PlayFabError(
      json.code ?? response.status,
      json.errorMessage ?? json.status ?? 'PlayFab Server API error',
      json.errorCode,
      json.errorDetails,
    );
  }

  return json.data as T;
}
