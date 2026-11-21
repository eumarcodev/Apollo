import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AppError } from '@/shared/kernel';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';
import { fetchServerConfig, type ServerConfig } from './server-config';

export const SERVER_CONFIG_QUERY_KEY = ['server-config'] as const;

/** `GET /api/config`, shared by every slice that needs the platform, the version or the raw options. */
export function useServerConfig(http: HttpClient = httpClient): UseQueryResult<ServerConfig, AppError> {
  return useQuery<ServerConfig, AppError>({
    queryKey: SERVER_CONFIG_QUERY_KEY,
    queryFn: ({ signal }) => fetchServerConfig(http, signal),
  });
}
