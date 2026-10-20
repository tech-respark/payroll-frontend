import { useAuth } from '../../context/AuthContext';
import { isOpsUser } from '../../access/homeAccess';
import { useOperationsHome } from './useHomeDashboard';

/**
 * Actionable inbox items for the header bell, from GET /home/operations.
 */
export const useHeaderNotifications = () => {
  const { hasAccess } = useAuth();

  const canLeave = hasAccess(['MANAGE_LEAVES']);
  const canReg = hasAccess(['MANAGE_ATTENDANCE']);
  const canHr = hasAccess(['VIEW_HR_DASHBOARD']);
  const canReceive = canLeave || canReg || canHr;

  const homeQuery = useOperationsHome({ includeSnapshot: false });
  const queues = isOpsUser(hasAccess) ? (homeQuery.data?.queues || {}) : {};

  const leaveCount = Number(queues.pendingLeave || 0);
  const regCount = Number(queues.pendingRegularization || 0);
  const onLeaveToday = Number(queues.onLeaveToday || 0);

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
      path: canLeave ? '/leave-approvals' : '/home',
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
      path: '/home',
      tone: 'primary',
      informational: true,
    });
  }

  return {
    total: leaveCount + regCount,
    items,
    isLoading: canReceive && homeQuery.isLoading,
    canReceive,
    leaveCount,
    regCount,
    onLeaveToday,
  };
};
