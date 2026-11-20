import { useCallback, useEffect, useState } from 'react';
import { resolveHash, type ConfigTab, type ConfigTabId } from '@/features/config/domain/config-tabs';

interface ScrollRequest {
  optionKey: string;
}

export interface HashNavigation {
  selectedTab: ConfigTabId;
  /** Select a tab from the tab list (drops a `#tab`/`#option` hash, as the legacy `href="#"` links did). */
  selectTab(tabId: ConfigTabId): void;
}

function initialTab(tabs: readonly ConfigTab[]): ConfigTabId {
  return resolveHash(window.location.hash, tabs)?.tabId ?? tabs[0]?.id ?? 'general';
}

/**
 * `#<tabId>` selects the tab; `#<optionKey>` selects the tab that owns the option and scrolls to the element with that
 * id once the tab is rendered. Read on load and on every `hashchange` (legacy `handleHash`).
 */
export function useHashNavigation(tabs: readonly ConfigTab[]): HashNavigation {
  const [selectedTab, setSelectedTab] = useState<ConfigTabId>(() => initialTab(tabs));
  const [scroll, setScroll] = useState<ScrollRequest | null>(() => {
    const target = resolveHash(window.location.hash, tabs);
    return target?.optionKey ? { optionKey: target.optionKey } : null;
  });

  useEffect(() => {
    const onHashChange = () => {
      const target = resolveHash(window.location.hash, tabs);
      if (!target) {
        return;
      }
      setSelectedTab(target.tabId);
      setScroll(target.optionKey ? { optionKey: target.optionKey } : null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [tabs]);

  useEffect(() => {
    if (!scroll) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(scroll.optionKey)?.scrollIntoView({ block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scroll, selectedTab]);

  const selectTab = useCallback((tabId: ConfigTabId) => {
    setSelectedTab(tabId);
    setScroll(null);
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
  }, []);

  return { selectedTab, selectTab };
}
