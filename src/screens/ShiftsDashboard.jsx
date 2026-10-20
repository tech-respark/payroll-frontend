import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig, todayLocalKey, addDaysToDateKey } from '../helpers/dateUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffList, useShiftSlots, useStoreSettings, useWeeklyShifts } from '../hooks/queries';
import { Checkbox, ConfirmDialog, Switch } from '../components/ui';
import { formatSlot } from '../helpers/displayUtils';
import { LuClock, LuInfo, LuPlus, LuChevronDown, LuCheck, LuX } from 'react-icons/lu';
import styles from './ShiftsDashboard.module.scss';
import '../styles/main.scss';

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const dayChip = (day) => day.charAt(0) + day.slice(1).toLowerCase();

const ShiftsDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const canManage = hasAccess(['MANAGE_SHIFTS']);
  
  // Tabs: 'settings', 'templates', 'roster'
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);

  // Store Settings Data
  const [storeOpenTime, setStoreOpenTime] = useState('08:00');
  const [storeCloseTime, setStoreCloseTime] = useState('22:00');

  // Templates Data
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotName, setSlotName] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('18:00');
  const [slotColor, setSlotColor] = useState('#2477D4');
  const [slotOvernight, setSlotOvernight] = useState(false);
  const [sameForAllDays, setSameForAllDays] = useState(true);
  const [dayWiseTimings, setDayWiseTimings] = useState({
    SUN: { startTime: '09:00', closureTime: '18:00' },
    MON: { startTime: '09:00', closureTime: '18:00' },
    TUE: { startTime: '09:00', closureTime: '18:00' },
    WED: { startTime: '09:00', closureTime: '18:00' },
    THU: { startTime: '09:00', closureTime: '18:00' },
    FRI: { startTime: '09:00', closureTime: '18:00' },
    SAT: { startTime: '09:00', closureTime: '18:00' }
  });

  // Roster Data
  const [assignStartDate, setAssignStartDate] = useState(todayLocalKey());
  const [assignNoOfDays, setAssignNoOfDays] = useState(1);
  const [globalShiftId, setGlobalShiftId] = useState('');
  const [bulkAssignments, setBulkAssignments] = useState({});

  // Break Modal State
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [activeBreakStaffId, setActiveBreakStaffId] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState('13:00');
  const [breakEndTime, setBreakEndTime] = useState('14:00');
  const [breakType, setBreakType] = useState('Lunch');
  const [confirmRoster, setConfirmRoster] = useState(false);
  const [confirmClearBreak, setConfirmClearBreak] = useState(false);

  const { staffList } = useStaffList();
  const { storeSettings: storeSettingsData } = useStoreSettings();
  const { shiftSlots } = useShiftSlots();
  
  const [weeklyStartDate, setWeeklyStartDate] = useState(todayLocalKey());
  const { weeklyShifts } = useWeeklyShifts(weeklyStartDate);

  useEffect(() => {
    const settings = Array.isArray(storeSettingsData) ? storeSettingsData[0] : storeSettingsData;
    if (settings) {
      setStoreOpenTime(settings.storeOpenTime || '08:00');
      setStoreCloseTime(settings.storeCloseTime || '22:00');
    }
  }, [storeSettingsData]);

  useEffect(() => {
    if (staffList.length > 0) {
      const initialAssignments = {};
      staffList.forEach(staff => {
        initialAssignments[staff.id] = {
          selected: false,
          startTime: '09:00',
          endTime: '18:00',
          isWorking: true,
          breaks: []
        };
      });
      setBulkAssignments(initialAssignments);
    }
  }, [staffList]);

  const generateTimeOptions = () => {
    const times = [];
    let [openH, openM] = storeOpenTime.split(':').map(Number);
    let [closeH, closeM] = storeCloseTime.split(':').map(Number);
    
    let current = new Date(2000, 0, 1, openH, openM);
    let end = new Date(2000, 0, 1, closeH, closeM);

    if (end < current) end.setDate(end.getDate() + 1); 

    while (current <= end) {
      const hh = String(current.getHours()).padStart(2, '0');
      const mm = String(current.getMinutes()).padStart(2, '0');
      times.push(`${hh}:${mm}`);
      current.setMinutes(current.getMinutes() + 30);
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/storeSettings', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      showToast('Store timings saved successfully!', 'success');
    },
    onError: () => {
      showToast('Failed to save store settings.', 'error');
    }
  });

  const handleSaveStoreSettings = (e) => {
    e.preventDefault();
    if (!canManage) return;
    saveSettingsMutation.mutate({ storeOpenTime, storeCloseTime });
  };

  const handleSelectSlot = (slot) => {
    const defaultDayWise = {
      SUN: { startTime: '09:00', closureTime: '18:00' },
      MON: { startTime: '09:00', closureTime: '18:00' },
      TUE: { startTime: '09:00', closureTime: '18:00' },
      WED: { startTime: '09:00', closureTime: '18:00' },
      THU: { startTime: '09:00', closureTime: '18:00' },
      FRI: { startTime: '09:00', closureTime: '18:00' },
      SAT: { startTime: '09:00', closureTime: '18:00' }
    };

    if (slot) {
      setSelectedSlotId(slot.id);
      setSlotName(slot.shiftName);
      setSlotStartTime(slot.startTime);
      setSlotEndTime(slot.endTime);
      setSlotColor(slot.color || '#2477D4');
      setSlotOvernight(Boolean(slot.overnight));
      
      if (slot.dayWiseShiftsTiming && slot.dayWiseShiftsTiming.length > 0) {
        setSameForAllDays(false);
        const mapped = { ...defaultDayWise };
        slot.dayWiseShiftsTiming.forEach(dw => {
          if (mapped[dw.day]) {
            mapped[dw.day] = { startTime: dw.startTime, closureTime: dw.closureTime };
          }
        });
        setDayWiseTimings(mapped);
      } else {
        setSameForAllDays(true);
        setDayWiseTimings(defaultDayWise);
      }
    } else {
      setSelectedSlotId(null);
      setSlotName('');
      setSlotStartTime('09:00');
      setSlotEndTime('18:00');
      setSlotColor('#2477D4');
      setSlotOvernight(false);
      setSameForAllDays(true);
      setDayWiseTimings(defaultDayWise);
    }
    
  };

  const saveSlotMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/shiftslots', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftSlots'] });
      showToast(selectedSlotId ? 'Shift updated successfully!' : 'Shift created successfully!', 'success');
      if (!selectedSlotId) {
        setSlotName('');
      }
    },
    onError: () => {
      showToast('Failed to create shift slot.', 'error');
    }
  });

  const handleAddShiftSlot = (e) => {
    e.preventDefault();
    if (!canManage) return;
    
    const payload = {
      shiftName: slotName,
      startTime: slotStartTime,
      endTime: slotEndTime,
      color: slotColor,
      overnight: slotOvernight || Boolean(slotStartTime && slotEndTime && slotStartTime > slotEndTime),
      tenantId,
      storeId,
      active: true
    };
    
    if (!sameForAllDays) {
      payload.dayWiseShiftsTiming = Object.keys(dayWiseTimings).map(day => ({
        day,
        startTime: dayWiseTimings[day].startTime,
        closureTime: dayWiseTimings[day].closureTime
      }));
    } else {
      payload.dayWiseShiftsTiming = [];
    }
    if (selectedSlotId) {
      payload.id = selectedSlotId;
    }
    saveSlotMutation.mutate(payload);
  };

  const handleGlobalShiftChange = (e) => {
    const sId = e.target.value;
    setGlobalShiftId(sId);
    
    if (sId) {
      const selectedSlot = shiftSlots.find(s => String(s.id) === String(sId));
      if (selectedSlot) {
        // Find the specific time for the assignStartDate if dayWise timings exist
        let start = selectedSlot.startTime;
        let end = selectedSlot.endTime;
        
        if (selectedSlot.dayWiseShiftsTiming && selectedSlot.dayWiseShiftsTiming.length > 0) {
          const currentDayStr = new Date(assignStartDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const dayMatch = selectedSlot.dayWiseShiftsTiming.find(d => d.day.substring(0,3).toUpperCase() === currentDayStr);
          if (dayMatch) {
            start = dayMatch.startTime;
            end = dayMatch.closureTime;
          }
        }

        // Apply this shift's times to all staff
        setBulkAssignments(prev => {
          const updated = { ...prev };
          staffList.forEach(staff => {
            if (!updated[staff.id]) {
              updated[staff.id] = { selected: false, isWorking: true };
            }
            updated[staff.id].startTime = start;
            updated[staff.id].endTime = end;
          });
          return updated;
        });
      }
    }
  };

  const handleBulkAssignmentChange = (staffId, field, value) => {
    setBulkAssignments(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const handleSelectAllStaff = (e) => {
    const isChecked = e.target.checked;
    setBulkAssignments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id].selected = isChecked;
      });
      return updated;
    });
  };

  const handleDateShift = (direction) => {
    setAssignStartDate(addDaysToDateKey(assignStartDate, direction));
  };

  const generateRosterMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/staffshifts', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
    },
    onSuccess: () => {
      showToast('Successfully assigned bulk shifts!', 'success');
      setBulkAssignments(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(id => {
          reset[id].selected = false;
        });
        return reset;
      });
      setGlobalShiftId('');
      
      // Invalidate the weekly schedule data so it refetches immediately
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
    },
    onError: () => {
      showToast('Failed to assign bulk shifts.', 'error');
    }
  });

  const handleBulkAssignShift = () => {
    if (!assignStartDate) {
      showToast('Please provide a Start Date.', 'error');
      return;
    }

    const selectedStaffIds = Object.keys(bulkAssignments).filter(id => bulkAssignments[id].selected);
    
    if (selectedStaffIds.length === 0) {
      showToast('Please select at least one staff member to assign a shift.', 'error');
      return;
    }

    const currentIsoTime = new Date().toISOString();
    const staffShiftsList = selectedStaffIds.map(staffId => {
      const assignment = bulkAssignments[staffId];
      return {
        createdBy: user?.staffId,
        createdOn: currentIsoTime,
        day: new Date(`${assignStartDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
        earlyOutTime: '',
        modifiedBy: user?.staffId,
        modifiedOn: currentIsoTime,
        onLeave: assignment.isWorking ? 0 : 1,
        shiftDate: assignStartDate,
        slot: `${assignment.startTime}-${assignment.endTime}`,
        staffBreakTime: assignment.breaks && assignment.breaks.length > 0 ? assignment.breaks.map(b => ({
          slot: `${b.startTime}-${b.endTime}`,
          type: b.type,
          remark: '',
          staffId: parseInt(staffId)
        })) : [],
        staffId: parseInt(staffId),
        storeId: storeId,
        tenantId: tenantId,
        weeklyOff: 0
      };
    });

    generateRosterMutation.mutate({
      createdBy: user?.staffId,
      modifiedBy: user?.staffId,
      noOfDays: parseInt(assignNoOfDays),
      staffShiftsList: staffShiftsList,
      tenantId: tenantId,
      storeId: storeId,
      startDate: assignStartDate,
      shiftSlotId: globalShiftId ? parseInt(globalShiftId) : null
    });
  };

  const allSelected = staffList.length > 0 && staffList.every(s => bulkAssignments[s.id]?.selected);

  const openBreakModal = (staffId) => {
    setActiveBreakStaffId(staffId);
    
    // Pre-fill if break exists
    const existingBreaks = bulkAssignments[staffId]?.breaks;
    if (existingBreaks && existingBreaks.length > 0) {
      setBreakStartTime(existingBreaks[0].startTime);
      setBreakEndTime(existingBreaks[0].endTime);
      setBreakType(existingBreaks[0].type);
    } else {
      setBreakStartTime('13:00');
      setBreakEndTime('14:00');
      setBreakType('Lunch');
    }
    
    setBreakModalOpen(true);
  };

  const handleSaveBreak = () => {
    if (activeBreakStaffId) {
      setBulkAssignments(prev => ({
        ...prev,
        [activeBreakStaffId]: {
          ...prev[activeBreakStaffId],
          breaks: [{
            startTime: breakStartTime,
            endTime: breakEndTime,
            type: breakType
          }]
        }
      }));
    }
    setBreakModalOpen(false);
    setActiveBreakStaffId(null);
  };

  const handleClearBreak = () => {
    if (activeBreakStaffId) {
      setBulkAssignments(prev => ({
        ...prev,
        [activeBreakStaffId]: {
          ...prev[activeBreakStaffId],
          breaks: []
        }
      }));
    }
    setBreakModalOpen(false);
    setActiveBreakStaffId(null);
  };

  return (
    <>
    <p className="screenIntro">Create shift templates, then assign them to staff for a date range. Weekly schedule is a read-only view of what was saved.</p>
    <div className={styles.dashboardLayout}>
      
      {/* Internal Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Shift Management
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'roster' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Roster Management
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'weekly' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          Weekly Schedule
        </button>
        {canManage && (
          <button 
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Store Hours
          </button>
        )}
      </div>

      {/* STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className={styles.settingsLayout}>
          <div className={styles.settingsPanel}>
            <div className={styles.settingsHeader}>
              <LuClock size={24} className={styles.icon} />
              <h3>Store Operating Hours</h3>
            </div>
            
            <form onSubmit={handleSaveStoreSettings} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className={styles.settingsBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Opening Time</label>
                    <div className={styles.selectWrapper}>
                      <input 
                        type="time" 
                        value={storeOpenTime} 
                        onChange={(e) => setStoreOpenTime(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Closing Time</label>
                    <div className={styles.selectWrapper}>
                      <input 
                        type="time" 
                        value={storeCloseTime} 
                        onChange={(e) => setStoreCloseTime(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.settingsFooter}>
                {canManage && (
                  <button type="submit" className={styles.saveBtn} disabled={saveSettingsMutation.isPending}>
                    {saveSettingsMutation.isPending ? 'Saving...' : 'Save settings'}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className={styles.infoPanel}>
            <div className={styles.infoHeader}>
              <LuInfo size={20} className={styles.icon} />
              <h4>About Store Hours</h4>
            </div>
            <p className={styles.infoText}>
              Store operating hours define the boundaries for generating shift times.
            </p>
            <div className={styles.infoBox}>
              <p>
                When assigning shifts, the dropdown times will be restricted to intervals between your configured Opening and Closing times. Ensure these hours encompass your earliest and latest possible shifts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT MANAGEMENT */}
      {activeTab === 'templates' && (
        <div className={styles.shiftLayout}>
          <div className={styles.shiftSidebar}>
            {canManage && (
              <button className={styles.createShiftBtn} onClick={() => handleSelectSlot(null)}>
                <LuPlus size={16} />
                Create new shift
              </button>
            )}
            <h3 className={styles.sidebarHeader}>Shift Templates</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shiftSlots.length === 0 ? <p style={{color: 'var(--text-muted)'}}>No shifts configured yet.</p> : null}
              {shiftSlots.map(slot => (
                <div 
                  key={slot.id} 
                  className={`${styles.shiftCard} ${selectedSlotId === slot.id ? styles.active : ''}`}
                  onClick={() => handleSelectSlot(slot)}
                >
                  <div className={styles.cardHeader}>
                    <h4>{slot.shiftName}</h4>
                  </div>
                  <div className={styles.cardTime}>
                    <LuClock size={14} />
                    {slot.startTime} - {slot.endTime}{slot.overnight ? ' · overnight' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3>{selectedSlotId ? 'Update Shift' : 'Create New Shift'}</h3>
              <p>Define working hours for this shift template.</p>
            </div>
            
            <form onSubmit={handleAddShiftSlot} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className={styles.panelBody}>
                <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                  <label>Shift Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Morning Shift"
                    value={slotName} 
                    onChange={(e) => setSlotName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className={styles.dayWiseContainer}>
                  <div className={styles.dayWiseHeader}>
                    <div className={styles.sameForAllDays}>
                      <Checkbox
                        id="same-for-all-days"
                        label="Same For All Days"
                        checked={sameForAllDays}
                        onChange={(e) => setSameForAllDays(e.target.checked)}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Start Time</label>
                      <div className={styles.selectWrapper}>
                        <select value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} disabled={!sameForAllDays}>
                          {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                        </select>
                        <LuChevronDown size={16} className={styles.selectIcon} />
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
                      <Switch
                        row
                        id="overnight-shift"
                        label="Overnight shift"
                        hint="End time is the next calendar day."
                        checked={slotOvernight}
                        onChange={(e) => setSlotOvernight(e.target.checked)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Time</label>
                      <div className={styles.selectWrapper}>
                        <select value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} disabled={!sameForAllDays}>
                          {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                        </select>
                        <LuChevronDown size={16} className={styles.selectIcon} />
                      </div>
                    </div>
                  </div>
                  
                  {!sameForAllDays && (
                    <div className={styles.dayRows}>
                      {DAY_KEYS.map(day => (
                        <div key={day} className={styles.dayRow}>
                          <div className={styles.dayLabel}>{dayChip(day)}</div>
                          
                          <div className={styles.selectWrapper}>
                            <select 
                              value={dayWiseTimings[day].startTime} 
                              onChange={(e) => setDayWiseTimings(prev => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                            >
                              {timeOptions.map(t => <option key={`${day}-start-${t}`} value={t}>{t}</option>)}
                            </select>
                            <LuChevronDown size={16} className={styles.selectIcon} />
                          </div>

                          <div className={styles.selectWrapper}>
                            <select 
                              value={dayWiseTimings[day].closureTime} 
                              onChange={(e) => setDayWiseTimings(prev => ({ ...prev, [day]: { ...prev[day], closureTime: e.target.value } }))}
                            >
                              {timeOptions.map(t => <option key={`${day}-end-${t}`} value={t}>{t}</option>)}
                            </select>
                            <LuChevronDown size={16} className={styles.selectIcon} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.panelFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => handleSelectSlot(null)}>
                  Cancel
                </button>
                {canManage && (
                  <button type="submit" className={styles.saveBtn} disabled={saveSlotMutation.isPending}>
                    {saveSlotMutation.isPending ? 'Saving…' : 'Save shift'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

        {/* TAB 3: ROSTER MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className={styles.rosterContainer}>
          
          <div className={styles.rosterTopBar}>
            <div className={styles.filterGroup}>
              <label>Apply For (Days)</label>
              <input 
                type="number" 
                min={1}
                value={assignNoOfDays} 
                onChange={(e) => setAssignNoOfDays(parseInt(e.target.value) || 1)} 
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Use Shift</label>
              <div className={styles.selectWrapper}>
                <select 
                  value={globalShiftId} 
                  onChange={handleGlobalShiftChange}
                >
                  <option value="">Select shift template</option>
                  {shiftSlots.map(s => (
                    <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
                            <LuChevronDown size={16} className={styles.selectIcon} />
              </div>
            </div>

            <div className={styles.dateSelectorGroup} style={{marginLeft: 'auto'}}>
              <div className={styles.dateLabels}>
                <label>Select date</label>
              </div>
              <div className={styles.dateBoxWrapper}>
                <div className={styles.dateBox}>
                  <button type="button" onClick={() => handleDateShift(-1)} className={styles.arrowBtn}>&lt;</button>
                  <div className={styles.dateText}>
                    {formatDateByConfig(assignStartDate, storeConfig?.dateFormat)}
                  </div>
                  <button type="button" onClick={() => handleDateShift(1)} className={styles.arrowBtn}>&gt;</button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rosterTable}>
            <div className={styles.tableHeader}>
              <div className={styles.center}>
                <Checkbox
                  id="roster-select-all"
                  checked={allSelected}
                  onChange={handleSelectAllStaff}
                  aria-label="Select all staff"
                />
              </div>
              <div className={styles.headerLabel}>Staff</div>
              <div className={styles.headerLabel}>From</div>
              <div className={styles.headerLabel}>To</div>
              <div className={styles.center} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Working</div>
              <div className={styles.center} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Break</div>
            </div>

            <div className={styles.tableBody}>
              {staffList.length === 0 ? (
                <div className={styles.emptyState}>No staff in this store yet.</div>
              ) : staffList.map(staff => {
                const assignData = bulkAssignments[staff.id] || {};
                const isSelected = assignData.selected || false;
                const isWorking = assignData.isWorking ?? true;
                
                return (
                  <div key={staff.id} className={styles.tableRow}>
                    <div className={styles.center}>
                      <Checkbox
                        id={`roster-staff-${staff.id}`}
                        checked={isSelected}
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'selected', e.target.checked)}
                        aria-label={`Select ${staff.firstName} ${staff.lastName}`}
                      />
                    </div>
                    
                    <div className={styles.staffInfo}>
                      <span className={styles.name}>{staff.firstName} {staff.lastName}</span>
                    </div>

                    <div className={styles.selectWrapper}>
                      <select 
                        value={assignData.startTime || '09:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'startTime', e.target.value)}
                        className={styles.timeSelect}
                      >
                        {timeOptions.map(t => <option key={`from-${t}`} value={t}>{t}</option>)}
                      </select>
                            <LuChevronDown size={16} className={styles.selectIcon} />
                    </div>

                    <div className={styles.selectWrapper}>
                      <select 
                        value={assignData.endTime || '18:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'endTime', e.target.value)}
                        className={styles.timeSelect}
                      >
                        {timeOptions.map(t => <option key={`to-${t}`} value={t}>{t}</option>)}
                      </select>
                            <LuChevronDown size={16} className={styles.selectIcon} />
                    </div>

                    <div className={styles.center} style={{ cursor: 'pointer' }} onClick={() => handleBulkAssignmentChange(staff.id, 'isWorking', !isWorking)}>
                      <div className={isWorking ? styles.statusCircle : styles.statusCircleOff}>
                        {isWorking ? 
                          <LuCheck size={14} strokeWidth={3} /> : 
                          <LuX size={14} strokeWidth={3} />
                        }
                      </div>
                    </div>

                    <div className={styles.center}>
                      <button 
                        type="button" 
                        onClick={() => openBreakModal(staff.id)}
                        className={styles.actionBtn}
                        title={(assignData.breaks && assignData.breaks.length > 0) ? 'Edit Break' : 'Add Break'}
                      >
                        <LuPlus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.rosterFooter}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={() => setActiveTab('templates')}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className={styles.saveBtn}
              disabled={generateRosterMutation.isPending}
              onClick={() => setConfirmRoster(true)}
            >
              {generateRosterMutation.isPending ? 'Saving...' : 'Save roster'}
            </button>
          </div>
        </div>
      )}

      {/* Break Time Modal */}
      {breakModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.payrollCard} ${styles.modalCard}`}>
            <h3 className={styles.modalTitle}>Configure Break Time</h3>
            
            <div className={styles.modalFormGroup}>
              <label className={styles.rosterLabel}>Break Type</label>
              <select 
                value={breakType} 
                onChange={(e) => setBreakType(e.target.value)}
                className={styles.modalSelect}
              >
                <option value="Lunch">Lunch</option>
                <option value="Tea Break">Tea Break</option>
                <option value="Dinner">Dinner</option>
                <option value="Custom">Custom Break</option>
              </select>
            </div>

            <div className={styles.modalTimeGrid}>
              <div className={styles.modalTimeCol}>
                <label className={styles.rosterLabel}>From Time</label>
                <select 
                  value={breakStartTime} 
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  className={styles.modalSelect}
                >
                  {timeOptions.map(t => <option key={`b-start-${t}`} value={t}>{t}</option>)}
                </select>
              </div>

              <div className={styles.modalTimeCol}>
                <label className={styles.rosterLabel}>To Time</label>
                <select 
                  value={breakEndTime} 
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  className={styles.modalSelect}
                >
                  {timeOptions.map(t => <option key={`b-end-${t}`} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.removeBreakBtn}
                onClick={() => setConfirmClearBreak(true)}
              >
                Remove Break
              </button>
              
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.modalCancelBtn}
                  onClick={() => { setBreakModalOpen(false); setActiveBreakStaffId(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.modalSaveBtn}
                  onClick={handleSaveBreak}
                >
                  Save Break
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY SCHEDULE */}
      {activeTab === 'weekly' && (
        <div className={styles.weeklyContainer}>
          <div className={styles.rosterTopBar}>
            <div className={styles.dateSelectorGroup}>
              <div className={styles.dateLabels}>
                <label>Select week</label>
              </div>
              <div className={styles.dateBoxWrapper}>
                <div className={styles.dateBox}>
                  <button type="button" onClick={() => setWeeklyStartDate(addDaysToDateKey(weeklyStartDate, -7))} className={styles.arrowBtn} aria-label="Previous week">&lt;</button>
                  <div className={styles.dateText}>
                    {formatDateByConfig(weeklyStartDate, storeConfig?.dateFormat)}
                  </div>
                  <button type="button" onClick={() => setWeeklyStartDate(addDaysToDateKey(weeklyStartDate, 7))} className={styles.arrowBtn} aria-label="Next week">&gt;</button>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.weeklyTable}>
            <div className={styles.tableHeader}>
              <div className={styles.headerLabel}>Staff</div>
              {[...Array(7)].map((_, i) => {
                return (
                  <div key={i} className={styles.headerLabel}>
                    {formatDateByConfig(addDaysToDateKey(weeklyStartDate, i), storeConfig?.dateFormat)}
                  </div>
                );
              })}
            </div>
            
            <div className={styles.tableBody}>
              {staffList.length === 0 ? (
                <div className={styles.emptyState}>No staff in this store yet.</div>
              ) : staffList.map(staff => {
                return (
                  <div key={staff.id} className={styles.tableRow}>
                    <div className={styles.staffInfo}>
                      <span className={styles.name}>{staff.firstName} {staff.lastName}</span>
                    </div>
                    
                    {[...Array(7)].map((_, i) => {
                      const dateStr = addDaysToDateKey(weeklyStartDate, i);
                      
                      // Find shift for this staff and date
                      const shift = weeklyShifts.find(s => s.staffId === staff.id && s.shiftDate.startsWith(dateStr));
                      
                      return (
                        <div key={i} className={styles.center} style={{ fontSize: '13px', fontWeight: '500', color: shift ? (shift.onLeave ? '#ef4444' : shift.weeklyOff ? 'var(--text-muted)' : 'var(--primary-color)') : 'var(--text-muted)' }}>
                          {shift ? (shift.onLeave ? 'Leave' : shift.weeklyOff ? 'Weekly Off' : formatSlot(shift.slot)) : '-'}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
    <ConfirmDialog
      open={confirmRoster}
      title="Save this roster?"
      body="Selected staff will be assigned these shifts for the chosen date range."
      confirmLabel="Save roster"
      busy={generateRosterMutation.isPending}
      onClose={() => setConfirmRoster(false)}
      onConfirm={() => {
        setConfirmRoster(false);
        handleBulkAssignShift();
      }}
    />
    <ConfirmDialog
      open={confirmClearBreak}
      title="Remove this break?"
      body="The break times for this staff member will be cleared."
      confirmLabel="Remove break"
      danger
      onClose={() => setConfirmClearBreak(false)}
      onConfirm={() => {
        setConfirmClearBreak(false);
        handleClearBreak();
      }}
    />
    </>
  );
};

export default ShiftsDashboard;
