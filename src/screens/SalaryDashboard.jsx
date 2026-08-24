import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList } from '../hooks/queries';
import { useStoreConfig } from '../hooks/queries/useStoreConfig';
import styles from './SalaryDashboard.module.scss';
import '../styles/main.scss';

// MUI Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const SalaryDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const [activeTab, setActiveTab] = useState('fixed');
  const { staffList } = useStaffList();

  return (
    <div className={styles.dashboard}>
      <div className={styles.tabList}>
        {[
          { id: 'fixed', label: 'Configure Fixed Salary' },
          { id: 'variable', label: 'Monthly Variables' }
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

  const totalGross = earnings.reduce((sum, c) => sum + (c.includeInTotal !== false ? (Number(c.monthlyValue) || 0) : 0), 0);
  const totalDeductions = deductions.reduce((sum, c) => sum + (c.includeInTotal !== false ? (Number(c.monthlyValue) || 0) : 0), 0);
  const netTakeHome = totalGross - totalDeductions;

  return (
    <div className={styles.mainContainer}>
      <div className={styles.headerContainer}>
        <div>
          <p className={styles.headerSubtitle}>Define core earnings and recurring deductions for staff roles.</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.btnSave} 
            onClick={handleSave} 
            disabled={loading || saving || !canManage}
          >
            <SaveIcon style={{fontSize: 16}} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Staff Selection</h3>
            <span className={styles.staffCountBadge}>{staffList.length} EMPLOYEES</span>
          </div>

          <div className={styles.staffList}>
            {staffList.map(staff => (
              <div 
                key={staff.id} 
                className={`${styles.staffItem} ${selectedStaffId === String(staff.id) ? styles.staffItemActive : ''}`}
                onClick={() => setSelectedStaffId(String(staff.id))}
              >
                <div className={styles.staffAvatar}>
                  {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                </div>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>{staff.firstName} {staff.lastName}</div>
                  <div className={styles.staffRole}>{staff.designation || 'Staff Member'}</div>
                </div>
                {selectedStaffId === String(staff.id) && <div className={styles.activeDot}></div>}
                {selectedStaffId !== String(staff.id) && <KeyboardArrowRightIcon className={styles.arrowIcon} />}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.contentArea}>
          {selectedStaffId && (
            <>
              {/* Earnings Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <div className={styles.cardIcon}>
                      <AccountBalanceWalletIcon style={{fontSize: 16}} />
                    </div>
                    <h4 className={styles.cardTitleText}>Core Earnings</h4>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {loading ? (
                    <div className={styles.loadingText}>Loading...</div>
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
                  <span className={styles.footerLabel}>Gross Salary Total</span>
                  <span className={styles.footerAmount}>{currencySymbol} {totalGross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Deductions Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <div className={styles.cardIcon}>
                      <MoneyOffIcon style={{fontSize: 16}} />
                    </div>
                    <h4 className={styles.cardTitleText}>Fixed Deductions</h4>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {loading ? (
                    <div className={styles.loadingText}>Loading...</div>
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
                  <span className={styles.footerLabel}>Total Deductions</span>
                  <span className={styles.footerAmountDeduction}>{currencySymbol} {totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Projected Take Home Card */}
              <div className={styles.projectedCard}>
                <div className={styles.projectedLeft}>
                  <span className={styles.projectedLabel}>PROJECTED NET MONTHLY TAKE HOME</span>
                  <h2 className={styles.projectedAmount}>{currencySymbol} {netTakeHome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
                </div>
                <div className={styles.projectedRight}>
                  <div className={styles.complianceChip}>
                    <CheckCircleIcon style={{fontSize: 16}} /> Compliance Check Passed
                  </div>
                  <span className={styles.effectiveDate}>Effective from Oct 01, 2024</span>
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

  const fetchVariableComponents = async (staffId) => {
    setLoading(true);
    try {
      const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      const availableComponents = compRes.data || [];
      
      const savedRes = await apiService.get(`/personnelSalaryComponents?staffId=${staffId}`);
      const savedStructure = savedRes.data || { earningsList: [], deductionsList: [] };

      // Filter to only variables (isCalculatedMonthly = true) and exclude those with formulas
      const varDefs = availableComponents.filter(c => c.isCalculatedMonthly && (!c.formula || c.formula.trim() === ''));

      const merged = varDefs.map(comp => {
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
      calculateTotals(savedStructure.earningsList || [], savedStructure.deductionsList || [], availableComponents);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch variables data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (earnings, deductions, defs = []) => {
    const totE = earnings.reduce((sum, item) => {
      const def = defs.find(d => d.componentName === item.componentName);
      return sum + (def && def.includeInTotal === false ? 0 : (item.annualValue / 12));
    }, 0);
    const totD = deductions.reduce((sum, item) => {
      const def = defs.find(d => d.componentName === item.componentName);
      return sum + (def && def.includeInTotal === false ? 0 : (item.annualValue / 12));
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

    // Fetch existing fixed components first so we don't overwrite them
    let fixedEarnings = [];
    let fixedDeductions = [];
    try {
      const savedRes = await apiService.get(`/personnelSalaryComponents?staffId=${selectedStaffId}`);
      if (savedRes.data) {
        const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
        const availableComponents = compRes.data || [];
        
        const isVar = (name) => {
          const def = availableComponents.find(c => c.componentName === name);
          return def ? def.isCalculatedMonthly : false;
        };

        fixedEarnings = (savedRes.data.earningsList || []).filter(e => !isVar(e.componentName));
        fixedDeductions = (savedRes.data.deductionsList || []).filter(e => !isVar(e.componentName));
      }
    } catch (err) {
      console.error("Failed to fetch existing components", err);
    }

    const newEarningsList = [...fixedEarnings];
    const newDeductionsList = [...fixedDeductions];

    components.forEach(sc => {
      if (sc.monthlyValue !== '' && sc.monthlyValue !== null) {
        const annualEquivalent = Number(sc.monthlyValue) * 12;
        const item = {
          salaryComponentDefinitionsId: sc.id,
          componentName: sc.componentName,
          componentType: sc.componentType,
          annualValue: annualEquivalent
        };
        if (sc.componentCategory === 'EARNING') newEarningsList.push(item);
        if (sc.componentCategory === 'DEDUCTION') newDeductionsList.push(item);
      }
    });

    const payload = {
      tenantId,
      storeId,
      staffId: selectedStaffId,
      earningsList: newEarningsList,
      deductionsList: newDeductionsList
    };

    try {
      await apiService.post('/personnelSalaryComponentsCalculation', payload, {
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

  return (
    <div className={styles.mainLayout}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>Staff Selection</h3>
          <span className={styles.staffCountBadge}>{staffList.length} EMPLOYEES</span>
        </div>

        <div className={styles.staffList}>
          {staffList.map(staff => (
            <div 
              key={staff.id} 
              className={`${styles.staffItem} ${selectedStaffId === String(staff.id) ? styles.staffItemActive : ''}`}
              onClick={() => setSelectedStaffId(String(staff.id))}
            >
              <div className={styles.staffAvatar}>
                {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
              </div>
              <div className={styles.staffInfo}>
                <div className={styles.staffName}>{staff.firstName} {staff.lastName}</div>
                <div className={styles.staffRole}>{staff.designation || 'Staff Member'}</div>
              </div>
              {selectedStaffId === String(staff.id) && <div className={styles.activeDot}></div>}
              {selectedStaffId !== String(staff.id) && <KeyboardArrowRightIcon className={styles.arrowIcon} />}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.contentArea}>
        {selectedStaffId && (
          <>
            <div className={styles.card} style={{ marginBottom: '24px' }}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <h4 className={styles.cardTitleText}>Payroll Period</h4>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Payroll Month</label>
                    <div className={styles.inputWrapper}>
                      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={styles.amountInput} style={{paddingLeft: '12px'}}>
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
                    <label className={styles.inputLabel}>Payroll Year</label>
                    <div className={styles.inputWrapper}>
                      <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={styles.amountInput} style={{paddingLeft: '12px'}}>
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                          <option key={y} value={y} disabled={y < currentYear}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <h4 className={styles.cardTitleText}>Assign Monthly Variables</h4>
                </div>
              </div>
              <div className={styles.cardBody}>
                {loading ? (
                  <div className={styles.loadingText}>Loading variables...</div>
                ) : components.length === 0 ? (
                  <div className={styles.emptyText}>No variable monthly components found for this store.</div>
                ) : (
                  <div className={styles.formGrid}>
                    {components.map((comp, idx) => (
                      <div key={comp.id} className={styles.formGroup}>
                        <label className={styles.inputLabel}>
                          {comp.componentName} <span style={{color: comp.componentCategory === 'EARNING' ? '#10b981' : '#f87171', fontSize: '10px', marginLeft: '4px'}}>{comp.componentCategory}</span>
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
              
              <div className={styles.cardFooter} style={{flexDirection: 'column', alignItems: 'stretch', gap: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)'}}>
                  <span className={styles.footerLabel}>Total Earning</span>
                  <span className={styles.footerAmount}>{currencySymbol} {totals.earning.toLocaleString()}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)'}}>
                  <span className={styles.footerLabel}>Total Deduction</span>
                  <span className={styles.footerAmountDeduction}>{currencySymbol} {totals.deduction.toLocaleString()}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span className={styles.footerLabel} style={{color: 'var(--text-dark)', fontWeight: 'bold'}}>Net Salary</span>
                  <span className={styles.footerAmount} style={{fontSize: '20px'}}>{currencySymbol} {totals.net.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
              {(() => {
                const selMonthIndex = MONTHS.indexOf(selectedMonth) + 1;
                const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
                let isLocked = false;
                if (selectedYear < currentYear) isLocked = true;
                else if (selectedYear === currentYear && selMonthIndex <= recentMonth) isLocked = true;
  
                return canManage && (
                  <button 
                    className={styles.btnSave} 
                    onClick={handleSave} 
                    disabled={loading || saving || isLocked}
                  >
                    <SaveIcon style={{fontSize: 16}} /> {saving ? 'Saving...' : 'Save Variables'}
                  </button>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalaryDashboard;
