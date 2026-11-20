import type { ComponentType } from 'react';
import type { ConfigTabId } from '@/features/config/domain/config-tabs';
import type { ConfigTabProps } from './types';

/**
 * Component of each configuration tab. A tab without an entry shows `ConfigTabPlaceholder`.
 * Each tab issue (#168-#174) adds `ui/tabs/<Name>Tab.tsx` and registers it here with one line, e.g.
 * `general: GeneralTab,`.
 */
export const TAB_COMPONENTS: Partial<Record<ConfigTabId, ComponentType<ConfigTabProps>>> = {};
