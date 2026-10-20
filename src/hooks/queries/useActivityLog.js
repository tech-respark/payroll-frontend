import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

const unwrap = (res) => res?.data ?? res ?? {};

const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
};

export const useActivityCatalog = () => {
  const { tenantId, storeId, hasAccess } = useAuth();
  return useQuery({
    queryKey: ['activity-catalog', tenantId, storeId],
    queryFn: async () => unwrap(await apiService.get('/activity/catalog')),
    enabled: hasAccess(['VIEW_ACTIVITY_LOG']) && !!tenantId && !!storeId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useActivityLog = (filters = {}) => {
  const { tenantId, storeId, hasAccess } = useAuth();
  const query = toQuery({
    tenantId,
    storeId,
    module: filters.module,
    action: filters.action,
    q: filters.q,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
  });
  return useQuery({
    queryKey: ['activity-log', tenantId, storeId, query],
    queryFn: async () => unwrap(await apiService.get(`/activity?${query}`)),
    enabled: hasAccess(['VIEW_ACTIVITY_LOG']) && !!tenantId && !!storeId,
    placeholderData: (previous) => previous,
  });
};
