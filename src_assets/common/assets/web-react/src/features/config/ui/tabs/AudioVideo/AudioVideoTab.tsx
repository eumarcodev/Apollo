import { PlatformOnly } from '@/shared/ui';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';
import { AudioSection } from './AudioSection';
import { CaptureSection } from './CaptureSection';
import { DisplaySection } from './DisplaySection';
import { VdisplayStatusAlert } from './VdisplayStatusAlert';

/** Audio/Video tab (`av`), without the display device options (issue #171 renders them after the capture section). */
export function AudioVideoTab({ config, platform, update, vdisplayStatus }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-10" data-testid="av-tab">
      <AudioSection config={config} platform={platform} update={update} />
      <CaptureSection config={config} platform={platform} update={update} />
      {/* Display device options (dd_*, issue #171) go here, after the output selector, as in the legacy page. */}
      <DisplaySection config={config} platform={platform} update={update} />
      <PlatformOnly platform={platform} platforms={['windows']}>
        <VdisplayStatusAlert status={vdisplayStatus} />
      </PlatformOnly>
    </div>
  );
}
