import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig, toLocalDateKey, todayLocalKey } from '../helpers/dateUtils';
import { Drawer, Button, Switch, ConfirmDialog } from '../components/ui';
import {
  LuPlus,
  LuTrash2,
  LuChevronLeft,
  LuChevronRight,
  LuCalendarDays,
  LuList,
  LuInfo,
} from 'react-icons/lu';
import styles from './HolidayCalendarScreen.module.scss';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (value) => toLocalDateKey(value);

const startOfMonthGrid = (year, monthIndex) => {
  // Monday-first grid
  const first = new Date(year, monthIndex, 1);
  const day = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(first);
  start.setDate(first.getDate() - day);
  return start;
};

export default function HolidayCalendarScreen() {
  const { tenantId, storeId } = useAuth();
  const { storeConfig } = useStoreConfig();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = toDateKey(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState('month'); // month | list
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newHoliday, setNewHoliday] = useState({
    holidayName: '',
    holidayDate: '',
    isOptional: false,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['holidays', tenantId, storeId],
    queryFn: () => apiService.get(`/holidays?tenantId=${tenantId}&storeId=${storeId}`),
    enabled: !!tenantId && !!storeId,
  });

  const createMutation = useMutation({
    mutationFn: (holidayData) => apiService.post('/holidays', holidayData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showToast('Holiday created successfully!', 'success');
      closeDrawer();
    },
    onError: (error) => {
      showToast(error.message || 'Failed to create holiday', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiService.delete(`/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showToast('Holiday deleted successfully!', 'success');
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete holiday', 'error');
    },
  });

  const holidaysList = data?.data || [];

  const holidaysByDate = useMemo(() => {
    const map = {};
    holidaysList.forEach((h) => {
      const key = toDateKey(h.holidayDate);
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [holidaysList]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarCells = useMemo(() => {
    const start = startOfMonthGrid(viewYear, viewMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toDateKey(date);
      return {
        date,
        key,
        inMonth: date.getMonth() === viewMonth,
        isToday: key === todayKey,
        holidays: holidaysByDate[key] || [],
      };
    });
  }, [viewYear, viewMonth, holidaysByDate, todayKey]);

  const nextUpHoliday = useMemo(() => {
    const todayKeyNow = todayLocalKey();
    return [...holidaysList]
      .filter((h) => toDateKey(h.holidayDate) >= todayKeyNow)
      .sort((a, b) => toDateKey(a.holidayDate).localeCompare(toDateKey(b.holidayDate)))[0] || null;
  }, [holidaysList]);

  const openCreate = (dateKey) => {
    setSelectedDate(dateKey || null);
    setNewHoliday({
      holidayName: '',
      holidayDate: dateKey || toDateKey(today),
      isOptional: false,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedDate(null);
    setNewHoliday({ holidayName: '', holidayDate: '', isOptional: false });
  };

  const handleSave = () => {
    createMutation.mutate({
      ...newHoliday,
      tenantId,
      storeId,
    });
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const formatDate = (dateString) => formatDateByConfig(dateString, storeConfig?.dateFormat);

  const monthHolidayCount = Object.keys(holidaysByDate).filter((k) => {
    const [y, m] = toDateKey(k).split('-').map(Number);
    return y === viewYear && m === viewMonth + 1;
  }).length;

  return (
    <div className={styles.pageContainer}>
      <p className="screenIntro">Store holidays used for attendance and optional-holiday leave. Click a day to add one.</p>
      <div className={styles.pageActions}>
        <button type="button" className={styles.primaryBtn} onClick={() => openCreate()}>
          <LuPlus size={18} /> Add holiday
        </button>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total holidays</span>
          <div className={styles.metricValueContainer}>
            <span className={styles.metricValueLarge}>{holidaysList.length}</span>
            <span className={styles.metricValueSub}>configured</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Next up</span>
          {nextUpHoliday ? (
            <div className={styles.nextUp}>
              <span className={`${styles.chip} ${nextUpHoliday.isOptional ? styles.chipOptional : styles.chipMandatory}`}>
                {nextUpHoliday.isOptional ? 'Optional' : 'Mandatory'}
              </span>
              <span className={styles.metricTextValue}>{nextUpHoliday.holidayName}</span>
            </div>
          ) : (
            <span className={styles.muted}>No upcoming holidays</span>
          )}
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>This month</span>
          <div className={styles.metricValueContainer}>
            <span className={styles.metricValueLarge}>
              {monthHolidayCount}
            </span>
            <span className={styles.metricValueSub}>in {monthLabel.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      <div className={styles.calendarShell}>
        <div className={styles.calToolbar}>
          <div className={styles.viewToggle} role="group" aria-label="Calendar view">
            <button
              type="button"
              className={viewMode === 'month' ? styles.toggleActive : undefined}
              onClick={() => setViewMode('month')}
              title="Month view"
              aria-pressed={viewMode === 'month'}
            >
              <LuCalendarDays size={18} />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? styles.toggleActive : undefined}
              onClick={() => setViewMode('list')}
              title="List view"
              aria-pressed={viewMode === 'list'}
            >
              <LuList size={18} />
            </button>
          </div>

          <div className={styles.monthNav}>
            <button type="button" className={styles.navIconBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <LuChevronLeft size={18} />
            </button>
            <h2 className={styles.monthLabel}>{monthLabel}</h2>
            <button type="button" className={styles.navIconBtn} onClick={() => shiftMonth(1)} aria-label="Next month">
              <LuChevronRight size={18} />
            </button>
          </div>

          <div className={styles.calToolbarEnd}>
            <button type="button" className={styles.todayBtn} onClick={goToday}>
              Today
            </button>
          </div>
        </div>

        {viewMode === 'month' && !isLoading && monthHolidayCount === 0 && (
          <p className={`screenHint ${styles.monthHint}`}>No holidays in {monthLabel}. Click a day to add one.</p>
        )}

        {viewMode === 'month' ? (
          <div className={styles.monthGrid}>
            <div className={styles.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <div key={d} className={styles.weekday}>{d}</div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {calendarCells.map((cell) => (
                <button
                  type="button"
                  key={cell.key}
                  className={[
                    styles.dayCell,
                    !cell.inMonth && styles.outsideMonth,
                    cell.isToday && styles.todayCell,
                    selectedDate === cell.key && styles.selectedCell,
                  ].filter(Boolean).join(' ')}
                  onClick={() => openCreate(cell.key)}
                >
                  <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                  <div className={styles.eventStack}>
                    {cell.holidays.slice(0, 3).map((h) => (
                      <span
                        key={h.id}
                        className={`${styles.eventPill} ${h.isOptional ? styles.pillOptional : styles.pillMandatory}`}
                        title={h.holidayName}
                      >
                        {h.holidayName}
                      </span>
                    ))}
                    {cell.holidays.length > 3 && (
                      <span className={styles.moreCount}>+{cell.holidays.length - 3} more</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.listView}>
            {isLoading ? (
              <div className={styles.emptyState}>Loading holidays…</div>
            ) : holidaysList.length === 0 ? (
              <div className={styles.emptyState}>No holidays configured yet. Click Add holiday to create one.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Holiday</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...holidaysList]
                    .sort((a, b) => String(a.holidayDate).localeCompare(String(b.holidayDate)))
                    .map((holiday) => (
                      <tr key={holiday.id}>
                        <td>{formatDate(holiday.holidayDate)}</td>
                        <td>
                          <div className={styles.holidayNameCell}>
                            <span className={`${styles.dot} ${holiday.isOptional ? styles.optional : ''}`} />
                            {holiday.holidayName}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.chip} ${holiday.isOptional ? styles.chipOptional : styles.chipMandatory}`}>
                            {holiday.isOptional ? 'Optional' : 'Mandatory'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setDeleteTarget(holiday)}
                            title="Delete holiday"
                          >
                            <LuTrash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Add holiday"
        subtitle="Schedule a company-wide or optional holiday"
        width={420}
        footer={(
          <>
            <Button variant="outline" onClick={closeDrawer}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!newHoliday.holidayName || !newHoliday.holidayDate || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Save holiday'}
            </Button>
          </>
        )}
      >
        <div className={styles.drawerForm}>
          <div className={styles.formGroup}>
            <label htmlFor="holiday-name">Holiday name</label>
            <input
              id="holiday-name"
              type="text"
              placeholder="e.g. Founder's Day"
              value={newHoliday.holidayName}
              onChange={(e) => setNewHoliday({ ...newHoliday, holidayName: e.target.value })}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="holiday-date">Date</label>
            <input
              id="holiday-date"
              type="date"
              value={newHoliday.holidayDate}
              onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
            />
          </div>

          <Switch
            row
            id="holiday-optional"
            label="Optional holiday"
            hint="Employees choose from a restricted list of dates."
            checked={newHoliday.isOptional}
            onChange={(e) => setNewHoliday({ ...newHoliday, isOptional: e.target.checked })}
          />

          <div className={styles.infoBanner}>
            <LuInfo size={16} />
            <span>Changes apply for all active employees in this store.</span>
          </div>

          {selectedDate && holidaysByDate[selectedDate]?.length > 0 && (
            <div className={styles.existingBlock}>
              <h4>Already on this day</h4>
              <ul>
                {holidaysByDate[selectedDate].map((h) => (
                  <li key={h.id}>
                    <span>{h.holidayName}</span>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => setDeleteTarget(h)}
                    >
                      <LuTrash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Drawer>
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete this holiday?"
        body={deleteTarget ? `Remove “${deleteTarget.holidayName}” from the store calendar.` : ''}
        confirmLabel="Delete holiday"
        danger
        busy={deleteMutation.isPending}
        onClose={() => { if (!deleteMutation.isPending) setDeleteTarget(null); }}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
