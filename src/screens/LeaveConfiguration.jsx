import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './LeaveConfiguration.module.scss';
import { apiService } from '../api/apiService';
import { useStaffList } from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Drawer, StaffPicker, ConfirmDialog } from '../components/ui';
import { prettyStatus } from '../helpers/displayUtils';
import { usePageHelp } from '../context/PageHelpContext';
import {
  LuPencil,
  LuPlus,
  LuSearch,
  LuArrowLeftRight,
  LuUserPlus,
  LuTrash2,
} from 'react-icons/lu';

const LeaveConfiguration = () => {
  const [activeTab, setActiveTab] = useState('types');
  const { tenantId, storeId } = useAuth();
  
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/leave-types?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId && !!storeId
  });

  const { data: leavePlans = [] } = useQuery({
    queryKey: ['leavePlans', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/plans?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId && !!storeId
  });

  const TABS = [
    { id: 'types', label: 'Leave Types' },
    { id: 'plans', label: 'Leave Plans & Rules' },
    { id: 'enrollment', label: 'Staff Enrollment' },
  ];
  const tabHelp = {
    types: 'Define leave categories staff can request. Click a type to edit it.',
    plans: 'Group types into plans and set allotment, accrual, and carry-forward rules.',
    enrollment: 'Assign a leave plan to each person. Adjust balances or override carry-forward when needed.',
  };
  usePageHelp(tabHelp[activeTab]);

  return (
    <div className={styles.page}>
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
        {activeTab === 'types'      && <LeaveTypesTab types={leaveTypes} />}
        {activeTab === 'plans'      && <LeavePlansTab plans={leavePlans} types={leaveTypes} />}
        {activeTab === 'enrollment' && <EnrollmentTab plans={leavePlans} />}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB 1 — LEAVE TYPES
───────────────────────────────────────────────────────────────── */
const LeaveTypesTab = ({ types }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ leaveCode: '', leaveName: '', description: '', paid: true, applicableGender: 'ALL' });
  const [editingType, setEditingType] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const filtered = types.filter(t =>
    t.leaveName?.toLowerCase().includes(search.toLowerCase()) ||
    t.leaveCode?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const queryClient = useQueryClient();
  const createTypeMutation = useMutation({
    mutationFn: (payload) => apiService.post('/admin/leave-plans/leave-types', payload),
    onSuccess: () => {
      showToast('Leave Type created!', 'success');
      setFormData({ leaveCode: '', leaveName: '', description: '', paid: true, applicableGender: 'ALL' });
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (err) => showToast(err.message || 'Failed to create Leave Type', 'error')
  });

  const editTypeMutation = useMutation({
    mutationFn: (payload) => apiService.put(`/admin/leave-plans/leave-types/${editingType.id}`, payload),
    onSuccess: () => {
      showToast('Leave Type updated!', 'success');
      setFormData({ leaveCode: '', leaveName: '', description: '', paid: true, applicableGender: 'ALL' });
      setEditingType(null);
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (err) => showToast(err.message || 'Failed to update Leave Type', 'error')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingType) {
      editTypeMutation.mutate({ ...formData, tenantId, storeId });
    } else {
      createTypeMutation.mutate({ ...formData, tenantId, storeId });
    }
  };

  const handleEditClick = (type) => {
    setEditingType(type);
    setFormData({
      leaveCode: type.leaveCode || '',
      leaveName: type.leaveName || '',
      description: type.description || '',
      paid: type.paid !== false,
      applicableGender: type.applicableGender || 'ALL'
    });
    setFormOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setFormData({ leaveCode: '', leaveName: '', description: '', paid: true, applicableGender: 'ALL' });
    setFormOpen(false);
  };

  const openCreate = () => {
    handleCancelEdit();
    setFormOpen(true);
  };

  const saving = createTypeMutation.isPending || editTypeMutation.isPending;

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <LuSearch size={16} className={styles.searchIcon} aria-hidden />
          <input
            className={styles.searchInput}
            placeholder="Search types"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Button onClick={openCreate}>
          <LuPlus size={16} />
          New leave type
        </Button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleRow}>
            <span className={styles.tableCardTitle}>Leave types</span>
            <span className={styles.countBadge}>{types.length} total</span>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Gender</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="4" className={styles.emptyRow}>No leave types found.</td></tr>
            ) : paginated.map(t => (
              <tr key={t.id} onClick={() => handleEditClick(t)} className={styles.clickableRow}>
                <td><strong className={styles.codeCell}>{t.leaveCode}</strong></td>
                <td>{t.leaveName}</td>
                <td>
                  <span className={t.paid ? styles.badgePaid : styles.badgeUnpaid}>
                    {t.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td>
                  <span className={styles.genderBadge}>
                    {t.applicableGender === 'MALE' ? 'Male only' : t.applicableGender === 'FEMALE' ? 'Female only' : 'All genders'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > 0 && (
        <div className={styles.tableFooter}>
          <span className={styles.paginationInfo}>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} types</span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
          </div>
        </div>
        )}
      </div>

      <Drawer
        open={formOpen}
        onClose={handleCancelEdit}
        title={editingType ? 'Edit leave type' : 'New leave type'}
        subtitle="Staff see this name when they request time off."
        footer={(
          <>
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>Cancel</Button>
            <Button type="submit" form="leave-type-form" disabled={saving}>
              {saving ? 'Saving…' : editingType ? 'Update type' : 'Save type'}
            </Button>
          </>
        )}
      >
        <form id="leave-type-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Code (e.g. SL)</label>
              <input
                className={styles.input}
                placeholder="SL"
                value={formData.leaveCode}
                onChange={(e) => setFormData({ ...formData, leaveCode: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Leave type</label>
              <select
                className={styles.select}
                value={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.value === 'true' })}
              >
                <option value="true">Paid leave</option>
                <option value="false">Unpaid leave</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name (e.g. Sick Leave)</label>
              <input
                className={styles.input}
                placeholder="Sick Leave"
                value={formData.leaveName}
                onChange={(e) => setFormData({ ...formData, leaveName: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Gender applicability</label>
              <select
                className={styles.select}
                value={formData.applicableGender}
                onChange={(e) => setFormData({ ...formData, applicableGender: e.target.value })}
              >
                <option value="ALL">All genders</option>
                <option value="MALE">Male only</option>
                <option value="FEMALE">Female only</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Optional description for staff"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB 2 — LEAVE PLANS & RULES
───────────────────────────────────────────────────────────────── */
const LeavePlansTab = ({ plans, types }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [planForm, setPlanForm] = useState({ planName: '', effectiveYear: new Date().getFullYear() });
  const [ruleForm, setRuleForm] = useState({ planId: '', leaveTypeId: '', annualAllotment: '', maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false, accrualFrequency: 'NONE', maxCarryForward: '' });
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [mapRuleOpen, setMapRuleOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: mappedRules = [] } = useQuery({
    queryKey: ['leaveRules', ruleForm.planId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/plans/${ruleForm.planId}/rules?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!ruleForm.planId
  });

  const createPlanMutation = useMutation({
    mutationFn: (payload) => apiService.post('/admin/leave-plans/plans', payload),
    onSuccess: () => {
      showToast('Plan created!', 'success');
      setPlanForm({ planName: '', effectiveYear: new Date().getFullYear() });
      setCreatePlanOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leavePlans'] });
    },
    onError: (err) => showToast(err.message || 'Failed to create Plan', 'error')
  });

  const mapRuleMutation = useMutation({
    mutationFn: (payload) => apiService.post('/admin/leave-plans/map-rules', payload),
    onSuccess: () => {
      showToast('Rule mapped successfully!', 'success');
      setRuleForm({ planId: ruleForm.planId, leaveTypeId: '', annualAllotment: '', maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false, accrualFrequency: 'NONE', maxCarryForward: '' });
      setMapRuleOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leaveRules', ruleForm.planId] });
    },
    onError: (err) => showToast(err.message || 'Failed to map rule', 'error')
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => apiService.post(`/admin/leave-plans/rules/${ruleId}/delete`),
    onSuccess: () => {
      showToast('Rule removed.', 'success');
      queryClient.invalidateQueries({ queryKey: ['leaveRules', ruleForm.planId] });
    },
    onError: () => showToast('Failed to delete rule', 'error')
  });

  const handlePlanSubmit = (e) => {
    e.preventDefault();
    createPlanMutation.mutate({ ...planForm, tenantId, storeId });
  };

  const handleRuleSubmit = (e) => {
    e.preventDefault();
    mapRuleMutation.mutate(ruleForm);
  };

  const handleDeleteRule = (ruleId) => {
    setRuleToDelete(ruleId);
  };

  const handlePlanSelect = (planId) => {
    setRuleForm(f => ({ ...f, planId }));
  };

  const getTypeName = (id) => types.find(t => String(t.id) === String(id))?.leaveName || '—';

  return (
    <>
      <div className={styles.stack}>
        <div className={styles.toolbar}>
          <span className={styles.toolbarHint}>
            {ruleForm.planId
              ? `Rules for ${plans.find((p) => String(p.id) === String(ruleForm.planId))?.planName || 'selected plan'}`
              : 'Select a plan to see its rules'}
          </span>
          <div className={styles.toolbarActions}>
            <Button variant="outline" onClick={() => setMapRuleOpen(true)} disabled={!ruleForm.planId && plans.length === 0}>
              Map rule
            </Button>
            <Button onClick={() => setCreatePlanOpen(true)}>
              <LuPlus size={16} />
              New plan
            </Button>
          </div>
        </div>

        <div className={styles.activePlansCard}>
          <div className={styles.activePlansHeader}>
            <span className={styles.activePlansTitle}>Active plans</span>
          </div>
          <div className={styles.plansList}>
            {plans.length === 0 && <div className={styles.emptyPlans}>No plans yet. Create a plan, then map leave types to it.</div>}
            {plans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`${styles.planItem} ${ruleForm.planId === String(plan.id) ? styles.planItemActive : ''}`}
                onClick={() => handlePlanSelect(String(plan.id))}
              >
                <div className={styles.planIndex}>{String(idx + 1).padStart(2, '0')}</div>
                <div className={styles.planInfo}>
                  <div className={styles.planName}>{plan.planName}</div>
                  <div className={styles.planDesc}>{plan.description || 'Standard policy'}</div>
                </div>
                <span className={styles.yearChip}>{plan.effectiveYear}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="Edit plan"
                  aria-label="Edit plan"
                  onClick={(e) => { e.stopPropagation(); handlePlanSelect(String(plan.id)); setEditModal(plan); }}
                >
                  <LuPencil size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rulesCard}>
          <div className={styles.rulesCardHeader}>
            <div className={styles.rulesCardTitleRow}>
              <span className={styles.rulesIcon}><LuArrowLeftRight size={20} /></span>
              <span className={styles.formCardTitle}>Mapped rules</span>
            </div>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Leave type</th>
                <th>Allotment</th>
                <th>Accrual</th>
                <th>Max CF</th>
                <th>Consecutive</th>
                <th>Proof after</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappedRules.length === 0 ? (
                <tr><td colSpan="7" className={styles.emptyRow}>
                  {ruleForm.planId ? 'No rules mapped to this plan yet.' : 'Select a plan to view mapped rules.'}
                </td></tr>
              ) : mappedRules.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className={styles.ruleDot}>●</span>
                    {getTypeName(r.leaveTypeId)}
                  </td>
                  <td>{r.annualAllotment} Days</td>
                  <td>{prettyStatus(r.accrualFrequency)}</td>
                  <td>{r.maxCarryForward != null ? `${r.maxCarryForward} Days` : 'N/A'}</td>
                  <td>{r.maxConsecutiveDays ? `${r.maxConsecutiveDays} Days` : 'Unlimited'}</td>
                  <td>{r.proofRequiredAfterDays ? `${r.proofRequiredAfterDays} Days` : 'N/A'}</td>
                  <td>
                    <button type="button" className={styles.iconBtn} onClick={() => handleDeleteRule(r.id)} title="Delete rule" aria-label="Delete rule"><LuTrash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        title="New leave plan"
        subtitle="Group leave types into a policy staff can be enrolled on."
        footer={(
          <>
            <Button variant="outline" onClick={() => setCreatePlanOpen(false)}>Cancel</Button>
            <Button type="submit" form="leave-plan-form" disabled={createPlanMutation.isPending}>
              {createPlanMutation.isPending ? 'Saving…' : 'Create plan'}
            </Button>
          </>
        )}
      >
        <form id="leave-plan-form" onSubmit={handlePlanSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Plan name</label>
            <input
              className={styles.input}
              placeholder="e.g. Special Leave Plan"
              value={planForm.planName}
              onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Effective year</label>
            <select
              className={styles.select}
              value={planForm.effectiveYear}
              onChange={(e) => setPlanForm({ ...planForm, effectiveYear: parseInt(e.target.value, 10) })}
            >
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={mapRuleOpen}
        onClose={() => setMapRuleOpen(false)}
        title="Map rule to plan"
        subtitle="Set allotment and accrual for one leave type."
        width={560}
        footer={(
          <>
            <Button variant="outline" onClick={() => setMapRuleOpen(false)}>Cancel</Button>
            <Button type="submit" form="map-rule-form" disabled={mapRuleMutation.isPending}>
              {mapRuleMutation.isPending ? 'Saving…' : 'Map rule'}
            </Button>
          </>
        )}
      >
        <form id="map-rule-form" onSubmit={handleRuleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Plan</label>
            <select
              className={styles.select}
              value={ruleForm.planId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              required
            >
              <option value="">Choose plan</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Leave type</label>
            <select
              className={styles.select}
              value={ruleForm.leaveTypeId}
              onChange={(e) => setRuleForm({ ...ruleForm, leaveTypeId: e.target.value })}
              required
            >
              <option value="">Choose type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.leaveName}</option>)}
            </select>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Annual allotment</label>
              <input
                className={styles.input}
                type="number"
                step="0.5"
                placeholder="13"
                value={ruleForm.annualAllotment}
                onChange={(e) => setRuleForm({ ...ruleForm, annualAllotment: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Accrual frequency</label>
              <select
                className={styles.select}
                value={ruleForm.accrualFrequency}
                onChange={(e) => setRuleForm({ ...ruleForm, accrualFrequency: e.target.value })}
              >
                <option value="NONE">On-demand / none</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max carry forward</label>
              <input
                className={styles.input}
                type="number"
                placeholder="e.g. 5"
                value={ruleForm.maxCarryForward}
                onChange={(e) => setRuleForm({ ...ruleForm, maxCarryForward: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max consecutive days</label>
              <input
                className={styles.input}
                type="number"
                placeholder="e.g. 3"
                value={ruleForm.maxConsecutiveDays}
                onChange={(e) => setRuleForm({ ...ruleForm, maxConsecutiveDays: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Proof required after (days)</label>
            <input
              className={styles.input}
              type="number"
              placeholder="e.g. 2"
              value={ruleForm.proofRequiredAfterDays}
              onChange={(e) => setRuleForm({ ...ruleForm, proofRequiredAfterDays: e.target.value })}
            />
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={ruleToDelete != null}
        title="Remove this rule?"
        body="This leave type will no longer apply to staff on this plan."
        confirmLabel="Remove rule"
        danger
        busy={deleteRuleMutation.isPending}
        onClose={() => { if (!deleteRuleMutation.isPending) setRuleToDelete(null); }}
        onConfirm={() => {
          deleteRuleMutation.mutate(ruleToDelete, {
            onSettled: () => setRuleToDelete(null),
          });
        }}
      />

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
              queryClient.invalidateQueries({ queryKey: ['leavePlans'] });
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
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRuleData, setEditingRuleData] = useState({});
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const editRuleMutation = useMutation({
    mutationFn: (payload) => apiService.put(`/admin/leave-plans/rules/${payload.id}`, payload),
    onSuccess: () => {
      showToast('Rule updated!', 'success');
      setEditingRuleId(null);
      queryClient.invalidateQueries({ queryKey: ['leaveRules', String(plan.id)] });
    },
    onError: (err) => showToast(err.message || 'Failed to update rule', 'error')
  });

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    setEditingRuleData({
      id: rule.id,
      annualAllotment: rule.annualAllotment,
      maxConsecutiveDays: rule.maxConsecutiveDays || '',
      proofRequiredAfterDays: rule.proofRequiredAfterDays || '',
      accrualFrequency: rule.accrualFrequency || 'NONE',
      maxCarryForward: rule.maxCarryForward ?? ''
    });
  };

  const handleSaveRule = () => {
    editRuleMutation.mutate(editingRuleData);
  };

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
              <label className={styles.label}>Plan name</label>
              <input
                className={styles.input}
                value={form.planName}
                onChange={e => setForm({ ...form, planName: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Effective year</label>
              <select
                className={styles.select}
                value={form.effectiveYear}
                onChange={e => setForm({ ...form, effectiveYear: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.modalSectionLabel}>Mapped rules</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Allotment</th>
                <th>Rules</th>
                <th>Actions</th>
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
                      r.accrualFrequency && r.accrualFrequency !== 'NONE' && prettyStatus(r.accrualFrequency),
                      r.maxCarryForward != null && `Max CF: ${r.maxCarryForward}`,
                      r.proofRequiredAfterDays && `Proof > ${r.proofRequiredAfterDays} days`,
                      r.maxConsecutiveDays && `Max ${r.maxConsecutiveDays} consecutive`,
                    ].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td><button type="button" className={styles.iconBtn} onClick={() => handleEditClick(r)} title="Edit Rule" aria-label="Edit rule"><LuPencil size={16} /></button></td>
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

      {/* Sub-modal for editing mapped rule */}
      {editingRuleId && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setEditingRuleId(null)}>
          <div className={styles.modal} style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Rule Limits</h3>
              <button className={styles.modalClose} onClick={() => setEditingRuleId(null)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Annual allotment</label>
                <input className={styles.input} value={editingRuleData.annualAllotment} onChange={e => setEditingRuleData({...editingRuleData, annualAllotment: e.target.value})} type="number" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Accrual frequency</label>
                <select className={styles.select} value={editingRuleData.accrualFrequency} onChange={e => setEditingRuleData({...editingRuleData, accrualFrequency: e.target.value})}>
                  <option value="NONE">On-Demand / None</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Max carry forward</label>
                <input className={styles.input} value={editingRuleData.maxCarryForward} onChange={e => setEditingRuleData({...editingRuleData, maxCarryForward: e.target.value})} type="number" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Max consecutive days (optional)</label>
                <input className={styles.input} value={editingRuleData.maxConsecutiveDays} onChange={e => setEditingRuleData({...editingRuleData, maxConsecutiveDays: e.target.value})} type="number" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proof required after (days)</label>
                <input className={styles.input} value={editingRuleData.proofRequiredAfterDays} onChange={e => setEditingRuleData({...editingRuleData, proofRequiredAfterDays: e.target.value})} type="number" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditingRuleId(null)}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSaveRule} disabled={editRuleMutation.isPending}>
                {editRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [assignOpen, setAssignOpen] = useState(false);
  const [dirPage, setDirPage] = useState(0);
  const [adjustModal, setAdjustModal] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null);
  const DIR_PAGE_SIZE = 10;
  const queryClient = useQueryClient();

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/enrollments?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId && !!storeId
  });

  const enrollMutation = useMutation({
    mutationFn: () => apiService.post(`/admin/leave-plans/plans/${enrollForm.planId}/assign/${enrollForm.staffId}?tenantId=${tenantId}&storeId=${storeId}`),
    onSuccess: () => {
      showToast('Staff successfully enrolled in plan!', 'success');
      setEnrollForm({ planId: '', staffId: '' });
      setAssignOpen(false);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => showToast(err.message || 'Failed to enroll staff', 'error')
  });

  const handleEnroll = (e) => {
    e.preventDefault();
    if (!enrollForm.staffId) {
      showToast('Select a staff member', 'error');
      return;
    }
    enrollMutation.mutate();
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
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <div className={styles.kpiInline}>
          <span className={styles.kpiLabel}>Enrolled</span>
          <strong>{enrolled}/{directory.length}</strong>
          <span className={styles.metricHint}>{enrollPct}%</span>
        </div>
        <Button onClick={() => setAssignOpen(true)}>
          <LuUserPlus size={16} />
          Assign plan
        </Button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <span className={styles.tableCardTitle}>Enrollment directory</span>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Staff member</th>
              <th>Active plan</th>
              <th>Status</th>
              <th>Actions</th>
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
                    {prettyStatus(member.status)}
                  </span>
                </td>
                <td>
                  {member.status === 'ACTIVE' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={styles.textActionBtn} onClick={() => setAdjustModal(member)}>Adjust</button>
                      <button className={styles.textActionBtn} onClick={() => setOverrideModal(member)}>Override</button>
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {directory.length > 0 && (
        <div className={styles.tableFooter}>
          <span className={styles.paginationInfo}>Showing {dirPage * DIR_PAGE_SIZE + 1}–{Math.min((dirPage + 1) * DIR_PAGE_SIZE, directory.length)} of {directory.length} staff</span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtnOutline} onClick={() => setDirPage(p => Math.max(0, p - 1))} disabled={dirPage === 0}>Prev</button>
            <button className={styles.pageBtnFill} onClick={() => setDirPage(p => Math.min(totalPages - 1, p + 1))} disabled={dirPage >= totalPages - 1}>Next</button>
          </div>
        </div>
        )}
      </div>
      
      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign leave plan"
        subtitle="Enroll one person onto a plan."
        footer={(
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button type="submit" form="enroll-form" disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Saving…' : 'Enroll staff'}
            </Button>
          </>
        )}
      >
        <form id="enroll-form" onSubmit={handleEnroll} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Plan</label>
            <select
              className={styles.select}
              value={enrollForm.planId}
              onChange={(e) => setEnrollForm({ ...enrollForm, planId: e.target.value })}
              required
            >
              <option value="">Choose plan</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
            </select>
          </div>
          <StaffPicker
            label="Staff member"
            staffList={staffList}
            value={enrollForm.staffId}
            onChange={(staffId) => setEnrollForm({ ...enrollForm, staffId })}
            placeholder="Search staff"
            loading={isLoading}
          />
        </form>
      </Drawer>

      {adjustModal && <AdjustBalanceModal member={adjustModal} onClose={() => setAdjustModal(null)} />}
      {overrideModal && <OverrideModal member={overrideModal} plans={plans} onClose={() => setOverrideModal(null)} />}
    </div>
  );
};

const AdjustBalanceModal = ({ member, onClose }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [adjustmentValue, setAdjustmentValue] = useState('');

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/leave-types?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    }
  });

  const adjustMutation = useMutation({
    mutationFn: () => apiService.post('/admin/leave-plans/adjust-balance', {
      tenantId,
      storeId,
      staffId: member.id,
      leaveTypeId,
      adjustmentValue
    }),
    onSuccess: () => {
      showToast('Balance adjusted successfully!', 'success');
      onClose();
    },
    onError: (err) => showToast(err.message || 'Failed to adjust balance', 'error')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    adjustMutation.mutate();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className={styles.modal} style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Adjust Balance for {member.name}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Leave type</label>
              <select className={styles.select} value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} required>
                <option value="">-- Select Type --</option>
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.leaveName}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Adjustment value (e.g. 2 or -1.5)</label>
              <input className={styles.input} type="number" step="0.5" value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} required />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primaryBtn} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Adjusting...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OverrideModal = ({ member, onClose }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [leavePlanRuleId, setLeavePlanRuleId] = useState('');
  const [maxCarryForwardOverride, setMaxCarryForwardOverride] = useState('');

  const { data: mappedRules = [] } = useQuery({
    queryKey: ['leaveRules', member.planId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/plans/${member.planId}/rules?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!member.planId
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/admin/leave-plans/leave-types?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    }
  });

  const overrideMutation = useMutation({
    mutationFn: () => apiService.post('/admin/leave-plans/overrides', {
      tenantId,
      storeId,
      staffId: member.id,
      leavePlanRuleId,
      maxCarryForwardOverride
    }),
    onSuccess: () => {
      showToast('Override saved successfully!', 'success');
      onClose();
    },
    onError: (err) => showToast(err.message || 'Failed to save override', 'error')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    overrideMutation.mutate();
  };

  const getTypeName = (id) => leaveTypes.find(t => String(t.id) === String(id))?.leaveName || 'Unknown Type';

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className={styles.modal} style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Carry Forward Override for {member.name}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select rule</label>
              <select className={styles.select} value={leavePlanRuleId} onChange={e => setLeavePlanRuleId(e.target.value)} required>
                <option value="">-- Select Rule --</option>
                {mappedRules.map(r => (
                  <option key={r.id} value={r.id}>
                    {getTypeName(r.leaveTypeId)} (Current Limit: {r.maxCarryForward ?? 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>New max carry forward limit</label>
              <input className={styles.input} type="number" value={maxCarryForwardOverride} onChange={e => setMaxCarryForwardOverride(e.target.value)} placeholder="e.g. 10" required />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primaryBtn} disabled={overrideMutation.isPending}>
              {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveConfiguration;
