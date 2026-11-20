import { Chip } from '@heroui/react';
import { isDangerPerm, permToStr } from '@/features/clients/domain/permissions';

export interface PermissionBadgeProps {
  perm: number;
  testId?: string;
}

/** `[ 03 00 00 ]`: the permission bytes of a device; red from the launch permission up. */
export function PermissionBadge({ perm, testId = 'perm-badge' }: PermissionBadgeProps) {
  const danger = isDangerPerm(perm);
  return (
    <Chip
      color={danger ? 'danger' : 'accent'}
      variant="soft"
      className="font-mono"
      data-testid={testId}
      data-danger={danger ? 'true' : 'false'}
    >
      [ {permToStr(perm)} ]
    </Chip>
  );
}
