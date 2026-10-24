import React, { useEffect, useState } from 'react';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { prettyStatus } from '../../helpers/displayUtils';
import { Badge, Button, Card, Drawer, Input } from '../../components/ui';
import styles from './opsShared.module.scss';

const emptyForm = { username: '', password: '', displayName: '', email: '', role: 'SALES' };

const OpsOperators = () => {
  const { showToast } = useToast();
  const [operators, setOperators] = useState([]);
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ id: null, username: '', password: '' });
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    apiService.get('/ops/operators')
      .then((res) => setOperators(res.data || []))
      .catch((err) => showToast(err.message, 'error'));
  };

  useEffect(load, [showToast]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/ops/operators', form);
      showToast('Operator created.', 'success');
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await apiService.put(`/ops/operators/${passwordForm.id}`, { password: passwordForm.password });
      showToast('Password updated.', 'success');
      setPasswordOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleActive = async (operator) => {
    try {
      await apiService.put(`/ops/operators/${operator.id}`, { active: !operator.active });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p className={styles.lead}>Create superadmin and sales users. These accounts never enter the client app.</p>
        <Button variant="primary" onClick={() => setOpen(true)}>Add operator</Button>
      </div>
      <Card>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators.map((operator) => (
                <tr key={operator.id}>
                  <td>{operator.username}</td>
                  <td>{operator.displayName || '—'}</td>
                  <td>{prettyStatus(operator.role)}</td>
                  <td>
                    <Badge variant={operator.active ? 'success' : 'default'}>
                      {operator.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button variant="outline" onClick={() => {
                        setPasswordForm({ id: operator.id, username: operator.username, password: '' });
                        setPasswordOpen(true);
                      }}
                      >
                        Password
                      </Button>
                      <Button variant="outline" onClick={() => toggleActive(operator)}>
                        {operator.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title="New operator">
        <form className={styles.form} onSubmit={submit}>
          <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className={styles.field}>
            <label htmlFor="operator-role">Role</label>
            <select
              id="operator-role"
              className={styles.control}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="SALES">Sales</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
          </div>
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Create</Button>
          </div>
        </form>
      </Drawer>
      <Drawer open={passwordOpen} onClose={() => setPasswordOpen(false)} title={`Password for ${passwordForm.username}`}>
        <form className={styles.form} onSubmit={savePassword}>
          <Input label="New password" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Update password</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default OpsOperators;
