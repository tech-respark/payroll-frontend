import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LuX } from 'react-icons/lu';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStaffList } from '../hooks/queries';
import { todayLocalKey } from '../helpers/dateUtils';
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal, Switch } from '../components/ui';
import styles from './HospitalityDashboard.module.scss';

const WEEKDAYS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];
const unwrap = (res) => res?.data ?? res ?? {};

export default function MyWorkDashboard() {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { staffList, rawStaffList } = useStaffList();
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const canDecide = hasAccess(['MANAGE_SHIFTS', 'MANAGE_HOSPITALITY']);
  const selfId = user?.staffId;
  const [swap, setSwap] = useState({ targetStaffId: '', shiftDate: '', reason: '' });
  const [availability, setAvailability] = useState({
    weekday: todayWeekday(),
    availableFrom: '09:00',
    availableTo: '18:00',
    available: true,
  });
  const [decision, setDecision] = useState(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const { data = {}, isLoading: meLoading } = useQuery({
    queryKey: ['hospitality-me'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/me?${qs}`)),
    enabled: !!tenantId && !!storeId,
  });
  const { data: swaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ['hospitality-swaps'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/swaps?${qs}`)),
    enabled: !!tenantId && !!storeId,
  });

  const clock = useMutation({
    mutationFn: (payload) => apiService.post(`/hospitality/clock?${qs}`, payload),
    onSuccess: (_, payload) => {
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
  const saveAvailability = useMutation({
    mutationFn: () => apiService.post(`/hospitality/availability?${qs}`, availability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitality-me'] });
      showToast(`${weekdayLabel(availability.weekday)} saved`, 'success');
    },
    onError: (err) => showToast(err.message, 'error'),
  });
  const createSwap = useMutation({
    mutationFn: () => {
      if (!swap.targetStaffId || !swap.shiftDate) throw new Error('Choose who you want to swap with and the date.');
      return apiService.post(`/hospitality/swaps?${qs}`, { ...swap, targetStaffId: Number(swap.targetStaffId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitality-swaps'] });
      showToast('Swap requested', 'success');
      setSwap({ targetStaffId: '', shiftDate: '', reason: '' });
      setSwapOpen(false);
    },
    onError: (err) => showToast(err.message, 'error'),
  });
  const decide = useMutation({
    mutationFn: ({ id, approved }) => apiService.post(`/hospitality/swaps/${id}/decide?${qs}`, { approved }),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['hospitality-swaps'] });
      showToast(payload.approved ? 'Swap approved' : 'Swap rejected', 'success');
      setDecision(null);
    },
    onError: (err) => showToast(err.message, 'error'),
  });

  const punches = data.todayPunches || [];
  const lastEvent = String(punches[punches.length - 1]?.punchEvent || '').toUpperCase();
  const clockedIn = lastEvent === 'IN' || lastEvent === 'CHECKIN';
  const lastIn = [...punches].reverse().find((item) => {
    const event = String(item.punchEvent || '').toUpperCase();
    return event === 'IN' || event === 'CHECKIN';
  });
  const swapList = useMemo(() => {
    const rows = Array.isArray(swaps) ? [...swaps] : [];
    const rank = (status) => (status === 'PENDING' ? 0 : status === 'APPROVED' ? 1 : 2);
    return rows.sort((a, b) => rank(a.status) - rank(b.status) || String(b.shiftDate || '').localeCompare(String(a.shiftDate || '')));
  }, [swaps]);
  const pendingSwaps = swapList.filter((row) => row.status === 'PENDING').length;
  const directory = (data.teammates || []).length
    ? data.teammates
    : (rawStaffList.length ? rawStaffList : staffList);
  const others = directory.filter((staff) => String(staff.id) !== String(selfId));
  const pickWeekday = (weekday, rows = []) => {
    const existing = (rows || []).find((item) => item.weekday === weekday);
    setAvailability({
      weekday,
      availableFrom: existing?.availableFrom || '09:00',
      availableTo: existing?.availableTo || '18:00',
      available: existing?.available !== false,
    });
  };

  const seededAvailability = useRef(false);
  useEffect(() => {
    if (seededAvailability.current || !data.availability) return;
    seededAvailability.current = true;
    pickWeekday(todayWeekday(), data.availability);
  }, [data.availability]);

  return (
    <div className={styles.stack}>
      <Card>
        <CardHeader>
          <div className={styles.headerRow}>
            <div className={styles.clockTitle}>
              <span>Clock</span>
              <small>{todayLabel()}</small>
            </div>
            <Badge variant={clockedIn ? 'success' : 'default'}>{clockedIn ? 'On shift' : 'Off shift'}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <p className={styles.shiftLine}>{shiftCopy(data.todayShift)}</p>
          {clockedIn && lastIn && (
            <p className={styles.clockSince}>In since {formatPunchTime(lastIn.punchTimestamp)}</p>
          )}
          <div className={styles.clockActions}>
            {clockedIn ? (
              <Button variant="danger" disabled={clock.isPending} onClick={() => setConfirmOut(true)}>
                Clock out
              </Button>
            ) : (
              <Button disabled={clock.isPending} onClick={() => punch('IN')}>
                Clock in
              </Button>
            )}
          </div>
          {clock.isPending && <p className={styles.hint}>Saving punch…</p>}
          {meLoading ? (
            <p className={styles.hint}>Loading today’s punches…</p>
          ) : punches.length === 0 ? (
            <p className={styles.empty}>No punches yet today.</p>
          ) : (
            <div className={styles.punchChips}>
              {punches.map((item) => (
                <span
                  key={item.id}
                  className={`${styles.punchChip} ${isOutEvent(item.punchEvent) ? styles.punchChipOut : styles.punchChipIn}`}
                >
                  {prettyPunch(item.punchEvent)} {formatPunchTime(item.punchTimestamp)}
                </span>
              ))}
            </div>
          )}
          <p className={styles.footnote}>A clock-out after midnight stays on yesterday’s shift.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>When I can work</CardHeader>
        <CardBody>
          <p className={styles.hint}>Tap a day, set the hours, then save. The roster uses this when someone is building the week.</p>
          <div className={styles.weekGrid}>
            {WEEKDAYS.map((day) => {
              const row = (data.availability || []).find((item) => item.weekday === day.value);
              const off = row && row.available === false;
              const chipClass = [
                availability.weekday === day.value ? styles.weekChipActive : styles.weekChip,
                off ? styles.weekChipOff : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={day.value}
                  type="button"
                  className={chipClass}
                  onClick={() => pickWeekday(day.value, data.availability)}
                >
                  <strong>{day.label.slice(0, 3)}</strong>
                  <span>{!row ? 'Not set' : off ? 'Off' : `${formatClock(row.availableFrom)}–${formatClock(row.availableTo)}`}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.inline}>
            <Input
              containerClassName={styles.compactField}
              label="From"
              type="time"
              value={availability.availableFrom}
              onChange={(e) => setAvailability((prev) => ({ ...prev, availableFrom: e.target.value }))}
              disabled={!availability.available}
            />
            <Input
              containerClassName={styles.compactField}
              label="To"
              type="time"
              value={availability.availableTo}
              onChange={(e) => setAvailability((prev) => ({ ...prev, availableTo: e.target.value }))}
              disabled={!availability.available}
            />
            <Switch
              className={styles.availSwitch}
              label={availability.available ? 'Available' : 'Off this day'}
              checked={availability.available}
              onChange={(e) => setAvailability((prev) => ({ ...prev, available: e.target.checked }))}
            />
            <Button onClick={() => saveAvailability.mutate()} disabled={saveAvailability.isPending}>
              {saveAvailability.isPending ? 'Saving…' : `Save ${weekdayLabel(availability.weekday)}`}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className={styles.headerRow}>
            <span>Shift swap</span>
            <div className={styles.inline}>
              {pendingSwaps > 0 && <Badge variant="warning">{pendingSwaps} pending</Badge>}
              <Button onClick={() => setSwapOpen(true)}>Request swap</Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <p className={styles.hint}>Ask a teammate to take your rostered day. A manager can approve only if one of you is already on the roster that date.</p>
          {swapsLoading ? (
            <p className={styles.hint}>Loading swap requests…</p>
          ) : swapList.length === 0 ? (
            <p className={styles.empty}>No swap requests yet. Choose a teammate and a future date when you need cover.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Request</th>
                    <th>Status</th>
                    {canDecide && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {swapList.map((row) => {
                    const askedByMe = String(row.requesterStaffId) === String(selfId);
                    return (
                      <tr key={row.id}>
                        <td>{formatDate(row.shiftDate)}</td>
                        <td>
                          {askedByMe
                            ? `You asked ${nameOf(directory, row.targetStaffId)}`
                            : `${nameOf(directory, row.requesterStaffId)} asked you`}
                          {row.reason ? <div className={styles.swapReason}>{row.reason}</div> : null}
                        </td>
                        <td>
                          <Badge variant={row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'default'}>
                            {prettyStatus(row.status)}
                          </Badge>
                        </td>
                        {canDecide && (
                          <td>
                            {row.status === 'PENDING' && (
                              <div className={styles.inline}>
                                <Button onClick={() => setDecision({ id: row.id, approved: true, row })}>Approve</Button>
                                <Button variant="outline" onClick={() => setDecision({ id: row.id, approved: false, row })}>Reject</Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={swapOpen}
        onClose={() => { if (!createSwap.isPending) setSwapOpen(false); }}
        title="Request swap"
        subtitle="Ask a teammate to take your rostered day."
        footer={(
          <>
            <Button variant="outline" onClick={() => setSwapOpen(false)} disabled={createSwap.isPending}>Cancel</Button>
            <Button onClick={() => createSwap.mutate()} disabled={createSwap.isPending}>
              {createSwap.isPending ? 'Sending…' : 'Send request'}
            </Button>
          </>
        )}
      >
        <div className={styles.stack}>
          <StaffPicker
            staffList={others}
            value={swap.targetStaffId}
            onChange={(targetStaffId) => setSwap((prev) => ({ ...prev, targetStaffId }))}
          />
          <Input
            label="Date"
            type="date"
            min={todayLocalKey()}
            value={swap.shiftDate}
            onChange={(e) => setSwap((prev) => ({ ...prev, shiftDate: e.target.value }))}
          />
          <Input
            label="Reason"
            value={swap.reason}
            onChange={(e) => setSwap((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Family, late close, etc."
          />
        </div>
      </Modal>

      <Modal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Clock out?"
        subtitle={lastIn ? `You have been in since ${formatPunchTime(lastIn.punchTimestamp)}.` : 'This ends the current shift.'}
        footer={(
          <>
            <Button variant="outline" onClick={() => setConfirmOut(false)} disabled={clock.isPending}>Stay in</Button>
            <Button variant="danger" onClick={() => punch('OUT')} disabled={clock.isPending}>
              {clock.isPending ? 'Saving…' : 'Clock out'}
            </Button>
          </>
        )}
      >
        <p className={styles.hint}>If you are leaving after midnight, this out punch stays on yesterday’s shift.</p>
      </Modal>

      <Modal
        open={decision != null}
        onClose={() => setDecision(null)}
        title={decision?.approved ? 'Approve this swap?' : 'Reject this swap?'}
        subtitle={decision?.row ? `${formatDate(decision.row.shiftDate)} · ${nameOf(directory, decision.row.requesterStaffId)} → ${nameOf(directory, decision.row.targetStaffId)}` : ''}
        footer={(
          <>
            <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
            <Button variant={decision?.approved ? 'primary' : 'danger'} onClick={() => decide.mutate(decision)}>
              {decision?.approved ? 'Approve' : 'Reject'}
            </Button>
          </>
        )}
      >
        <p className={styles.hint}>
          {decision?.approved
            ? 'The roster for that date will be exchanged if at least one person is already assigned.'
            : 'The request will stay on the list as rejected.'}
        </p>
      </Modal>
    </div>
  );
}

function StaffPicker({ staffList, value, onChange }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = staffList.find((staff) => String(staff.id) === String(value));
  const selectedLabel = selected ? `${selected.firstName} ${selected.lastName}` : '';
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return staffList;
    return staffList.filter((staff) => `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(needle));
  }, [staffList, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const choose = (next) => {
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`${styles.field} ${styles.staffPicker}`} ref={rootRef}>
      <span className={styles.label}>Swap with</span>
      <div className={styles.staffControl}>
        <input
          type="search"
          className={styles.select}
          placeholder={selectedLabel || 'Search teammate'}
          value={open ? query : selectedLabel}
          onFocus={() => { setOpen(true); setQuery(selectedLabel); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          aria-label="Choose teammate to swap with"
          autoComplete="off"
        />
        {value && (
          <button type="button" className={styles.clearStaff} onClick={() => choose('')} aria-label="Clear teammate">
            <LuX size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.staffMenu} role="listbox" aria-label="Teammates">
          {filtered.map((staff) => (
            <li key={staff.id}>
              <button
                type="button"
                className={String(value) === String(staff.id) ? styles.staffOptionActive : styles.staffOption}
                onClick={() => choose(String(staff.id))}
              >
                {staff.firstName} {staff.lastName}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className={styles.staffEmpty}>No teammate matches that name.</li>}
        </ul>
      )}
    </div>
  );
}

function nameOf(staffList, staffId) {
  const staff = staffList.find((item) => String(item.id) === String(staffId));
  return staff ? `${staff.firstName} ${staff.lastName}` : `Staff ${staffId}`;
}

function weekdayLabel(value) {
  return WEEKDAYS.find((day) => day.value === value)?.label || value;
}

function todayWeekday() {
  const index = new Date().getDay();
  return WEEKDAYS[(index + 6) % 7].value;
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function prettyPunch(event) {
  const value = String(event || '').toUpperCase();
  if (value === 'IN' || value === 'CHECKIN') return 'In';
  if (value === 'OUT' || value === 'CHECKOUT') return 'Out';
  return event;
}

function isOutEvent(event) {
  const value = String(event || '').toUpperCase();
  return value === 'OUT' || value === 'CHECKOUT';
}

function prettyStatus(status) {
  return { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }[status] || status;
}

function formatPunchTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatClock(value) {
  if (!value) return '—';
  const [hours, minutes] = String(value).substring(0, 5).split(':').map(Number);
  if (Number.isNaN(hours)) return value;
  return new Date(2000, 0, 1, hours, minutes || 0).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSlot(slot) {
  if (!slot) return '';
  const [from, to] = String(slot).split(/[-–]/).map((part) => part.trim());
  if (!to) return formatClock(from);
  return `${formatClock(from)}–${formatClock(to)}`;
}

function shiftCopy(shift) {
  if (!shift) return 'No rostered shift today. You can still clock if you are covering.';
  if (shift.onLeave) return 'You are marked on leave today.';
  if (shift.weeklyOff) return 'Today is a weekly off.';
  return shift.slot ? `Rostered ${formatSlot(shift.slot)}` : 'You have a shift today.';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
