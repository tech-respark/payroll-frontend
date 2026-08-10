import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStoreHolidays, createStoreHoliday, deleteStoreHoliday } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig } from '../helpers/dateUtils';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EventNoteIcon from '@mui/icons-material/EventNote';
import styles from './HolidayCalendarScreen.module.scss';

export default function HolidayCalendarScreen() {
  const { tenantId, storeId } = useAuth();
  const { storeConfig } = useStoreConfig();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    holidayName: '',
    holidayDate: '',
    isOptional: false
  });

  const { data, isLoading } = useQuery({
    queryKey: ['holidays', tenantId, storeId],
    queryFn: () => getStoreHolidays(tenantId, storeId),
    enabled: !!tenantId && !!storeId
  });

  const createMutation = useMutation({
    mutationFn: createStoreHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      showToast('Holiday created successfully!', 'success');
      handleClose();
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create holiday', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStoreHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      showToast('Holiday deleted successfully!', 'success');
    }
  });

  const handleClose = () => {
    setOpen(false);
    setNewHoliday({ holidayName: '', holidayDate: '', isOptional: false });
  };

  const handleSave = () => {
    createMutation.mutate({
      ...newHoliday,
      tenantId,
      storeId
    });
  };

  const holidaysList = data?.data || [];
  
  // Calculate next up
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let nextUpHoliday = null;
  let minDiff = Infinity;
  
  holidaysList.forEach(h => {
    const hDate = new Date(h.holidayDate);
    const diff = hDate.getTime() - today.getTime();
    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      nextUpHoliday = h;
    }
  });

  const formatDate = (dateString) => {
    return formatDateByConfig(dateString, storeConfig?.dateFormat);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div className={styles.pageTitleContainer}>
          <div className={styles.blueBar}></div>
          <h1 className={styles.pageTitle}>Holiday Calendar</h1>
        </div>
        <button className={styles.primaryBtn} onClick={() => setOpen(true)}>
          <AddIcon sx={{ fontSize: 20 }} /> Add Holiday
        </button>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Holidays</span>
          <div className={styles.metricValueContainer}>
            <span className={styles.metricValueLarge}>{holidaysList.length}</span>
            <span className={styles.metricValueSub}>this year</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Next Up</span>
          {nextUpHoliday ? (
            <div className={styles.metricValueContainer} style={{ alignItems: 'center' }}>
              <span className={styles.badgeMandatorySquare} style={{ backgroundColor: nextUpHoliday.isOptional ? '#dbeafe' : '#e0f2fe', color: nextUpHoliday.isOptional ? '#1e40af' : '#0369a1' }}>
                {nextUpHoliday.isOptional ? 'OPTIONAL' : 'MANDATORY'}
              </span>
              <span className={styles.metricTextValue}>{nextUpHoliday.holidayName}</span>
            </div>
          ) : (
            <span className={styles.metricTextValue} style={{ color: '#64748b' }}>No upcoming holidays</span>
          )}
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Policy Status</span>
          <div className={styles.statusGood}>
            <CheckCircleOutlineIcon /> Compliant with Local Law
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date (DD/MM/YYYY)</th>
              <th>Holiday Name</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
              </tr>
            ) : holidaysList.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>No holidays configured yet.</td>
              </tr>
            ) : (
              holidaysList.map(holiday => (
                <tr key={holiday.id} className={styles.tableRow}>
                  <td>{formatDate(holiday.holidayDate)}</td>
                  <td>
                    <div className={styles.holidayNameCell}>
                      <span className={`${styles.dot} ${holiday.isOptional ? styles.optional : ''}`}></span>
                      {holiday.holidayName}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${holiday.isOptional ? styles.badgeOptional : styles.badgeMandatory}`}>
                      {holiday.isOptional ? 'Optional' : 'Mandatory'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className={styles.actionBtn} 
                      onClick={() => deleteMutation.mutate(holiday.id)}
                      title="Delete Holiday"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className={styles.tableFooter}>
          <span>SHOWING {holidaysList.length} OF {holidaysList.length} RESULTS</span>
          <div className={styles.paginationControls}>
            <button disabled>&lt;</button>
            <button disabled>&gt;</button>
          </div>
        </div>
      </div>

      {open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <div className={styles.modalIcon}>
                  <EventNoteIcon />
                </div>
                <div className={styles.modalTitleText}>
                  <h2>Add New Holiday</h2>
                  <p>Schedule a company-wide or optional holiday.</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={handleClose}>
                <CloseIcon />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Holiday Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Founder's Day Celebration" 
                  value={newHoliday.holidayName}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holidayName: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={newHoliday.holidayDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
                />
              </div>

              <div className={styles.toggleGroup}>
                <div className={styles.toggleText}>
                  <span className={styles.toggleTitle}>Is Optional Holiday?</span>
                  <span className={styles.toggleSub}>Optional holidays are chosen by employees from a restricted list of dates.</span>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={newHoliday.isOptional}
                    onChange={(e) => setNewHoliday({ ...newHoliday, isOptional: e.target.checked })}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.infoBanner}>
                <InfoOutlinedIcon />
                <span>Changes will be broadcasted to all active employees.</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button 
                className={styles.primaryBtn} 
                onClick={handleSave}
                disabled={!newHoliday.holidayName || !newHoliday.holidayDate || createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
