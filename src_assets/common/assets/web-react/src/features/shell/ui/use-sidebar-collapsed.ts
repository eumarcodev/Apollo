import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sidebarCollapsed';

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Collapsed state of the desktop sidebar, remembered in localStorage (the page works without it). */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // storage blocked: the choice only lasts for this page
    }
  }, [collapsed]);
  return [collapsed, toggle];
}
