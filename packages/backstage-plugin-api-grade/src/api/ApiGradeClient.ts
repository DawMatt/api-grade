import type { BackstageGradeResponse } from 'backstage-plugin-api-grade-backend';

// Minimal Backstage API interfaces (peer deps — provided by host app at runtime)
export interface DiscoveryApi {
  getBaseUrl(pluginId: string): Promise<string>;
}

export interface FetchApi {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export class ApiGradeClient {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async fetchGrade(entityRef: string): Promise<BackstageGradeResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('api-grade');
    const url = `${baseUrl}/grade?entityRef=${encodeURIComponent(entityRef)}`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body && typeof body === 'object' && 'status' in body) {
        return body as BackstageGradeResponse;
      }
      throw new Error(`Unexpected response from API grade backend: ${response.status}`);
    }
    return response.json() as Promise<BackstageGradeResponse>;
  }
}
