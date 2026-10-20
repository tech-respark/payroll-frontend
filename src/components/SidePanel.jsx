import React from 'react';
import { Drawer } from './ui';

/** @deprecated Prefer importing Drawer from components/ui. Kept for compatibility. */
const SidePanel = ({ isOpen, onClose, title, children }) => (
  <Drawer open={isOpen} onClose={onClose} title={title}>
    {children}
  </Drawer>
);

export default SidePanel;
