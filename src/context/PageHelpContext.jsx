import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PageHelpContext = createContext({
  override: null,
  setOverride: () => {},
});

export function PageHelpProvider({ children }) {
  const [override, setOverride] = useState(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <PageHelpContext.Provider value={value}>{children}</PageHelpContext.Provider>;
}

export function usePageHelp(text) {
  const { setOverride } = useContext(PageHelpContext);
  useEffect(() => {
    setOverride(text || null);
    return () => setOverride(null);
  }, [text, setOverride]);
}

export function usePageHelpOverride() {
  return useContext(PageHelpContext).override;
}
