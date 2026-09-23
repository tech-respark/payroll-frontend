import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHistory } from 'react-router-dom';
import { apiService } from '../api/apiService';
import styles from './HRDashboard.module.scss';
import { useAuth } from '../context/AuthContext';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

const formatMissingDate = (dateStr) => {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { weekday: '', label: dateStr };
  }
  return {
    weekday: parsed.toLocaleDateString('en-GB', { weekday: 'short' }),
    label: parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
};

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const HRDashboard = () => {
  const { user } = useAuth();
  const history = useHistory();
  const leaveCardRef = useRef(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedDayBreakdown, setSelectedDayBreakdown] = useState(null);
  const [selectedAwolEmployee, setSelectedAwolEmployee] = useState(null);

  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['hrDashboardMetrics'],
    queryFn: async () => apiService.get('/admin/dashboard/metrics')
  });

  useEffect(() => {
    if (!showLeaveModal) return undefined;
    const onPointerDown = (event) => {
      if (!leaveCardRef.current?.contains(event.target)) {
        setShowLeaveModal(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowLeaveModal(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showLeaveModal]);

  if (isLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingState}>Loading Executive Dashboard...</div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorState}>Error loading dashboard metrics.</div>
      </div>
    );
  }

  const leaveCount = metrics.staffOnLeaveToday || 0;
  const leaveNames = metrics.staffOnLeaveNames || [];
  const dayTotal = selectedDayBreakdown
    ? (selectedDayBreakdown.present + selectedDayBreakdown.absent + selectedDayBreakdown.onLeave + selectedDayBreakdown.late) || 1
    : 1;

  const dayRows = selectedDayBreakdown
    ? [
        { key: 'present', label: 'Present', value: selectedDayBreakdown.present, tone: styles.rowPresent },
        { key: 'late', label: 'Late arrival', value: selectedDayBreakdown.late, tone: styles.rowLate },
        { key: 'leave', label: 'On leave', value: selectedDayBreakdown.onLeave, tone: styles.rowLeave },
        { key: 'absent', label: 'Absent', value: selectedDayBreakdown.absent, tone: styles.rowAbsent },
      ]
    : [];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <div>
          <h1>Executive HR Overview</h1>
          <p>Workforce headcount analytics and live attendance availability.</p>
        </div>
        {user?.name && (
          <div className={styles.headerMeta}>
            Signed in as <strong>{user.name}</strong>
          </div>
        )}
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Total Headcount</div>
            <div className={styles.metricValue}>
              {metrics.totalHeadcount} <span>Active</span>
            </div>
          </div>
          <div className={styles.cardFooter} onClick={() => history.push('/staff')} role="button" tabIndex={0}>
            <span>Staff Directory</span>
            <span className={styles.arrow}>→</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Attendance Today</div>
            <div className={styles.metricValue}>
              {metrics.attendancePercentageToday}% <span>Healthy</span>
            </div>
          </div>
          <div className={styles.cardFooter} onClick={() => history.push('/attendance')} role="button" tabIndex={0}>
            <span>Live Roster</span>
            <span className={styles.arrow}>→</span>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.leaveCard}`} ref={leaveCardRef}>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Employees On Leave</div>
            <div className={styles.metricValue}>
              {leaveCount} <span className={styles.warn}>Away</span>
            </div>
          </div>
          <div
            className={styles.cardFooter}
            onClick={() => setShowLeaveModal((open) => !open)}
            role="button"
            tabIndex={0}
          >
            <span>{showLeaveModal ? 'Hide Away Feed' : 'View Away Feed'}</span>
            <span className={styles.arrow}>{showLeaveModal ? '↑' : '→'}</span>
          </div>
          {showLeaveModal && (
            <div className={styles.leavePopover} role="dialog" aria-labelledby="leave-popover-title">
              <div className={styles.popoverHeader}>
                <div>
                  <h3 id="leave-popover-title">Staff on leave today</h3>
                  <p>{leaveCount} {leaveCount === 1 ? 'employee' : 'employees'} away</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setShowLeaveModal(false)} aria-label="Close">
                  <CloseIcon />
                </button>
              </div>
              {leaveNames.length > 0 ? (
                <ul className={styles.peopleList}>
                  {leaveNames.map((name, i) => (
                    <li key={i} className={styles.peopleItem}>
                      <div className={`${styles.personAvatar} ${styles.leaveAvatar}`}>{getInitials(name)}</div>
                      <span className={styles.personName}>{name}</span>
                      <span className={`${styles.statusChip} ${styles.chipLeave}`}>Away</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyPanel}>No staff on leave today.</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Pending Requests</div>
            <div className={styles.metricValue}>
              {metrics.pendingLeaveRequests} <span className={styles.info}>Requires Action</span>
            </div>
          </div>
          <div className={styles.cardFooter} onClick={() => history.push('/leave-approvals')} role="button" tabIndex={0}>
            <span>View Approvals</span>
            <span className={styles.arrow}>→</span>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.chartCard}>
            <div className={styles.cardHeading}>
              <h3>Weekly Attendance Overview</h3>
              <span className={styles.cardHint}>Click a day for breakdown</span>
            </div>
            <div className={styles.mockBarChart}>
              <div className={styles.yAxis}>
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className={styles.chartArea}>
                {metrics.weeklyAttendance?.map((day, idx) => {
                  const total = day.present + day.absent + day.onLeave + day.late || 1;
                  const isActive = selectedDayBreakdown?.date === day.date;
                  return (
                    <div key={idx} className={styles.barColumn}>
                      <div
                        className={`${styles.barGroup} ${isActive ? styles.barGroupActive : ''}`}
                        onClick={() => setSelectedDayBreakdown(isActive ? null : day)}
                        title="Click for detailed breakdown"
                      >
                        <div className={`${styles.barSegment} ${styles.barAbsent}`} style={{ height: `${(day.absent / total) * 100}%` }} title={`Absent: ${day.absent}`} />
                        <div className={`${styles.barSegment} ${styles.barLeave}`} style={{ height: `${(day.onLeave / total) * 100}%` }} title={`Leave: ${day.onLeave}`} />
                        <div className={`${styles.barSegment} ${styles.barLate}`} style={{ height: `${(day.late / total) * 100}%` }} title={`Late: ${day.late}`} />
                        <div className={`${styles.barSegment} ${styles.barPresent}`} style={{ height: `${(day.present / total) * 100}%` }} title={`Present: ${day.present}`} />
                      </div>
                      <div className={styles.barLabel}>
                        <div className={styles.barDay}>{day.date.split('|')[0]}</div>
                        <div className={styles.barDate}>{day.date.split('|')[1]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#10B981' }}></div> Present</div>
              <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#8B5CF6' }}></div> Late</div>
              <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#F59E0B' }}></div> On Leave</div>
              <div className={styles.legendItem}><div className={styles.dot} style={{ background: '#EF4444' }}></div> Absent</div>
            </div>

            {selectedDayBreakdown && (
              <div className={styles.inlineDetail} role="region" aria-label="Day breakdown">
                <div className={styles.inlineDetailHeader}>
                  <div>
                    <h4>{selectedDayBreakdown.date.split('|')[0]} breakdown</h4>
                    <p>{selectedDayBreakdown.date.split('|')[1]} · {dayTotal} recorded</p>
                  </div>
                  <button type="button" className={styles.iconButton} onClick={() => setSelectedDayBreakdown(null)} aria-label="Close breakdown">
                    <CloseIcon />
                  </button>
                </div>
                <div className={styles.stackedBar}>
                  {dayRows.map((row) => (
                    <div
                      key={row.key}
                      className={`${styles.stackedSlice} ${row.tone}`}
                      style={{ width: `${(row.value / dayTotal) * 100}%` }}
                      title={`${row.label}: ${row.value}`}
                    />
                  ))}
                </div>
                <ul className={styles.breakdownList}>
                  {dayRows.map((row) => (
                    <li key={row.key} className={styles.breakdownRow}>
                      <span className={`${styles.rowDot} ${row.tone}`} />
                      <span className={styles.breakdownLabel}>{row.label}</span>
                      <span className={styles.breakdownValue}>{row.value}</span>
                      <span className={styles.breakdownPct}>{Math.round((row.value / dayTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.chartCard}>
            <div className={styles.cardHeading}>
              <h3>Action Required: Unplanned Absences</h3>
              <span className={styles.cardHint}>Select a person for dates</span>
            </div>
            <div className={styles.actionList}>
              {metrics.unplannedAbsences?.length > 0 ? (
                metrics.unplannedAbsences.map((stat, idx) => {
                  const isOpen = selectedAwolEmployee?.staffName === stat.staffName;
                  return (
                    <div key={idx} className={`${styles.actionBlock} ${isOpen ? styles.actionBlockOpen : ''}`}>
                      <div
                        className={styles.actionItem}
                        onClick={() => setSelectedAwolEmployee(isOpen ? null : stat)}
                        title="View missing dates"
                      >
                        <div className={styles.actionAvatar}>{getInitials(stat.staffName)}</div>
                        <div className={styles.actionDetails}>
                          <div className={styles.actionName}>{stat.staffName}</div>
                          <div className={styles.actionDesig}>{stat.designation}</div>
                        </div>
                        <div className={styles.actionCount}>
                          <span>{stat.absentDays}</span> Days AWOL
                        </div>
                      </div>
                      {isOpen && (
                        <div className={styles.awolExpand}>
                          <p className={styles.awolNote}>No punch and no approved leave on these dates.</p>
                          {stat.awolDates?.length > 0 ? (
                            <ul className={styles.dateList}>
                              {stat.awolDates.map((dateStr, i) => {
                                const formatted = formatMissingDate(dateStr);
                                return (
                                  <li key={i} className={styles.dateRow}>
                                    <span className={styles.dateWeekday}>{formatted.weekday}</span>
                                    <span className={styles.dateLabel}>{formatted.label}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className={styles.emptyPanel}>No AWOL dates listed.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyInline}>No unplanned absences this month.</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.cardHeading}>
            <h3>Recent Activity</h3>
          </div>
          {metrics.recentActivity?.length > 0 ? (
            <div className={styles.activityList}>
              {metrics.recentActivity.map((act, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>{getInitials(act.staffName)}</div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityTitle}>
                      {act.staffName}
                      <span> {act.action.toLowerCase()}</span>
                    </p>
                    <span className={styles.activityTime}>{act.time}</span>
                  </div>
                  <div className={styles.activityBadge}>
                    {act.type === 'LeaveRequest' ? 'Leave' : 'System'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyInline}>No recent activity to show.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
