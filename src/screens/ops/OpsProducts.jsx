import React, { useEffect, useState } from 'react';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { prettyStatus } from '../../helpers/displayUtils';
import { Badge, Button, Card, Drawer, Input, Switch } from '../../components/ui';
import styles from './opsShared.module.scss';

const emptyForm = {
  id: null,
  displayName: '',
  code: '',
  description: '',
  category: 'BILLING',
  origin: 'THIRD_PARTY',
  integrationMode: 'STANDALONE',
  defaultProduct: false,
  active: true,
  sortOrder: 100,
};

const OpsProducts = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    apiService.get('/ops/products?includeInactive=true')
      .then((res) => setProducts(res.data || []))
      .catch((err) => showToast(err.message, 'error'));
  };

  useEffect(load, [showToast]);

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (product) => {
    setForm({
      id: product.id,
      displayName: product.displayName || '',
      code: product.code || '',
      description: product.description || '',
      category: product.category || 'BILLING',
      origin: product.origin || 'THIRD_PARTY',
      integrationMode: product.integrationMode || 'STANDALONE',
      defaultProduct: !!product.defaultProduct,
      active: product.active !== false,
      sortOrder: product.sortOrder ?? 100,
    });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (form.id) {
        await apiService.put(`/ops/products/${form.id}`, form);
        showToast('Product saved.', 'success');
      } else {
        await apiService.post('/ops/products', form);
        showToast('Product added.', 'success');
      }
      setOpen(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleActive = async (product) => {
    try {
      await apiService.put(`/ops/products/${product.id}`, { active: !product.active });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p className={styles.lead}>
          Catalog of source products a client can come from. Payroll stays standalone.
          Add first-party or third-party suites here; connectors come later.
        </p>
        <Button variant="primary" onClick={openCreate}>Add product</Button>
      </div>
      <Card>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Kind</th>
                <th>Origin</th>
                <th>Mode</th>
                <th>Clients</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.displayName}</strong>
                    <div className={styles.muted}>{product.code}</div>
                  </td>
                  <td>{prettyStatus(product.category)}</td>
                  <td>{prettyStatus(product.origin)}</td>
                  <td>{prettyStatus(product.integrationMode)}</td>
                  <td>{product.clientCount ?? 0}</td>
                  <td>
                    <Badge variant={product.active ? 'success' : 'default'}>
                      {product.defaultProduct ? 'Default' : product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button variant="outline" onClick={() => openEdit(product)}>Edit</Button>
                      {!product.defaultProduct && (
                        <Button variant="outline" onClick={() => toggleActive(product)}>
                          {product.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit product' : 'New product'}>
        <form className={styles.form} onSubmit={submit}>
          <Input label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto from name" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className={styles.field}>
            <label htmlFor="product-category">Category</label>
            <select id="product-category" className={styles.control} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="BILLING">Billing</option>
              <option value="POS">POS</option>
              <option value="HRIS">HRIS</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="product-origin">Origin</label>
            <select id="product-origin" className={styles.control} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>
              <option value="FIRST_PARTY">First party</option>
              <option value="THIRD_PARTY">Third party</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="product-mode">Integration mode</label>
            <select id="product-mode" className={styles.control} value={form.integrationMode} onChange={(e) => setForm({ ...form, integrationMode: e.target.value })}>
              <option value="STANDALONE">Standalone</option>
              <option value="CONNECTOR">Connector</option>
            </select>
          </div>
          <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          <Switch
            label="Default for new clients"
            checked={form.defaultProduct}
            onChange={(e) => setForm({ ...form, defaultProduct: e.target.checked })}
          />
          <Switch
            label="Active"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <p className={styles.muted}>Connector mode is a future flag. Payroll does not sync to any product yet.</p>
          <div className={styles.actions}>
            <Button type="submit" variant="primary">{form.id ? 'Save product' : 'Add product'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default OpsProducts;
