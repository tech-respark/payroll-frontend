import React, { useState, useEffect } from 'react';
import styles from './LeaveConfiguration.module.scss';
import { apiService } from '../api/apiService';
import { useStaffList } from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const LeaveConfiguration = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const { tenantId, storeId } = useAuth();

  const fetchTypes = async () => {
    try {
      const data = await apiService.get(`/admin/leave-plans/leave-types?tenantId=${tenantId}&storeId=${storeId}`);
      setLeaveTypes(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchPlans = async () => {
    try {
      const data = await apiService.get(`/admin/leave-plans/plans?tenantId=${tenantId}&storeId=${storeId}`);
      setLeavePlans(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTypes(); fetchPlans(); }, []);

  const TABS = [
    { id: 'types', label: 'Leave Types' },
    { id: 'plans', label: 'Leave Plans & Rules' },
    { id: 'enrollment', label: 'Staff Enrollment' },
  ];

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Leave Configuration</h1>
          <p className={styles.pageSubtitle}>
            {activeTab === 'types' && 'Manage leave categories, policy plans, and staff enrollment with surgical precision.'}
            {activeTab === 'plans' && 'Manage leave categories, policy plans, and staff enrollment with granular rule mapping.'}
            {activeTab === 'enrollment' && 'Assign leave plans to staff members, manage specific policy overrides, and monitor individual enrollment statuses across the enterprise.'}
          </p>
        </div>
        <button className={styles.exportBtn}>Export Configuration</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={styles.tabContent}>
        {activeTab === 'types'      && <LeaveTypesTab types={leaveTypes} refresh={fetchTypes} />}
        {activeTab === 'plans'      && <LeavePlansTab plans={leavePlans} types={leaveTypes} refresh={fetchPlans} />}
        {activeTab === 'enrollment' && <EnrollmentTab plans={leavePlans} />}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB 1 — LEAVE TYPES
───────────────────────────────────────────────────────────────── */
const LeaveTypesTab = ({ types, refresh }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ leaveCode: '', leaveName: '', description: '', paid: true });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 4;

  const filtered = types.filter(t =>
    t.leaveName?.toLowerCase().includes(search.toLowerCase()) ||
    t.leaveCode?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/admin/leave-plans/leave-types', { ...formData, tenantId, storeId });
      showToast('Leave Type created!', 'success');
      setFormData({ leaveCode: '', leaveName: '', description: '', paid: true });
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to create Leave Type', 'error');
    }
  };

  return (
    <div className={styles.splitLayout}>
      {/* LEFT — Create Form */}
      <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <span className={styles.formCardIcon}>⊕</span>
          <span className={styles.formCardTitle}>Create New Leave Type</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>CODE (e.g. SL)</label>
              <input
                className={styles.input}
                placeholder="SL"
                value={formData.leaveCode}
                onChange={e => setFormData({ ...formData, leaveCode: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>LEAVE TYPE</label>
              <select
                className={styles.select}
                value={formData.paid}
                onChange={e => setFormData({ ...formData, paid: e.target.value === 'true' })}
              >
                <option value="true">Paid Leave</option>
                <option value="false">Unpaid Leave</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>NAME (e.g. Sick Leave)</label>
            <input
              className={styles.input}
              placeholder="Sick Leave"
              value={formData.leaveName}
              onChange={e => setFormData({ ...formData, leaveName: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>DESCRIPTION</label>
            <textarea
              className={styles.textarea}
              placeholder="Optional description for staff reference..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <button type="submit" className={styles.primaryBtn}>Save Type</button>
        </form>
      </div>

      {/* RIGHT — Existing Types Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleRow}>
            <span className={styles.tableCardTitle}>Existing Types</span>
            <span className={styles.countBadge}>{String(types.length).padStart(2, '0')} Total</span>
          </div>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Quick Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>CODE</th>
              <th>NAME</th>
              <th>CATEGORY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="4" className={styles.emptyRow}>No leave types found.</td></tr>
            ) : paginated.map(t => (
              <tr key={t.id}>
                <td><strong className={styles.codeCell}>{t.leaveCode}</strong></td>
                <td>{t.leaveName}</td>
                <td>
                  <span className={t.paid ? styles.badgePaid : styles.badgeUnpaid}>
                    {t.paid ? 'PAID' : 'UNPAID'}
                  </span>
                </td>
                <td>
                  <div className={styles.actionBtns}>
                    <button className={styles.iconBtn} title="Edit">✏️</button>
                    <button className={styles.iconBtn} title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.tableFooter}>
          <span className={styles.paginationInfo}>Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} types</span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
          </div>
        </div>

        <div className={styles.smartRulesBanner}>
          <span className={styles.infoIcon}>ℹ️</span>
          <div>
            <div className={styles.smartRulesTitle}>Smart Rules Engine</div>
            <div className={styles.smartRulesText}>All leave types created here automatically sync with the global payroll calendar and shift roster.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB 2 — LEAVE PLANS & RULES
───────────────────────────────────────────────────────────────── */
const LeavePlansTab = ({ plans, types, refresh }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [planForm, setPlanForm] = useState({ planName: '', effectiveYear: new Date().getFullYear() });
  const [ruleForm, setRuleForm] = useState({ planId: '', leaveTypeId: '', annualAllotment: '', maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editModal, setEditModal] = useState(null); // plan object
  const [mappedRules, setMappedRules] = useState([]);

  // When a plan is selected in the rule form, load its mapped rules
  const loadRulesForPlan = async (planId) => {
    if (!planId) { setMappedRules([]); return; }
    try {
      const data = await apiService.get(`/admin/leave-plans/plans/${planId}/rules?tenantId=${tenantId}&storeId=${storeId}`);
      setMappedRules(Array.isArray(data) ? data : []);
    } catch { setMappedRules([]); }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/admin/leave-plans/plans', { ...planForm, tenantId, storeId });
      showToast('Plan created!', 'success');
      setPlanForm({ planName: '', effectiveYear: new Date().getFullYear() });
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to create Plan', 'error');
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/admin/leave-plans/map-rules', ruleForm);
      showToast('Rule mapped successfully!', 'success');
      setRuleForm({ planId: ruleForm.planId, leaveTypeId: '', annualAllotment: '', maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false });
      loadRulesForPlan(ruleForm.planId);
    } catch (err) {
      showToast(err.message || 'Failed to map rule', 'error');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await apiService.post(`/admin/leave-plans/rules/${ruleId}/delete`);
      showToast('Rule removed.', 'success');
      loadRulesForPlan(ruleForm.planId);
    } catch { showToast('Failed to delete rule', 'error'); }
  };

  const handlePlanSelect = (planId) => {
    setRuleForm(f => ({ ...f, planId }));
    loadRulesForPlan(planId);
  };

  const getTypeName = (id) => types.find(t => String(t.id) === String(id))?.leaveName || '—';

  return (
    <>
      <div className={styles.plansLayout}>
        {/* LEFT — Create Plan + Active Plans */}
        <div className={styles.plansLeft}>
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <span className={styles.formCardIcon}>⊞</span>
              <span className={styles.formCardTitle}>Create Leave Plan</span>
            </div>
            <form onSubmit={handlePlanSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>PLAN NAME</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Special Leave Plan"
                  value={planForm.planName}
                  onChange={e => setPlanForm({ ...planForm, planName: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>EFFECTIVE YEAR</label>
                <select
                  className={styles.select}
                  value={planForm.effectiveYear}
                  onChange={e => setPlanForm({ ...planForm, effectiveYear: parseInt(e.target.value) })}
                >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button type="submit" className={styles.primaryBtn}>Create Plan</button>
            </form>
          </div>

          {/* Active Plans List */}
          <div className={styles.activePlansCard}>
            <div className={styles.activePlansHeader}>
              <span className={styles.activePlansTitle}>ACTIVE PLANS</span>
              <span className={styles.listIcon}>☰</span>
            </div>
            <div className={styles.plansList}>
              {plans.length === 0 && <div className={styles.emptyPlans}>No plans created yet.</div>}
              {plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`${styles.planItem} ${ruleForm.planId === String(plan.id) ? styles.planItemActive : ''}`}
                  onClick={() => { handlePlanSelect(String(plan.id)); setEditModal(plan); }}
                >
                  <div className={styles.planIndex}>{String(idx + 1).padStart(2, '0')}</div>
                  <div className={styles.planInfo}>
                    <div className={styles.planName}>{plan.planName}</div>
                    <div className={styles.planDesc}>{plan.description || 'Standard Corporate Policy'}</div>
                  </div>
                  <span className={styles.yearChip}>{plan.effectiveYear}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Map Rules */}
        <div className={styles.rulesCard}>
          <div className={styles.rulesCardHeader}>
            <div className={styles.rulesCardTitleRow}>
              <span className={styles.rulesIcon}>⇄</span>
              <span className={styles.formCardTitle}>Map Rules to Plan</span>
            </div>
            <span className={styles.sandwichChip}>e.g. Sandwich Rule Configuration</span>
          </div>

          <form onSubmit={handleRuleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SELECT PLAN</label>
                <select
                  className={styles.select}
                  value={ruleForm.planId}
                  onChange={e => handlePlanSelect(e.target.value)}
                  required
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>SELECT LEAVE TYPE</label>
                <select
                  className={styles.select}
                  value={ruleForm.leaveTypeId}
                  onChange={e => setRuleForm({ ...ruleForm, leaveTypeId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Type --</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.leaveName}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>ANNUAL ALLOTMENT</label>
                <input
                  className={styles.input}
                  type="number"
                  step="0.5"
                  placeholder="13"
                  value={ruleForm.annualAllotment}
                  onChange={e => setRuleForm({ ...ruleForm, annualAllotment: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>MAX CONSECUTIVE DAYS (OPTIONAL)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="e.g. 3"
                  value={ruleForm.maxConsecutiveDays}
                  onChange={e => setRuleForm({ ...ruleForm, maxConsecutiveDays: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.ruleFormFooter}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>PROOF REQUIRED AFTER (DAYS)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="e.g. 2"
                  value={ruleForm.proofRequiredAfterDays}
                  onChange={e => setRuleForm({ ...ruleForm, proofRequiredAfterDays: e.target.value })}
                />
              </div>
              <button type="submit" className={styles.mapRuleBtn}>+ Map Rule</button>
            </div>
          </form>

          {/* Mapped Rules Table */}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>LEAVE TYPE</th>
                <th>ALLOTMENT</th>
                <th>CONSECUTIVE</th>
                <th>PROOF AFTER</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {mappedRules.length === 0 ? (
                <tr><td colSpan="5" className={styles.emptyRow}>
                  {ruleForm.planId ? 'No rules mapped to this plan yet.' : 'Select a plan to view mapped rules.'}
                </td></tr>
              ) : mappedRules.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className={styles.ruleDot}>●</span>
                    {getTypeName(r.leaveTypeId)}
                  </td>
                  <td>{r.annualAllotment} Days</td>
                  <td>{r.maxConsecutiveDays ? `${r.maxConsecutiveDays} Days` : 'Unlimited'}</td>
                  <td>{r.proofRequiredAfterDays ? `${r.proofRequiredAfterDays} Days` : 'N/A'}</td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => handleDeleteRule(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {editModal && (
        <EditPlanModal
          plan={editModal}
          mappedRules={mappedRules}
          types={types}
          onClose={() => setEditModal(null)}
          onSave={async (updated) => {
            try {
              await apiService.post(`/admin/leave-plans/plans/${updated.id}/update`, updated);
              showToast('Plan updated!', 'success');
              refresh();
              setEditModal(null);
            } catch (err) {
              showToast(err.message || 'Failed to update plan', 'error');
            }
          }}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   EDIT PLAN MODAL
───────────────────────────────────────────────────────────────── */
const EditPlanModal = ({ plan, mappedRules, types, onClose, onSave }) => {
  const [form, setForm] = useState({ id: plan.id, planName: plan.planName, effectiveYear: plan.effectiveYear });

  const getTypeName = (id) => types.find(t => String(t.id) === String(id))?.leaveName || '—';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Edit Leave Plan: {plan.planName} ({plan.effectiveYear})</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>PLAN NAME</label>
              <input
                className={styles.input}
                value={form.planName}
                onChange={e => setForm({ ...form, planName: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>EFFECTIVE YEAR</label>
              <select
                className={styles.select}
                value={form.effectiveYear}
                onChange={e => setForm({ ...form, effectiveYear: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.modalSectionLabel}>MAPPED RULES</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TYPE</th>
                <th>ALLOTMENT</th>
                <th>RULES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {mappedRules.length === 0 ? (
                <tr><td colSpan="4" className={styles.emptyRow}>No rules mapped.</td></tr>
              ) : mappedRules.map(r => (
                <tr key={r.id}>
                  <td>{getTypeName(r.leaveTypeId)}</td>
                  <td>{r.annualAllotment} Days</td>
                  <td>
                    {[
                      r.proofRequiredAfterDays && `Proof after ${r.proofRequiredAfterDays} days`,
                      r.maxConsecutiveDays && `Max ${r.maxConsecutiveDays} consecutive`,
                    ].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td><button className={styles.iconBtn}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={() => onSave(form)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB 3 — STAFF ENROLLMENT
───────────────────────────────────────────────────────────────── */
const EnrollmentTab = ({ plans }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const { staffList = [], isLoading } = useStaffList();
  const [enrollForm, setEnrollForm] = useState({ planId: '', staffId: '' });
  const [enrollments, setEnrollments] = useState([]);
  const [dirPage, setDirPage] = useState(0);
  const DIR_PAGE_SIZE = 4;

  const fetchEnrollments = async () => {
    try {
      const data = await apiService.get(`/admin/leave-plans/enrollments?tenantId=${tenantId}&storeId=${storeId}`);
      setEnrollments(Array.isArray(data) ? data : []);
    } catch { setEnrollments([]); }
  };

  useEffect(() => { fetchEnrollments(); }, []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      await apiService.post(`/admin/leave-plans/plans/${enrollForm.planId}/assign/${enrollForm.staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      showToast('Staff successfully enrolled in plan!', 'success');
      setEnrollForm({ planId: '', staffId: '' });
      fetchEnrollments();
    } catch (err) {
      showToast(err.message || 'Failed to enroll staff', 'error');
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const getPlanName = (planId) => plans.find(p => String(p.id) === String(planId))?.planName || 'None';

  // Build enrollment directory: merge staff with their enrollment data
  const directory = staffList.map(s => {
    const enrollment = enrollments.find(e => String(e.staffId) === String(s.id));
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      role: s.role || 'Staff',
      planId: enrollment?.planId || null,
      planName: enrollment ? getPlanName(enrollment.planId) : 'None',
      status: enrollment ? (enrollment.status || 'ACTIVE') : 'UNASSIGNED',
    };
  });

  const totalPages = Math.ceil(directory.length / DIR_PAGE_SIZE);
  const dirPaginated = directory.slice(dirPage * DIR_PAGE_SIZE, dirPage * DIR_PAGE_SIZE + DIR_PAGE_SIZE);
  const enrolled = directory.filter(d => d.status !== 'UNASSIGNED').length;
  const enrollPct = directory.length > 0 ? Math.round((enrolled / directory.length) * 100) : 0;

  const statusClass = (status) => {
    if (status === 'ACTIVE') return styles.statusActive;
    if (status === 'PENDING') return styles.statusPending;
    return styles.statusUnassigned;
  };

  return (
    <div className={styles.enrollLayout}>
      {/* LEFT */}
      <div className={styles.enrollLeft}>
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <span className={styles.formCardIcon}>👤+</span>
            <span className={styles.formCardTitle}>Assign Leave Plan</span>
          </div>
          <form onSubmit={handleEnroll} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>SELECT PLAN</label>
              <select
                className={styles.select}
                value={enrollForm.planId}
                onChange={e => setEnrollForm({ ...enrollForm, planId: e.target.value })}
                required
              >
                <option value="">-- Choose Plan --</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>SELECT STAFF MEMBER</label>
              <select
                className={styles.select}
                value={enrollForm.staffId}
                onChange={e => setEnrollForm({ ...enrollForm, staffId: e.target.value })}
                required
              >
                <option value="">-- Choose Staff --</option>
                {!isLoading && staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.primaryBtn}>👤+ Enroll Staff</button>
          </form>
        </div>

        {/* KPI Card */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLeft}>
            <div className={styles.kpiLabel}>TOTAL ENROLLMENT</div>
            <div className={styles.kpiValue}>{directory.length}</div>
            <div className={styles.kpiTrend}>↗ +12% from last month</div>
          </div>
          <div className={styles.kpiRight}>
            <svg viewBox="0 0 36 36" className={styles.donut}>
              <circle className={styles.donutBg} cx="18" cy="18" r="15.9" />
              <circle
                className={styles.donutFill}
                cx="18" cy="18" r="15.9"
                strokeDasharray={`${enrollPct} ${100 - enrollPct}`}
                strokeDashoffset="25"
              />
            </svg>
            <span className={styles.donutLabel}>{enrollPct}%</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Enrollment Directory */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <span className={styles.tableCardTitle}>ENROLLMENT DIRECTORY</span>
          <div className={styles.dirHeaderActions}>
            <button className={styles.iconBtn}>🔍</button>
            <button className={styles.iconBtn}>⚙</button>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>STAFF MEMBER</th>
              <th>ACTIVE PLAN</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {dirPaginated.length === 0 ? (
              <tr><td colSpan="4" className={styles.emptyRow}>No staff found.</td></tr>
            ) : dirPaginated.map(member => (
              <tr key={member.id}>
                <td>
                  <div className={styles.staffCell}>
                    <div className={styles.avatar}>{getInitials(member.name)}</div>
                    <div>
                      <div className={styles.staffName}>{member.name}</div>
                      <div className={styles.staffRole}>{member.role}</div>
                    </div>
                  </div>
                </td>
                <td>{member.planName}</td>
                <td>
                  <span className={`${styles.statusBadge} ${statusClass(member.status)}`}>
                    {member.status}
                  </span>
                </td>
                <td>
                  <button className={styles.iconBtn}>⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.tableFooter}>
          <span className={styles.paginationInfo}>Showing {dirPage * DIR_PAGE_SIZE + 1}-{Math.min((dirPage + 1) * DIR_PAGE_SIZE, directory.length)} of {directory.length} Staff Members</span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtnOutline} onClick={() => setDirPage(p => Math.max(0, p - 1))} disabled={dirPage === 0}>PREV</button>
            <button className={styles.pageBtnFill} onClick={() => setDirPage(p => Math.min(totalPages - 1, p + 1))} disabled={dirPage >= totalPages - 1}>NEXT</button>
          </div>
        </div>

        {/* Bulk Enrollment Banner */}
        <div className={styles.bulkBanner}>
          <span className={styles.infoIcon}>ℹ️</span>
          <div className={styles.bulkBannerText}>
            <strong>Bulk Enrollment available</strong>
            <p>You can also enroll staff members in bulk using the CSV upload feature in Advanced Settings.</p>
          </div>
          <button className={styles.advancedBtn}>ADVANCED SETTINGS</button>
        </div>
      </div>
    </div>
  );
};

export default LeaveConfiguration;
