import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';
import { isOpsUser } from '../../access/homeAccess';

const unwrap = (res) => res?.data ?? res ?? {};

export const useStaffHome = () => {
  const { tenantId, storeId, user } = useAuth();
  return useQuery({
    queryKey: ['home-staff', tenantId, storeId, user?.staffId],
    queryFn: async () => unwrap(await apiService.get('/home/staff')),
    enabled: !!tenantId && !!storeId,
  });
};

export const useOperationsHome = ({ includeSnapshot = true } = {}) => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  return useQuery({
    queryKey: ['home-operations', tenantId, storeId, user?.staffId, includeSnapshot ? 'full' : 'queues'],
    queryFn: async () => unwrap(await apiService.get(`/home/operations?includeSnapshot=${includeSnapshot}`)),
    enabled: isOpsUser(hasAccess) && !!tenantId && !!storeId,
    staleTime: 60_000,
    refetchInterval: includeSnapshot ? false : 120_000,
  });
};
