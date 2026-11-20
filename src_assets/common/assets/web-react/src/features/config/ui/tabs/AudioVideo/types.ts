import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

/** Props of the sections of the Audio/Video tab: the tab contract without the driver status. */
export type AvSectionProps = Pick<ConfigTabProps, 'config' | 'platform' | 'update'>;
