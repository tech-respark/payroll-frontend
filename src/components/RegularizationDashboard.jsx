import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiService } from '../api/apiService';
import { addDaysToDateKey, parseLocalDate, todayLocalKey } from '../helpers/dateUtils';
import { LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import { Button, Checkbox, Modal } from './ui';
import { usePageHelp } from '../context/PageHelpContext';
import styles from './RegularizationDashboard.module.scss';

const TABS = [
  { id: 'PENDING', label: 'Pending', hint: 'Punch corrections waiting for a decision. Approved punches count toward the day. Rejected ones stay visible but do not mark the person present.' },
  { id: 'APPROVED', label: 'Approved', hint: 'Corrections already accepted. These punches are part of the attendance day.' },
  { id: 'REJECTED', label: 'Rejected', hint: 'Corrections turned down. The punch remains on the day for history only.' },
];

const PRESETS = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '45', label: 'Last 45 days', days: 45 },
  { id: 'month', label: 'This month' },
];

const tenantHeaders = (tenantId, storeId) => ({
  Tenantid: String(tenantId),
  Storeid: String(storeId),
  'x-allowed-store-ids': String(storeId),
});

const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const raw = String(timeStr).substring(0, 5);
  const [hours, minutes] = raw.split(':').map(Number);
  if (Number.isNaN(hours)) return raw;
  return new Date(2000, 0, 1, hours, minutes || 0).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDate = (value) => {
  const date = parseLocalDate(value);
  if (!date) return value || '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatWeekday = (value) => {
  const date = parseLocalDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  return parts[0].charAt(0).toUpperCase();
};

const monthStartKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const presetRange = (id) => {
  const to = todayLocalKey();
  if (id === 'month') return { from: monthStartKey(), to };
  const preset = PRESETS.find((item) => item.id === id);
  return { from: addDaysToDateKey(to, -(preset?.days || 45)), to };
};

const activePresetId = (fromDate, toDate) => {
  const to = todayLocalKey();
  if (toDate !== to) return null;
  if (fromDate === monthStartKey()) return 'month';
  return PRESETS.find((item) => item.days && fromDate === addDaysToDateKey(to, -item.days))?.id || null;
};

