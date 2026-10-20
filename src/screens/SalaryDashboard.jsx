import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList } from '../hooks/queries';
import { useStoreConfig } from '../hooks/queries/useStoreConfig';
import { prettyStatus, staffName } from '../helpers/displayUtils';
import styles from './SalaryDashboard.module.scss';
import '../styles/main.scss';

import {
  LuWallet,
  LuCircleMinus,
  LuSave,
  LuChevronRight,
  LuUsers,
} from 'react-icons/lu';

const SalaryDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const [activeTab, setActiveTab] = useState('fixed');
  const { staffList } = useStaffList();

  return (
    <div className={styles.dashboard}>
      <p className="screenIntro">Set the recurring salary for a person, then add month-only extras such as bonus or incentive.</p>
      <div className={styles.tabList}>
        {[
          { id: 'fixed', label: 'Configure fixed salary' },
          { id: 'variable', label: 'Monthly variables' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? styles.tabItemActive : styles.tabItem}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
          {activeTab === 'fixed' ? (
            <FixedComponentsTab staffList={staffList} tenantId={tenantId} storeId={storeId} canManage={canManage} user={user} />
          ) : (
            <VariableComponentsTab staffList={staffList} tenantId={tenantId} storeId={storeId} canManage={canManage} user={user} />
          )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// FIXED COMPONENTS TAB
// ---------------------------------------------------------------------------------------------------------------------
const FixedComponentsTab = ({ staffList, tenantId, storeId, canManage, user }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffQuery, setStaffQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { storeConfig } = useStoreConfig();
  const currencySymbol = storeConfig?.currencySymbol || '$';

  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (selectedStaffId) {
      fetchFixedComponents(selectedStaffId);
    } else {
      setComponents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId]);

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => {
        if (user?.staffId && String(s.id) === String(user.staffId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });
      setSelectedStaffId(me ? String(me.id) : String(staffList[0].id));
    }
  }, [staffList, selectedStaffId, user]);

  const fetchFixedComponents = async (staffId) => {
    setLoading(true);
    try {
      const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      const availableComponents = compRes.data || [];
      
      const savedRes = await apiService.get(`/personnelSalaryComponents?staffId=${staffId}`);
      const savedStructure = savedRes.data || { earningsList: [], deductionsList: [] };

      const fixedDefs = availableComponents.filter(c => !c.isCalculatedMonthly && (!c.formula || c.formula.trim() === ''));

      const merged = fixedDefs.map(comp => {
        let savedAnnualValue = 0;
        if (comp.componentCategory === 'EARNING' && savedStructure.earningsList) {
          const found = savedStructure.earningsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        } else if (comp.componentCategory === 'DEDUCTION' && savedStructure.deductionsList) {
          const found = savedStructure.deductionsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        }
        
        let displayMonthly = savedAnnualValue > 0 ? (savedAnnualValue / 12).toFixed(2) : '';
        if (displayMonthly.endsWith('.00')) displayMonthly = Math.round(savedAnnualValue / 12).toString();

        return { ...comp, monthlyValue: displayMonthly };
      });

      setComponents(merged);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch salary data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (index, val) => {
    const newComponents = [...components];
    newComponents[index].monthlyValue = val;
    setComponents(newComponents);
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);

    const earningsList = [];
    const deductionsList = [];

    components.forEach(sc => {
      if (sc.monthlyValue !== '' && sc.monthlyValue !== null) {
        const annualEquivalent = Number(sc.monthlyValue) * 12;
        const item = {
          salaryComponentDefinitionsId: sc.id,
          componentName: sc.componentName,
          componentType: sc.componentType,
          annualValue: annualEquivalent
        };
        if (sc.componentCategory === 'EARNING') earningsList.push(item);
        if (sc.componentCategory === 'DEDUCTION') deductionsList.push(item);
      }
    });

    const payload = {
      tenantId,
      storeId,
      staffId: selectedStaffId,
      earningsList,
      deductionsList
    };

    try {
      await apiService.post('/personnelSalaryComponentsCalculation', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      showToast('Configuration saved successfully!', 'success');
      fetchFixedComponents(selectedStaffId);
    } catch (err) {
      console.error(err);
      showToast('Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const earnings = components.filter(c => c.componentCategory === 'EARNING');
  const deductions = components.filter(c => c.componentCategory === 'DEDUCTION');
  const visibleStaff = useMemo(() => {
    const needle = staffQuery.trim().toLowerCase();
    if (!needle) return staffList;
    return staffList.filter((staff) => staffName(staff).toLowerCase().includes(needle));
  }, [staffList, staffQuery]);

  const totalGross = earnings.reduce((sum, c) => sum + (c.includeInTotal !== false ? (Number(c.monthlyValue) || 0) : 0), 0);
  const totalDeductions = deductions.reduce((sum, c) => sum + (c.includeInTotal !== false ? (Number(c.monthlyValue) || 0) : 0), 0);
  const netTakeHome = totalGross - totalDeductions;

  return (
    <div className={styles.mainContainer}>
      <div className={styles.mainLayout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Staff</h3>
            <span className={styles.staffCountBadge}>{staffList.length} staff</span>
          </div>
          <input
            type="search"
            className={styles.sidebarSearch}
            placeholder="Search staff"
            value={staffQuery}
            onChange={(e) => setStaffQuery(e.target.value)}
            aria-label="Search staff"
          />

          <div className={styles.staffList}>
            {visibleStaff.length === 0 ? (
              <div className={styles.emptyState}>
                <LuUsers size={32} aria-hidden="true" />
                <p className={styles.emptyStateTitle}>{staffList.length === 0 ? 'No staff found' : 'No match'}</p>
                <p className={styles.emptyStateHint}>{staffList.length === 0 ? 'Add employees to configure fixed salary components.' : 'No staff match that name.'}</p>
              </div>
            ) : (
              visibleStaff.map(staff => (
                <div 
                  key={staff.id} 
                  className={`${styles.staffItem} ${selectedStaffId === String(staff.id) ? styles.staffItemActive : ''}`}
                  onClick={() => setSelectedStaffId(String(staff.id))}
                >
                  <div className={styles.staffAvatar}>
                    {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                  </div>
                  <div className={styles.staffInfo}>
                    <div className={styles.staffName}>{staffName(staff)}</div>
                    <div className={styles.staffRole}>{staff.designation || 'Staff member'}</div>
                  </div>
                  {selectedStaffId === String(staff.id) && <div className={styles.activeDot}></div>}
                  {selectedStaffId !== String(staff.id) && <LuChevronRight className={styles.arrowIcon} />}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.contentArea}>
          {!selectedStaffId ? (
            <div className={styles.card}>
              <div className={styles.emptyState}>
                <LuUsers size={32} aria-hidden="true" />
                <p className={styles.emptyStateTitle}>Select a staff member</p>
                <p className={styles.emptyStateHint}>Choose someone from the list to view and edit salary components.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Earnings Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <div className={styles.cardIcon}>
                      <LuWallet size={16} />
                    </div>
                    <h4 className={styles.cardTitleText}>Earnings</h4>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {loading ? (
                    <div className={styles.loadingState}>
                      <span className={styles.inlineSpinner} aria-hidden="true" />
                      Loading components…
                    </div>
                  ) : earnings.length === 0 ? (
                    <div className={styles.emptyState}>
                      <LuWallet size={32} aria-hidden="true" />
                      <p className={styles.emptyStateTitle}>No earnings</p>
                      <p className={styles.emptyStateHint}>This store has no fixed earning components yet.</p>
                    </div>
                  ) : (
                    <div className={styles.formGrid}>
                      {earnings.map((comp) => {
                        const originalIndex = components.findIndex(c => c.id === comp.id);
                        return (
                          <div key={comp.id} className={styles.formGroup}>
                            <label className={styles.inputLabel}>{comp.componentName}</label>
                            <div className={styles.inputWrapper}>
                              <span className={styles.currencySymbol}>{currencySymbol}</span>
                              <input 
                                type="number" 
                                min="0"
                                value={comp.monthlyValue || ''}
                                onChange={(e) => handleValueChange(originalIndex, e.target.value)}
                                readOnly={!canManage}
                                disabled={!canManage}
                                className={styles.amountInput}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.footerLabel}>Gross salary total</span>
                  <span className={styles.footerAmount}>{currencySymbol} {totalGross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Deductions Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <div className={styles.cardIcon}>
                      <LuCircleMinus size={16} />
                    </div>
                    <h4 className={styles.cardTitleText}>Fixed deductions</h4>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {loading ? (
                    <div className={styles.loadingState}>
                      <span className={styles.inlineSpinner} aria-hidden="true" />
                      Loading components…
                    </div>
                  ) : deductions.length === 0 ? (
                    <div className={styles.emptyState}>
                      <LuCircleMinus size={32} aria-hidden="true" />
                      <p className={styles.emptyStateTitle}>No deductions</p>
                      <p className={styles.emptyStateHint}>This store has no fixed deduction components yet.</p>
                    </div>
                  ) : (
                    <div className={styles.formGrid}>
                      {deductions.map((comp) => {
                        const originalIndex = components.findIndex(c => c.id === comp.id);
                        return (
                          <div key={comp.id} className={styles.formGroup}>
                            <label className={styles.inputLabel}>{comp.componentName}</label>
                            <div className={styles.inputWrapper}>
                              <span className={styles.currencySymbol}>{currencySymbol}</span>
                              <input 
                                type="number" 
                                min="0"
                                value={comp.monthlyValue || ''}
                                onChange={(e) => handleValueChange(originalIndex, e.target.value)}
                                readOnly={!canManage}
                                disabled={!canManage}
                                className={styles.amountInput}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.footerLabel}>Total deductions</span>
                  <span className={styles.footerAmountDeduction}>{currencySymbol} {totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Projected Take Home Card */}
              <div className={styles.projectedCard}>
                <div className={styles.projectedLeft}>
                  <span className={styles.projectedLabel}>Projected net monthly take home</span>
                  <h2 className={styles.projectedAmount}>{currencySymbol} {netTakeHome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
                </div>
                <div className={styles.projectedRight}>
                  {canManage && (
                    <button 
                      className={styles.btnSave} 
                      onClick={handleSave} 
                      disabled={loading || saving}
                    >
                      <LuSave size={16} /> {saving ? 'Saving…' : 'Save configuration'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// VARIABLE COMPONENTS TAB
// ---------------------------------------------------------------------------------------------------------------------
const VariableComponentsTab = ({ staffList, tenantId, storeId, canManage, user }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffQuery, setStaffQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [components, setComponents] = useState([]);
  const [totals, setTotals] = useState({ earning: 0, deduction: 0, net: 0 });
  const [storeConfig, setStoreConfig] = useState(null);
  const currencySymbol = storeConfig?.currencySymbol || '$';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    fetchStoreConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchStoreConfig = async () => {
    try {
      const res = await apiService.get(`/tenantStoreConfig?tenantId=${tenantId}&storeId=${storeId}`);
      if (res.data) {
        setStoreConfig(res.data);
        const recentMonth = res.data.recentSummaryCalculatedMonth || 0;
        
        // In Variables, recentMonth is locked. We should default to recentMonth + 1.
        let defaultMonthIdx = recentMonth; // index is 0-based, so recentMonth (which is 1-12) corresponds to recentMonth index (recentMonth)
        let defaultYr = currentYear;
        
        if (defaultMonthIdx >= 12) {
          defaultMonthIdx = 0;
          defaultYr += 1;
        }
        
        setSelectedMonth(MONTHS[defaultMonthIdx]);
        setSelectedYear(defaultYr);
      }
    } catch (err) {
      console.error('Failed to fetch store config', err);
    }
  };

  useEffect(() => {
    if (selectedStaffId) {
      fetchVariableComponents(selectedStaffId);
    } else {
      setComponents([]);
      setTotals({ earning: 0, deduction: 0, net: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => {
        if (user?.staffId && String(s.id) === String(user.staffId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });
      setSelectedStaffId(me ? String(me.id) : String(staffList[0].id));
    }
  }, [staffList, selectedStaffId, user]);

  const fetchVariableComponents = async (staffId) => {
    setLoading(true);
    try {
      const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      const availableComponents = compRes.data || [];
      
      const savedRes = await apiService.get(`/personnelSalaryComponentsForMonth?staffId=${staffId}&month=${selectedMonth}&year=${selectedYear}`);
      const savedStructure = savedRes.data || { earningsList: [], deductionsList: [] };

      // Filter to only variables (isCalculatedMonthly = true) and exclude those with formulas
      const varDefs = availableComponents.filter(c => c.isCalculatedMonthly && (!c.formula || c.formula.trim() === ''));

      const monthlyOf = (found) => {
        if (!found) return '';
        if (found.monthlyValue != null && found.monthlyValue !== '') return String(found.monthlyValue);
        if (found.annualValue) {
          const monthly = Number(found.annualValue) / 12;
          return Number.isInteger(monthly) ? String(monthly) : monthly.toFixed(2);
        }
        return '';
      };

      const merged = varDefs.map(comp => {
        let found;
        if (comp.componentCategory === 'EARNING' && savedStructure.earningsList) {
          found = savedStructure.earningsList.find(e => e.componentName === comp.componentName);
        } else if (comp.componentCategory === 'DEDUCTION' && savedStructure.deductionsList) {
          found = savedStructure.deductionsList.find(e => e.componentName === comp.componentName);
        }
        return { ...comp, monthlyValue: monthlyOf(found) };
      });

      setComponents(merged);
      calculateTotals(savedStructure.earningsList || [], savedStructure.deductionsList || [], availableComponents);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch variables data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (earnings, deductions, defs = []) => {
    const monthlyAmount = (item) => {
      if (item.monthlyValue != null && item.monthlyValue !== '') return Number(item.monthlyValue) || 0;
      if (item.annualValue != null && item.annualValue !== '') return Number(item.annualValue) / 12;
      return 0;
    };
    const totE = earnings.reduce((sum, item) => {
      const def = defs.find(d => d.componentName === item.componentName);
      return sum + (def && def.includeInTotal === false ? 0 : monthlyAmount(item));
    }, 0);
    const totD = deductions.reduce((sum, item) => {
      const def = defs.find(d => d.componentName === item.componentName);
      return sum + (def && def.includeInTotal === false ? 0 : monthlyAmount(item));
    }, 0);
    setTotals({ earning: Math.round(totE), deduction: Math.round(totD), net: Math.round(totE - totD) });
  };

  const handleValueChange = (index, val) => {
    const newComponents = [...components];
    newComponents[index].monthlyValue = val;
    setComponents(newComponents);
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);

    const newEarningsList = [];
    const newDeductionsList = [];

    components.forEach(sc => {
      if (sc.monthlyValue !== '' && sc.monthlyValue !== null) {
        const item = {
          salaryComponentDefinitionsId: sc.id,
          componentName: sc.componentName,
          componentType: sc.componentType,
          monthlyValue: Number(sc.monthlyValue)
        };
        if (sc.componentCategory === 'EARNING') newEarningsList.push(item);
        if (sc.componentCategory === 'DEDUCTION') newDeductionsList.push(item);
      }
    });

    const payload = {
      tenantId,
      storeId,
      staffId: selectedStaffId,
      salaryMonth: selectedMonth,
      salaryYear: selectedYear,
      earningsList: newEarningsList,
      deductionsList: newDeductionsList
    };

    try {
      await apiService.post('/monthlyCalculationComponents', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      showToast('Monthly variables saved successfully!', 'success');
      fetchVariableComponents(selectedStaffId);
    } catch (err) {
      console.error(err);
      showToast('Failed to save variables.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const visibleStaff = useMemo(() => {
    const needle = staffQuery.trim().toLowerCase();
    if (!needle) return staffList;
    return staffList.filter((staff) => staffName(staff).toLowerCase().includes(needle));
  }, [staffList, staffQuery]);

  const selectedMonthIndex = MONTHS.indexOf(selectedMonth) + 1;
  const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
  const isLocked = selectedYear < currentYear || (selectedYear === currentYear && selectedMonthIndex <= recentMonth);

  return (
    <div className={styles.mainLayout}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>Staff</h3>
          <span className={styles.staffCountBadge}>{staffList.length} staff</span>
        </div>
        <input
          type="search"
          className={styles.sidebarSearch}
          placeholder="Search staff"
          value={staffQuery}
          onChange={(e) => setStaffQuery(e.target.value)}
          aria-label="Search staff"
        />

        <div className={styles.staffList}>
          {visibleStaff.length === 0 ? (
            <div className={styles.emptyState}>
              <LuUsers size={32} aria-hidden="true" />
              <p className={styles.emptyStateTitle}>{staffList.length === 0 ? 'No staff found' : 'No match'}</p>
              <p className={styles.emptyStateHint}>{staffList.length === 0 ? 'Add employees to assign monthly variables.' : 'No staff match that name.'}</p>
            </div>
          ) : (
            visibleStaff.map(staff => (
              <div 
                key={staff.id} 
                className={`${styles.staffItem} ${selectedStaffId === String(staff.id) ? styles.staffItemActive : ''}`}
                onClick={() => setSelectedStaffId(String(staff.id))}
              >
                <div className={styles.staffAvatar}>
                  {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                </div>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>{staffName(staff)}</div>
                  <div className={styles.staffRole}>{staff.designation || 'Staff member'}</div>
                </div>
                {selectedStaffId === String(staff.id) && <div className={styles.activeDot}></div>}
                {selectedStaffId !== String(staff.id) && <LuChevronRight className={styles.arrowIcon} />}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.contentArea}>
        {!selectedStaffId ? (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <LuUsers size={32} aria-hidden="true" />
              <p className={styles.emptyStateTitle}>Select a staff member</p>
              <p className={styles.emptyStateHint}>Choose someone from the list to assign monthly variables.</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`${styles.card} ${styles.periodCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <h4 className={styles.cardTitleText}>Payroll period</h4>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Month</label>
                    <div className={styles.inputWrapper}>
                      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${styles.amountInput} ${styles.selectInput}`}>
                        {MONTHS.map((m, idx) => {
                          const mIndex = idx + 1;
                          const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
                          let isDisabled = false;
                          if (selectedYear < currentYear) isDisabled = true;
                          else if (selectedYear === currentYear && mIndex <= recentMonth) isDisabled = true;
                          return <option key={m} value={m} disabled={isDisabled}>{m}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Year</label>
                    <div className={styles.inputWrapper}>
                      <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={`${styles.amountInput} ${styles.selectInput}`}>
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                          <option key={y} value={y} disabled={y < currentYear}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {isLocked && (
                  <p className="screenHint">This month is locked because payroll has already been calculated. Open a later month to edit variables.</p>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <h4 className={styles.cardTitleText}>Assign monthly variables</h4>
                </div>
              </div>
              <div className={styles.cardBody}>
                {loading ? (
                  <div className={styles.loadingState}>
                    <span className={styles.inlineSpinner} aria-hidden="true" />
                    Loading variables…
                  </div>
                ) : components.length === 0 ? (
                  <div className={styles.emptyState}>
                    <LuWallet size={32} aria-hidden="true" />
                    <p className={styles.emptyStateTitle}>No variable components</p>
                    <p className={styles.emptyStateHint}>This store has no monthly variable salary components configured yet.</p>
                  </div>
                ) : (
                  <div className={styles.formGrid}>
                    {components.map((comp, idx) => (
                      <div key={comp.id} className={styles.formGroup}>
                        <label className={styles.inputLabel}>
                          {comp.componentName}{' '}
                          <span className={comp.componentCategory === 'EARNING' ? styles.categoryEarning : styles.categoryDeduction}>
                            {prettyStatus(comp.componentCategory)}
                          </span>
                        </label>
                        <div className={styles.inputWrapper}>
                          <span className={styles.currencySymbol}>{currencySymbol}</span>
                          <input 
                            type="number" 
                            value={comp.monthlyValue || ''}
                            onChange={(e) => handleValueChange(idx, e.target.value)}
                            readOnly={!canManage}
                            disabled={!canManage}
                            className={styles.amountInput}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={`${styles.cardFooter} ${styles.cardFooterStacked}`}>
                <div className={styles.footerRow}>
                  <span className={styles.footerLabel}>Total earning</span>
                  <span className={styles.footerAmount}>{currencySymbol} {totals.earning.toLocaleString()}</span>
                </div>
                <div className={styles.footerRow}>
                  <span className={styles.footerLabel}>Total deduction</span>
                  <span className={styles.footerAmountDeduction}>{currencySymbol} {totals.deduction.toLocaleString()}</span>
                </div>
                <div className={styles.footerRowLast}>
                  <div>
                    <span className={`${styles.footerLabel} ${styles.footerNetLabel}`}>Net salary</span>
                  </div>
                  <div className={styles.footerNetActions}>
                    <span className={`${styles.footerAmount} ${styles.footerNetAmount}`}>{currencySymbol} {totals.net.toLocaleString()}</span>
                    {canManage && (
                      <button 
                        className={styles.btnSave} 
                        onClick={handleSave} 
                        disabled={loading || saving || isLocked}
                      >
                        <LuSave size={16} /> {saving ? 'Saving…' : 'Save variables'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalaryDashboard;
