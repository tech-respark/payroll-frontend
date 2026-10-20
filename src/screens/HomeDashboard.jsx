import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuCalendarOff,
  LuClipboardCheck,
  LuClock,
  LuReceipt,
  LuUser,
  LuUsers,
  LuHistory,
  LuWallet,
} from 'react-icons/lu';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useActivityLog, useOperationsHome, useStaffHome } from '../hooks/queries';
import { isOpsUser } from '../access/homeAccess';
import { formatActivitySummary } from '../helpers/displayUtils';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog } from '../components/ui';
import HRDashboard from './HRDashboard';
import styles from './HomeDashboard.module.scss';

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function HomeDashboard() {
  const { hasAccess } = useAuth();
  return isOpsUser(hasAccess) ? <OperationsHome /> : <StaffHome />;
}

function StaffHome() {
  const history = useHistory();
  const { user, tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStaffHome();
  const [confirmOut, setConfirmOut] = useState(false);
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;

  const clock = useMutation({
    mutationFn: (payload) => apiService.post(`/hospitality/clock?${qs}`, payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['home-staff'] });
      queryClient.invalidateQueries({ queryKey: ['hospitality-me'] });
      showToast(payload.punchEvent === 'OUT' ? 'Clocked out' : 'Clocked in', 'success');
      setConfirmOut(false);
    },
    onError: (err) => showToast(err.message, 'error'),
  });

  const punch = (punchEvent) => {
    const send = (extra = {}) => clock.mutate({ punchEvent, ...extra });
    if (!navigator.geolocation) {
      send();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => send({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => send(),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  };

  const today = data?.today || {};
  const leave = data?.leave || {};
  const balances = leave.balances || [];
  const pendingLeave = Number(leave.pendingCount || 0);
  const pay = data?.pay;
  const firstName = formatName(data?.firstName || user?.firstName);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h2 className={styles.greeting}>{firstName ? `Hi ${firstName}.` : 'Hi.'}</h2>
        <p className={styles.today}>{todayLabel(today.date)}</p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <div className={styles.cardTitleRow}>
              <span>Today</span>
              <Badge variant={today.clockedIn ? 'success' : 'default'}>{today.clockedIn ? 'On shift' : 'Off shift'}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <p className={styles.lead}>{isLoading ? 'Loading today’s shift…' : shiftCopy(today.shift)}</p>
            <div className={styles.actions}>
              {today.clockedIn ? (
                <Button variant="danger" disabled={clock.isPending} onClick={() => setConfirmOut(true)}>
                  Clock out
                </Button>
              ) : (
                <Button disabled={clock.isPending} onClick={() => punch('IN')}>
                  Clock in
                </Button>
              )}
              <Button variant="outline" onClick={() => history.push('/my-work')}>My Work</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className={styles.cardTitleRow}>
              <span>Leave</span>
              {pendingLeave > 0 && <Badge variant="warning">{pendingLeave} pending</Badge>}
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <p className={styles.muted}>Loading balances…</p>
            ) : balances.length === 0 ? (
              <p className={styles.muted}>No leave balances are assigned yet.</p>
            ) : (
              <ul className={styles.balanceList}>
                {balances.map((row) => (
                  <li key={row.id}>
                    <span>{row.type}</span>
                    <strong>{row.available}</strong>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              <Button onClick={() => history.push('/leave-dashboard?apply=1')}>Request leave</Button>
              <Button variant="outline" onClick={() => history.push('/leave-dashboard')}>My Leaves</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {pay && (
        <Card>
          <CardHeader>Payslip</CardHeader>
          <CardBody>
            <p className={styles.lead}>Last calculated month is {pay.lastCalculatedMonth}.</p>
            <div className={styles.actions}>
              <Button onClick={() => history.push('/payslips')}>Open payslips</Button>
              <Button variant="outline" onClick={() => history.push('/salary')}>Salary</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <section>
        <p className={styles.sectionLabel}>Quick access</p>
        <div className={styles.shortcuts}>
          <Shortcut icon={LuClipboardCheck} label="Attendance" onClick={() => history.push('/attendance')} />
          <Shortcut icon={LuClock} label="My Work" onClick={() => history.push('/my-work')} />
          <Shortcut icon={LuCalendarOff} label="My Leaves" onClick={() => history.push('/leave-dashboard')} />
          {pay && <Shortcut icon={LuReceipt} label="Payslips" onClick={() => history.push('/payslips')} />}
          <Shortcut icon={LuUser} label="Profile" onClick={() => history.push('/staff')} />
        </div>
      </section>

      <ConfirmDialog
        open={confirmOut}
        title="Clock out?"
        body="This records the end of your current shift."
        confirmLabel="Clock out"
        danger
        busy={clock.isPending}
        onClose={() => setConfirmOut(false)}
        onConfirm={() => punch('OUT')}
      />
    </div>
  );
}

function OperationsHome() {
  const history = useHistory();
  const { hasAccess } = useAuth();
  const { data, isLoading } = useOperationsHome({ includeSnapshot: true });
  const canLeave = hasAccess(['MANAGE_LEAVES']);
  const canReg = hasAccess(['MANAGE_ATTENDANCE']);
  const canStaff = hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']);
  const canActivity = hasAccess(['VIEW_ACTIVITY_LOG']);
  const queues = data?.queues || {};
  const pay = data?.pay;
  const leaveCount = queues.pendingLeave;
  const regCount = queues.pendingRegularization;
  const onLeaveToday = queues.onLeaveToday;

  return (
    <div className={styles.page}>
      <div className={styles.queueGrid}>
        {leaveCount != null && (
          <QueueCard
            label="Leave approvals"
            value={isLoading ? '…' : leaveCount}
            hint={leaveCount === 1 ? 'request waiting' : 'requests waiting'}
            action={canLeave ? 'Review leave' : 'Open leave'}
            onClick={() => history.push(canLeave ? '/leave-approvals' : '/leave-dashboard')}
          />
        )}
        {regCount != null && (
          <QueueCard
            label="Regularization"
            value={isLoading ? '…' : regCount}
            hint={regCount === 1 ? 'correction waiting' : 'corrections waiting'}
            action="Review punches"
            onClick={() => history.push('/approvals')}
          />
        )}
        {onLeaveToday != null && (
          <QueueCard
            label="Away today"
            value={isLoading ? '…' : onLeaveToday}
            hint={onLeaveToday === 1 ? 'person on leave' : 'people on leave'}
            action="Staff directory"
            onClick={() => history.push('/staff')}
          />
        )}
        {pay && (
          <QueueCard
            label="Payroll"
            value={pay.lastCalculatedMonth}
            hint="Last calculated month"
            action="Open salary"
            onClick={() => history.push('/salary')}
          />
        )}
      </div>

      <section>
        <p className={styles.sectionLabel}>Jump to</p>
        <div className={styles.shortcuts}>
          {canStaff && <Shortcut icon={LuUsers} label="Staff" onClick={() => history.push('/staff')} />}
          <Shortcut icon={LuClipboardCheck} label="Attendance" onClick={() => history.push('/attendance')} />
          {canLeave && <Shortcut icon={LuCalendarOff} label="Leave approvals" onClick={() => history.push('/leave-approvals')} />}
          {canReg && <Shortcut icon={LuClock} label="Approvals" onClick={() => history.push('/approvals')} />}
          {pay && <Shortcut icon={LuWallet} label="Salary" onClick={() => history.push('/salary')} />}
          {pay && <Shortcut icon={LuReceipt} label="Payslips" onClick={() => history.push('/payslips')} />}
          {canActivity && <Shortcut icon={LuHistory} label="Activity log" onClick={() => history.push('/activity')} />}
        </div>
      </section>

      {canActivity && <RecentActivity />}

      {data?.snapshot && <HRDashboard embedded metrics={data.snapshot} />}
    </div>
  );
}

function activityVariant(item) {
  if (item.outcome === 'FAILURE' || item.outcome === 'DENIED') return 'danger';
  switch (item.module) {
    case 'LEAVE':
    case 'HOSPITALITY':
      return 'success';
    case 'ATTENDANCE':
    case 'PAYROLL':
      return 'info';
    case 'ROLES':
    case 'AUTH':
      return 'warning';
    case 'STAFF':
    case 'SHIFTS':
      return 'primary';
    default:
      return 'default';
  }
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SY';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function formatActivityWhen(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RecentActivity() {
  const history = useHistory();
  const { data, isLoading } = useActivityLog({ size: 5 });
  const items = data?.items || [];
  const openLog = () => history.push('/activity');

  return (
    <Card>
      <CardHeader>
        <div className={styles.cardTitleRow}>
          <span>Recent activity</span>
          <Button variant="text" onClick={openLog}>Open log</Button>
        </div>
      </CardHeader>
      {isLoading ? (
        <CardBody>
          <p className={styles.muted}>Loading activity…</p>
        </CardBody>
      ) : items.length === 0 ? (
        <CardBody>
          <p className={styles.muted}>Actions such as leave approvals and role changes will appear here.</p>
        </CardBody>
      ) : (
        <ul className={styles.activityList}>
          {items.map((item) => {
            const actor = item.actorDisplayName || 'System';
            const extra = item.resourceLabel && item.resourceLabel !== actor
              ? ` · ${formatActivitySummary(item.resourceLabel)}`
              : '';
            return (
              <li key={item.id}>
                <button type="button" className={styles.activityRow} onClick={openLog}>
                  <span className={styles.activityAvatar} aria-hidden>{initials(actor)}</span>
                  <span className={styles.activityCopy}>
                    <span className={styles.activitySummary}>{formatActivitySummary(item.summary)}</span>
                    <span className={styles.activityMeta}>{actor}{extra}</span>
                  </span>
                  <span className={styles.activityWhen}>{formatActivityWhen(item.occurredAt)}</span>
                  <Badge variant={activityVariant(item)}>
                    {item.outcome === 'FAILURE' || item.outcome === 'DENIED'
                      ? 'Failed'
                      : (item.moduleLabel || item.module)}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function QueueCard({ label, value, hint, action, onClick }) {
  return (
    <button type="button" className={styles.queueCard} onClick={onClick}>
      <span className={styles.queueLabel}>{label}</span>
      <span className={styles.queueValue}>{value}</span>
      <span className={styles.queueHint}>{hint}</span>
      <span className={styles.queueAction}>{action}</span>
    </button>
  );
}

function Shortcut({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className={styles.shortcut} onClick={onClick}>
      <Icon size={18} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}

function todayLabel(iso) {
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date();
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatSlot(slot) {
  if (!slot) return '';
  const [from, to] = String(slot).split(/[-–]/).map((part) => part.trim());
  if (!to) return from;
  return `${from}–${to}`;
}

function shiftCopy(shift) {
  if (!shift) return 'No rostered shift today. You can still clock if you are covering.';
  if (shift.onLeave) return 'You are marked on leave today.';
  if (shift.weeklyOff) return 'Today is a weekly off.';
  return shift.slot ? `Rostered ${formatSlot(shift.slot)}` : 'You have a shift today.';
}