const staffName = (staff) => {
  const full = `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim();
  return full || staff?.name || staff?.username || `Staff ${staff?.id}`;
};

const RegularizationDashboard = ({ staffList = [], staffLoading = false }) => {
  const { tenantId, storeId, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const defaultRange = presetRange('45');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [selectedStaffId, setSelectedStaffId] = useState('All');
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [isMutating, setIsMutating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirm, setConfirm] = useState(null);
  const [remark, setRemark] = useState('');

  const requestHeaders = tenantHeaders(tenantId, storeId);
  const currentTab = TABS.find((tab) => tab.id === activeTab);
  const selectedPreset = activePresetId(fromDate, toDate);
  usePageHelp(currentTab?.hint);

  const listPayload = (status, pageNumber, recordsPerPage) => ({
    tenantId,
    storeId,
    applicationName: 'RESPARK',
    fromDate,
    toDate,
    currentStatus: status,
    staffId: selectedStaffId === 'All' ? null : Number(selectedStaffId),
    pageModel: { recordsPerPage, pageNumber },
  });

  const { data: requestData, isLoading: loading } = useQuery({
    queryKey: ['regularizationRequests', tenantId, storeId, activeTab, fromDate, toDate, selectedStaffId, page, rowsPerPage],
    queryFn: async () => {
      const res = await apiService.post('/regularizationRequests', listPayload(activeTab, page + 1, rowsPerPage), requestHeaders);
      return res.data || { regularizationRequests: [], pageModel: { totalNumberOfRecords: 0 } };
    },
    enabled: !!tenantId && !!storeId,
  });

  const { data: counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 } } = useQuery({
    queryKey: ['regularizationCounts', tenantId, storeId, fromDate, toDate, selectedStaffId],
    queryFn: async () => {
      const [pending, approved, rejected] = await Promise.all(
        ['PENDING', 'APPROVED', 'REJECTED'].map(async (status) => {
          const res = await apiService.post('/regularizationRequests', listPayload(status, 1, 1), requestHeaders);
          return Number(res.data?.pageModel?.totalNumberOfRecords || 0);
        })
      );
      return { PENDING: pending, APPROVED: approved, REJECTED: rejected };
    },
    enabled: !!tenantId && !!storeId,
  });

  const requests = requestData?.regularizationRequests || [];
  const totalCount = requestData?.pageModel?.totalNumberOfRecords || 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const resetList = () => {
    setSelectedRequests([]);
    setPage(0);
  };

  const applyRange = (from, to) => {
    setFromDate(from);
    setToDate(to);
    resetList();
  };

  const handleAction = async (action, reqIds, nextRemark = '') => {
    if (!reqIds || reqIds.length === 0) return;
    setIsMutating(true);
    try {
      const payload = reqIds.map((id) => ({
        personnelAttendanceId: id,
        modifiedBy: user?.staffId,
        currentStatus: action,
        remark: nextRemark || '',
      }));
      await apiService.post('/flagRegularizationRequests', payload, requestHeaders);
      setSelectedRequests([]);
      setConfirm(null);
      setRemark('');
      queryClient.invalidateQueries({ queryKey: ['regularizationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['regularizationCounts'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifRegs'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
      const noun = reqIds.length === 1 ? 'punch correction' : 'punch corrections';
      showToast(`${action === 'APPROVED' ? 'Approved' : 'Rejected'} ${reqIds.length} ${noun}`, 'success');
    } catch (err) {
      showToast(err?.message || `Could not ${action === 'APPROVED' ? 'approve' : 'reject'} the selected corrections.`, 'error');
    } finally {
      setIsMutating(false);
    }
  };

  const openConfirm = (action, ids) => {
    const rows = requests.filter((row) => ids.includes(row.personnelAttendanceId));
    const summary = rows.length === 1
      ? `${rows[0].personnelName} · ${formatDate(rows[0].attendanceDate)} · ${formatTime(rows[0].punchTime)}`
      : `${rows.length} punch corrections`;
    setRemark('');
    setConfirm({ action, ids, summary });
  };

  const handleSelectAll = (e) => {
    setSelectedRequests(e.target.checked ? requests.map((row) => row.personnelAttendanceId) : []);
  };

  const handleSelectOne = (id) => {
    setSelectedRequests((current) => (
      current.includes(id) ? current.filter((reqId) => reqId !== id) : [...current, id]
    ));
  };

  const emptyCopy = {
    PENDING: 'No punch corrections waiting in this range. Staff send these from Attendance when a punch is missing or wrong.',
    APPROVED: 'No approved corrections in this range.',
    REJECTED: 'No rejected corrections in this range.',
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.filterCard}>
        <div className={styles.presets} role="group" aria-label="Date range">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={selectedPreset === preset.id ? styles.presetActive : styles.preset}
              onClick={() => {
                const next = presetRange(preset.id);
                applyRange(next.from, next.to);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.filterRow}>
          <label className={styles.inputGroup}>
            <span className={styles.inputLabel}>From</span>
            <input
              type="date"
              className={styles.inputField}
              value={fromDate}
              max={toDate}
              onChange={(e) => applyRange(e.target.value, toDate)}
            />
          </label>
          <label className={styles.inputGroup}>
            <span className={styles.inputLabel}>To</span>
            <input
              type="date"
              className={styles.inputField}
              value={toDate}
              min={fromDate}
              onChange={(e) => applyRange(fromDate, e.target.value)}
            />
          </label>
          <StaffFilter
            staffList={staffList}
            loading={staffLoading}
            value={selectedStaffId}
            onChange={(next) => { setSelectedStaffId(next); resetList(); }}
          />
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Request status">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => { setActiveTab(tab.id); resetList(); }}
          >
            {tab.label}
            <span className={styles.tabCount}>{counts[tab.id] || 0}</span>
          </button>
        ))}
      </div>

      {activeTab === 'PENDING' && selectedRequests.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkLabel}>{selectedRequests.length} selected</span>
          <Button variant="primary" disabled={isMutating} onClick={() => openConfirm('APPROVED', selectedRequests)}>
            Approve selected
          </Button>
          <Button variant="danger" disabled={isMutating} onClick={() => openConfirm('REJECTED', selectedRequests)}>
            Reject selected
          </Button>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {activeTab === 'PENDING' && (
                  <th className={`${styles.th} ${styles.thCheckbox}`}>
                    <Checkbox
                      checked={requests.length > 0 && selectedRequests.length === requests.length}
                      onChange={handleSelectAll}
                      disabled={requests.length === 0}
                      aria-label="Select all requests"
                    />
                  </th>
                )}
                <th className={styles.th}>Staff</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Requested punch</th>
                <th className={styles.th}>Day&apos;s punches</th>
                {activeTab === 'PENDING' && <th className={`${styles.th} ${styles.thActions}`}>Decision</th>}
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'PENDING' ? 6 : 4} className={`${styles.td} ${styles.tableLoading}`}>
                    Loading punch corrections…
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'PENDING' ? 6 : 4} className={`${styles.td} ${styles.tableEmpty}`}>
                    <p className={styles.emptyTitle}>Nothing to review</p>
                    <p>{emptyCopy[activeTab]}</p>
                    <p className={styles.emptyHint}>Try another date range or staff member.</p>
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.personnelAttendanceId} className={styles.tr}>
                    {activeTab === 'PENDING' && (
                      <td className={styles.td}>
                        <Checkbox
                          checked={selectedRequests.includes(row.personnelAttendanceId)}
                          onChange={() => handleSelectOne(row.personnelAttendanceId)}
                          aria-label={`Select request for ${row.personnelName}`}
                        />
                      </td>
                    )}
                    <td className={styles.td}>
                      <div className={styles.staffCell}>
                        <div className={styles.avatar}>{getInitials(row.personnelName)}</div>
                        <div className={styles.staffName}>{row.personnelName}</div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dateCell}>
                        <strong>{formatDate(row.attendanceDate)}</strong>
                        <span>{formatWeekday(row.attendanceDate)}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.requestedPunch}>{formatTime(row.punchTime)}</span>
                    </td>
                    <td className={styles.td}>
                      <PunchChips punches={row.individualPunchesList} highlightTime={row.punchTime} />
                    </td>
                    {activeTab === 'PENDING' && (
                      <td className={`${styles.td} ${styles.tdActions}`}>
                        <div className={styles.actionsCell}>
                          <Button
                            variant="primary"
                            disabled={isMutating}
                            onClick={() => openConfirm('APPROVED', [row.personnelAttendanceId])}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            disabled={isMutating}
                            onClick={() => openConfirm('REJECTED', [row.personnelAttendanceId])}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className={styles.pagination}>
            <div className={styles.pageControls}>
              <label className={styles.pageSize}>
                <span>Rows per page</span>
                <select
                  className={`${styles.inputField} ${styles.inputFieldCompact}`}
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className={styles.pageSummary}>
              <span>
                {(page * rowsPerPage) + 1}–{Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount}
              </span>
              <div className={styles.pageArrows}>
                <button
                  type="button"
                  className={styles.arrowBtn}
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                >
                  <LuChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.arrowBtn}
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                >
                  <LuChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        action={confirm?.action}
        summary={confirm?.summary}
        count={confirm?.ids?.length || 0}
        remark={remark}
        onRemarkChange={setRemark}
        busy={isMutating}
        onClose={() => { if (!isMutating) { setConfirm(null); setRemark(''); } }}
        onConfirm={() => handleAction(confirm.action, confirm.ids, remark)}
      />
    </div>
  );
};

function PunchChips({ punches, highlightTime }) {
  if (!punches || punches.length === 0) {
    return <span className={styles.noPunches}>No other punches that day</span>;
  }
  const highlight = highlightTime ? String(highlightTime).substring(0, 5) : '';
  return (
    <div className={styles.punchBlocksContainer}>
      {punches.map((punch, index) => {
        const isOut = index % 2 !== 0;
        const time = formatTime(punch.punchTime);
        const raw = punch.punchTime ? String(punch.punchTime).substring(0, 5) : '';
        const isRequested = highlight && raw === highlight;
        return (
          <span
            key={`${raw}-${index}`}
            className={`${styles.punchBlock} ${isOut ? styles.punchOut : styles.punchIn} ${isRequested ? styles.punchRequested : ''}`}
          >
            {time} {isOut ? 'Out' : 'In'}
          </span>
        );
      })}
    </div>
  );
}

function StaffFilter({ staffList, loading, value, onChange }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = staffList.find((staff) => String(staff.id) === String(value));
  const selectedLabel = selected ? staffName(selected) : '';
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return staffList;
    return staffList.filter((staff) => staffName(staff).toLowerCase().includes(needle));
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
    <div className={`${styles.inputGroup} ${styles.staffFilter}`} ref={rootRef}>
      <span className={styles.inputLabel}>Staff</span>
      <div className={styles.staffControl}>
        <input
          type="search"
          className={styles.inputField}
          placeholder={selectedLabel || (loading ? 'Loading staff…' : 'Search staff or leave as all')}
          value={open ? query : selectedLabel}
          onFocus={() => {
            setOpen(true);
            setQuery(selectedLabel);
          }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          aria-label="Filter by staff member"
          autoComplete="off"
        />
        {value !== 'All' && (
          <button type="button" className={styles.clearStaff} onClick={() => choose('All')} aria-label="Show all staff">
            <LuX size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.staffMenu} role="listbox" aria-label="Staff members">
          <li>
            <button type="button" className={value === 'All' ? styles.staffOptionActive : styles.staffOption} onClick={() => choose('All')}>
              All staff
            </button>
          </li>
          {filtered.map((staff) => (
            <li key={staff.id}>
              <button
                type="button"
                className={String(value) === String(staff.id) ? styles.staffOptionActive : styles.staffOption}
                onClick={() => choose(String(staff.id))}
              >
                {staffName(staff)}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className={styles.staffEmpty}>
              {loading ? 'Loading staff…' : staffList.length === 0 ? 'No staff available.' : `No staff match “${query}”.`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ConfirmDialog({ open, action, summary, count, remark, onRemarkChange, busy, onClose, onConfirm }) {
  const approving = action === 'APPROVED';
  const noun = count === 1 ? 'this punch correction' : `${count} punch corrections`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={approving ? 'Approve punch correction' : 'Reject punch correction'}
      subtitle={summary || (approving
        ? `${count === 1 ? 'This punch' : 'These punches'} will count toward the attendance day.`
        : `Leave ${noun} on the day, but do not mark the person present.`)}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={approving ? 'primary' : 'danger'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : approving ? 'Approve' : 'Reject'}
          </Button>
        </>
      )}
    >
      {!approving && (
        <label className={styles.remarkField}>
          <span>Remark (optional)</span>
          <textarea
            className={styles.remarkInput}
            rows={3}
            value={remark}
            onChange={(e) => onRemarkChange(e.target.value)}
            placeholder="Why this punch should not count"
          />
        </label>
      )}
      {approving && (
        <p className={styles.tabHint}>This cannot be undone from here. Use Attendance if you need to correct the day later.</p>
      )}
    </Modal>
  );
}

export default RegularizationDashboard;
