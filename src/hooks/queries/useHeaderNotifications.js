import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';
import { addDaysToDateKey, todayLocalKey } from '../../helpers/dateUtils';

/**
 * Aggregates actionable inbox items for the header notifications panel.
 * Prefers HR metrics when available (applications/pending can lag or differ).
 */
export const useHeaderNotifications = () => {
  const { tenantId, storeId, hasAccess } = useAuth();

  const canLeave = hasAccess(['MANAGE_LEAVES', 'APPROVE_LEAVES']);
  const canReg = hasAccess(['MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE']);
  const canHr = hasAccess(['VIEW_HR_DASHBOARD']);

  const metricsQuery = useQuery({
    queryKey: ['headerNotifMetrics', tenantId, storeId],
    queryFn: async () => apiService.get('/admin/dashboard/metrics', {
      Tenantid: String(tenantId),
      Storeid: String(storeId),
      'X-TenantID': String(tenantId),
      'X-StoreID': String(storeId),
    }),
    enabled: canHr && !!tenantId && !!storeId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const leaveQuery = useQuery({
    queryKey: ['headerNotifLeaves', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(
        `/leaves/applications/pending?tenantId=${tenantId}&storeId=${storeId}`
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId && !!storeId && canLeave && !canHr,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const regQuery = useQuery({
    queryKey: ['headerNotifRegs', tenantId, storeId],
    queryFn: async () => {
      const to = todayLocalKey();
      const from = addDaysToDateKey(to, -45);
      const payload = {
        tenantId,
        storeId,
        applicationName: 'RESPARK',
        fromDate: from,
        toDate: to,
        currentStatus: 'PENDING',
        staffId: null,
        pageModel: {
          recordsPerPage: 1,
          pageNumber: 1,
        },
      };
      const res = await apiService.post('/regularizationRequests', payload, {
        Tenantid: String(tenantId),
        Storeid: String(storeId),
        'x-allowed-store-ids': String(storeId),
      });
      const body = res?.data || res || {};
      return Number(body?.pageModel?.totalNumberOfRecords || 0);
    },
    enabled: !!tenantId && !!storeId && canReg,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const leaveFromMetrics = Number(metricsQuery.data?.pendingLeaveRequests || 0);
  const leaveFromList = leaveQuery.data?.length || 0;
  const leaveCount = canHr ? leaveFromMetrics : canLeave ? leaveFromList : 0;
  const onLeaveToday = canHr ? Number(metricsQuery.data?.staffOnLeaveToday || 0) : 0;
  const regCount = canReg ? (regQuery.data || 0) : 0;

  const items = [];
  if ((canLeave || canHr) && leaveCount > 0) {
    items.push({
      id: 'leave-approvals',
      title: 'Leave approvals',
      detail:
        leaveCount === 1
          ? '1 leave request needs review'
          : `${leaveCount} leave requests need review`,
      count: leaveCount,
      path: canLeave ? '/leave-approvals' : '/hr-dashboard',
      tone: 'primary',
    });
  }
  if (canReg && regCount > 0) {
    items.push({
      id: 'reg-approvals',
      title: 'Regularization approvals',
      detail:
        regCount === 1
          ? '1 attendance correction is pending'
          : `${regCount} attendance corrections are pending`,
      count: regCount,
      path: '/approvals',
      tone: 'warn',
    });
  }
  if (canHr && onLeaveToday > 0) {
    items.push({
      id: 'on-leave-today',
      title: 'Staff on leave today',
      detail:
        onLeaveToday === 1
          ? '1 person is away today'
          : `${onLeaveToday} people are away today`,
      count: onLeaveToday,
      path: '/hr-dashboard',
      tone: 'primary',
      informational: true,
    });
  }

  const actionableTotal = leaveCount + regCount;
  const total = actionableTotal;

  const isLoading =
    (canHr && metricsQuery.isLoading) ||
    (canLeave && !canHr && leaveQuery.isLoading) ||
    (canReg && regQuery.isLoading);

  return {
    total,
    items,
    isLoading,
    canReceive: canLeave || canReg || canHr,
    leaveCount,
    regCount,
  };
};
