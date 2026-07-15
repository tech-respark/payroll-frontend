import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useStaffList } from '../hooks/queries';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import AttendanceRegularizeModal from '../components/AttendanceRegularizeModal';
import styles from './AttendanceDashboard.module.scss';
import { Badge } from '../components/ui';
import '../styles/main.scss';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getStatusColor = (status) => {
  switch(status) {
    case 'P': return '#10b981'; // Green
    case 'A': return '#ef4444'; // Red
    case 'HD': return '#f59e0b'; // Orange
    case 'L': return '#3b82f6'; // Blue
    case 'WO': return '#94a3b8'; // Gray
    case 'PH': return '#d946ef'; // Pink
    default: return '#cbd5e1';
  }
};


const getBadgeVariant = (status) => {
  switch(status) {
    case 'P': return 'success';
    case 'A': return 'danger';
    case 'HD': return 'warning';
    case 'L': return 'default';
    case 'WO': return 'default';
    case 'PH': return 'default';
    default: return 'default';
  }
};

const getStatusLabel = (status) => {
  switch(status) {
    case 'P': return 'Present';
    case 'A': return 'Absent';
    case 'HD': return 'Half Day';
    case 'L': return 'Leave';
    case 'WO': return 'Weekly Off';
    case 'PH': return 'Public Holiday';
    default: return 'No Record';
  }
};

const formatDateStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const AttendanceDashboard = () => {
  const history = useHistory();
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [modalState, setModalState] = useState({ show: false, staffData: null });
  const [activeBalanceTab, setActiveBalanceTab] = useState('balance');
  const { staffList } = useStaffList();

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaff) {
      const me = staffList.find(s => {
        if (user?.staffId && String(s.id) === String(user.staffId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });
      setSelectedStaff(me ? String(me.id) : String(staffList[0].id));
    }
  }, [staffList, selectedStaff, user]);

  const monthIdx = MONTHS.indexOf(selectedMonth) + 1;
  const daysInMonth = new Date(selectedYear, monthIdx, 0).getDate();
  const fromDate = `${selectedYear}-${String(monthIdx).padStart(2, '0')}-01`;
  const toDate = `${selectedYear}-${String(monthIdx).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const { data: attendanceData = [], isLoading: loading, refetch: fetchAttendance } = useQuery({
    queryKey: ['attendanceData', selectedStaff, selectedMonth, selectedYear, tenantId, storeId],
    queryFn: async () => {
      const payload = {
        tenantId,
        storeId,
        applicationName: 'RESPARK',
        fromDate,
        toDate,
        staffIds: [parseInt(selectedStaff)]
      };

      const response = await apiService.post('/advancedInOutHistoryInformation', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      
      const resData = response.data || [];
      const staffRec = resData.find(r => String(r.staffId || r.id) === String(selectedStaff));
      const dailyList = staffRec ? (staffRec.dayWiseAttendanceList || []) : [];
      
      const monthData = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(monthIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayRecord = dailyList.find(day => day.dateOfAttendance && day.dateOfAttendance.startsWith(dateStr));
        
        const mapStatus = (s) => {
          if (!s) return 'A';
          const lower = s.toLowerCase();
          if (lower.includes('present')) return 'P';
          if (lower.includes('absent')) return 'A';
          if (lower.includes('half')) return 'HD';
          if (lower.includes('leave')) return 'L';
          if (lower.includes('weekly')) return 'WO';
          if (lower.includes('holiday')) return 'PH';
          return s;
        };
        
        let status = dayRecord ? (dayRecord.currentStatus) : 'absent';
        let isFuture = new Date(dateStr) > new Date();
        if (isFuture) status = '';
        
        let punches = dayRecord ? (dayRecord.individualPunchesList || []) : [];
        let shiftStart = dayRecord ? (dayRecord.shiftStartTime || "09:30") : "09:30";
        let shiftEnd = dayRecord ? (dayRecord.shiftEndTime || "18:30") : "18:30";
        
        let lateIn = "00:00";
        let earlyOut = "00:00";
        let inTime = dayRecord ? (dayRecord.firstInTime || "--:--") : "--:--";
        let outTime = dayRecord ? (dayRecord.lastOutTime || "--:--") : "--:--";
        let duration = "--:--";
        
        if (dayRecord) {
            if (dayRecord.lateInMinutes != null && dayRecord.lateInMinutes > 0) {
               lateIn = `${String(Math.floor(dayRecord.lateInMinutes / 60)).padStart(2, '0')}:${String(dayRecord.lateInMinutes % 60).padStart(2, '0')}`;
            }
            if (dayRecord.earlyOutMinutes != null && dayRecord.earlyOutMinutes > 0) {
               earlyOut = `${String(Math.floor(dayRecord.earlyOutMinutes / 60)).padStart(2, '0')}:${String(dayRecord.earlyOutMinutes % 60).padStart(2, '0')}`;
            }
            if (dayRecord.totalDurationMinutes != null && dayRecord.totalDurationMinutes > 0) {
               duration = `${String(Math.floor(dayRecord.totalDurationMinutes / 60)).padStart(2, '0')}:${String(dayRecord.totalDurationMinutes % 60).padStart(2, '0')}`;
            }
            
            if (status) {
                const s = status.toLowerCase();
                if (s.includes('present')) status = 'P';
                else if (s.includes('absent')) status = 'A';
                else if (s.includes('half')) status = 'HD';
                else if (s.includes('leave')) status = 'L';
                else if (s.includes('week') || s.includes('off')) status = 'WO';
                else if (s.includes('holiday')) status = 'PH';
                else if (!isFuture) status = 'A';
            }
        } else if (!isFuture) {
            status = 'A';
        }

        monthData.push({
           dateStr,
           dayNum: d,
           status,
           isFuture,
           shiftStart,
           shiftEnd,
           inTime,
           outTime,
           lateIn,
           earlyOut,
           duration,
           punches
        });
      }
      return monthData;
    },
    enabled: !!(selectedStaff && selectedMonth && selectedYear)
  });

  const { data: leaveData } = useQuery({
    queryKey: ['leaveData', selectedStaff, tenantId, storeId],
    queryFn: async () => {
      if (!selectedStaff || !tenantId || !storeId) return null;
      try {
        const [balances, apps] = await Promise.all([
          apiService.get(`/leaves/balances/all/${selectedStaff}?tenantId=${tenantId}&storeId=${storeId}`),
          apiService.get(`/leaves/applications/staff/${selectedStaff}`)
        ]);
        
        // The leave APIs return the array directly, not wrapped in a data object
        const balData = Array.isArray(balances) ? balances : [];
        const appData = Array.isArray(apps) ? apps : [];
        const pending = appData.filter(app => app.status === 'PENDING');
        
        return { balances: balData, pending };
      } catch (e) {
        console.error("Failed to fetch leave data", e);
        return { balances: [], pending: [] };
      }
    },
    enabled: !!selectedStaff && !!tenantId && !!storeId
  });

  const leaveBalances = leaveData?.balances || [];
  const pendingLeaves = leaveData?.pending || [];

  useEffect(() => {
    setSelectedDateObj(null);
  }, [selectedMonth, selectedYear, selectedStaff]);

  useEffect(() => {
    if (attendanceData.length > 0) {
      if (!selectedDateObj) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayObj = attendanceData.find(d => d.dateStr === todayStr);
        if (todayObj) setSelectedDateObj(todayObj);
        else setSelectedDateObj(attendanceData[0]);
      } else {
        const updatedObj = attendanceData.find(d => d.dateStr === selectedDateObj.dateStr);
        // Only update if we found it and it's a different reference
        if (updatedObj && updatedObj !== selectedDateObj) {
          setSelectedDateObj(updatedObj);
        }
      }
    }
  }, [attendanceData, selectedDateObj]);

  const handleRegularizeClick = () => {
    if (!selectedDateObj) return;
    
    const selectedStaffObj = staffList.find(s => String(s.id) === String(selectedStaff));
    if (!selectedStaffObj) return;
    
    const rowData = {
      staffCode: selectedStaffObj.id,
      staffName: `${selectedStaffObj.firstName} ${selectedStaffObj.lastName}`,
      attendanceDate: selectedDateObj.dateStr,
      punchList: selectedDateObj.punches
    };
    
    setModalState({ show: true, staffData: rowData });
  };

  const handleModalClose = (success) => {
    setModalState({ show: false, staffData: null });
    if (success) {
      fetchAttendance(); 
    }
  };

  const generateCalendarGrid = () => {
    if (attendanceData.length === 0) return null;
    
    const monthIdx = MONTHS.indexOf(selectedMonth);
    const firstDay = new Date(selectedYear, monthIdx, 1).getDay();
    
    const blankDays = Array(firstDay).fill(null);
    const gridCells = [...blankDays, ...attendanceData];
    
    return (
      <div className={styles.calendarGrid}>
        {WEEKDAYS.map(day => (
          <div key={day} className={styles.calendarWeekday}>
            {day}
          </div>
        ))}
        
        {gridCells.map((cell, idx) => {
          if (!cell) {
             return <div key={`blank-${idx}`} className={styles.calendarBlankCell} />;
          }
          
          const isSelected = selectedDateObj && selectedDateObj.dateStr === cell.dateStr;
          
          const handleCellClick = () => {
            const cellDate = new Date(cell.dateStr);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (cellDate >= today && (!cell.status || cell.status === '' || cell.status === 'No Record')) {
              history.push(`/leave-dashboard?startDate=${cell.dateStr}&endDate=${cell.dateStr}`);
            } else {
              setSelectedDateObj(cell);
            }
          };

          return (
            <div 
              key={cell.dateStr} 
              onClick={handleCellClick}
              className={isSelected ? styles.calendarCellSelected : styles.calendarCell}
            >
              <div className={isSelected ? styles.calendarDayNumSelected : styles.calendarDayNum}>
                {cell.dayNum}
              </div>
              {cell.status && (
                <div className={styles.calendarStatus}>
                  <Badge variant={getBadgeVariant(cell.status)}>{cell.status}</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDailyDetails = () => {
    if (!selectedDateObj) return (
      <div className={styles.emptyDetails}>
        Select a date from the calendar
      </div>
    );
    
    const dObj = new Date(selectedDateObj.dateStr);
    const dateFormatted = dObj.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    
    return (
      <div className={styles.detailsCard}>
        <div className={styles.detailsHeader}>
          {dateFormatted}
        </div>
        
        <div className={styles.detailsBody}>
          
          <div className={styles.metricsGrid}>
            <div className={styles.metricCell}>
              <div className={styles.metricLabel}>Shift Timing</div>
              <div className={styles.metricValue}>{selectedDateObj.shiftStart} - {selectedDateObj.shiftEnd}</div>
            </div>
            
            <div className={styles.metricCell}>
              <div className={styles.metricLabel}>Punch Records</div>
              <div className={styles.metricValue}>
                <span className={styles.punchIn}>In: {selectedDateObj.inTime}</span>
                <span className={styles.punchDivider}>|</span>
                <span className={styles.punchOut}>Out: {selectedDateObj.outTime}</span>
              </div>
            </div>
            
            <div className={styles.metricCell}>
              <div className={styles.metricLabel}>Total Duration</div>
              <div className={`${styles.metricValue} ${styles.metricValueBold}`}>{selectedDateObj.duration} Hrs</div>
            </div>
            
            <div className={styles.metricCell}>
              <div className={`${styles.metricLabel} ${styles.metricLabelDanger}`}>Late In</div>
              <div className={`${styles.metricValue} ${styles.metricValueDanger}`}>{selectedDateObj.lateIn}</div>
            </div>
            
            <div className={styles.metricCell}>
              <div className={`${styles.metricLabel} ${styles.metricLabelDanger}`}>Early Out</div>
              <div className={`${styles.metricValue} ${styles.metricValueDanger}`}>{selectedDateObj.earlyOut}</div>
            </div>
            
            <div className={styles.metricCell}>
              <div className={`${styles.metricLabel} ${styles.metricLabelPrimary}`}>Day Status</div>
              <div className={`${styles.metricValue} ${styles.metricValueBold}`} style={{ color: getStatusColor(selectedDateObj.status) }}>
                {getStatusLabel(selectedDateObj.status)}
              </div>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button 
              className={styles.btnRegularize} 
              onClick={handleRegularizeClick}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Attendance Regularization
            </button>
            <button 
              className={styles.btnLeave} 
              onClick={() => history.push('/leave-dashboard')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Leave Application
            </button>
          </div>

          <div className={styles.balanceTabs}>
            <div 
              className={activeBalanceTab === 'balance' ? styles.tabActive : styles.tabInactive}
              onClick={() => setActiveBalanceTab('balance')}
            >
              Current Balance
            </div>
            <div 
              className={activeBalanceTab === 'pending' ? styles.tabActive : styles.tabInactive}
              onClick={() => setActiveBalanceTab('pending')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Pending Apps
              {pendingLeaves.length > 0 && (
                <span style={{backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold'}}>
                  {pendingLeaves.length}
                </span>
              )}
            </div>
          </div>

          <table className={styles.leaveTable}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              {activeBalanceTab === 'balance' ? (
                <tr>
                  <th className={styles.leaveTableHeader} style={{ borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}>Leave Type</th>
                  <th className={styles.leaveTableHeader}>Opening</th>
                  <th className={styles.leaveTableHeader} style={{ borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>Closing</th>
                </tr>
              ) : (
                <tr>
                  <th className={styles.leaveTableHeader} style={{ borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}>App No</th>
                  <th className={styles.leaveTableHeader}>App Date</th>
                  <th className={styles.leaveTableHeader}>Type</th>
                  <th className={styles.leaveTableHeader}>From</th>
                  <th className={styles.leaveTableHeader} style={{ borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>To</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeBalanceTab === 'balance' ? (
                leaveBalances.length > 0 ? leaveBalances.map((bal, idx) => (
                  <tr key={idx} className={styles.leaveTableRow}>
                    <td className={styles.leaveType}>{bal.typeName} ({bal.code})</td>
                    <td className={styles.leaveValue}>{bal.annualAllotment}</td>
                    <td className={styles.leaveValue}>{bal.available}</td>
                  </tr>
                )) : (
                  <tr className={styles.leaveTableRow}>
                    <td colSpan="3" style={{textAlign: 'center', padding: '10px', color: '#64748b'}}>No balances found</td>
                  </tr>
                )
              ) : (
                pendingLeaves.length > 0 ? pendingLeaves.map((app, idx) => (
                  <tr key={idx} className={styles.leaveTableRow}>
                    <td className={styles.leaveType}>
                      <a href={`/leave-dashboard`} style={{color: '#2563eb', textDecoration: 'underline'}}>{app.id || 'N/A'}</a>
                    </td>
                    <td className={styles.leaveValue}>{formatDateStr(app.createdAt)}</td>
                    <td className={styles.leaveValue}>{app.leaveType?.leaveCode || 'N/A'}</td>
                    <td className={styles.leaveValue}>{formatDateStr(app.startDate)}</td>
                    <td className={styles.leaveValue}>{formatDateStr(app.endDate)}</td>
                  </tr>
                )) : (
                  <tr className={styles.leaveTableRow}>
                    <td colSpan="5" style={{textAlign: 'center', padding: '10px', color: '#64748b'}}>No pending applications</td>
                  </tr>
                )
              )}
            </tbody>
          </table>

        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Month</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={styles.filterSelect}>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={styles.filterSelect}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {hasAccess(['VIEW_OTHER_STAFF']) && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Staff Member</label>
            <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className={styles.filterSelect}>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className={styles.calendarContainer}>
        
        {/* Left Pane: Calendar */}
        <div className={styles.calendarLeftPane}>
          <div className={styles.calendarHeader}>
            <h3 className={styles.calendarTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              My Datebook
            </h3>
            <div className={styles.calendarMonthYear}>
              {selectedMonth} {selectedYear}
            </div>
          </div>
          
          {loading ? (
             <div className={styles.loadingState}>
               Loading calendar data...
             </div>
          ) : (
            generateCalendarGrid()
          )}
          
          <div className={styles.legendContainer}>
            <Badge variant={getBadgeVariant('P')}>P - Present</Badge>
            <Badge variant={getBadgeVariant('HD')}>HD - Half Day</Badge>
            <Badge variant={getBadgeVariant('A')}>A - Absent</Badge>
            <Badge variant={getBadgeVariant('L')}>L - Leave</Badge>
            <Badge variant={getBadgeVariant('WO')}>WO - Weekly Off</Badge>
            <Badge variant={getBadgeVariant('PH')}>PH - Public Holiday</Badge>
          </div>
        </div>
        
        {/* Right Pane: Details */}
        <div className={styles.detailsRightPane}>
          {renderDailyDetails()}
        </div>
        
      </div>

      <AttendanceRegularizeModal 
        show={modalState.show} 
        staffData={modalState.staffData}
        tenantId={tenantId}
        storeId={storeId}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default AttendanceDashboard;
