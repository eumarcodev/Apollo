import type { AppsBrowser } from '@/features/apps/application/ports';
import type { LauncherDownload } from '@/features/apps/domain/launcher';

function clickAnchor(configure: (anchor: HTMLAnchorElement) => void): void {
  const anchor = document.createElement('a');
  configure(anchor);
  anchor.click();
}

/** Browser adapter: both actions go through a synthetic anchor click, as the legacy page did. */
export function createAppsBrowser(): AppsBrowser {
  return {
    get hostname() {
      return window.location.hostname;
    },
    openLink(href) {
      clickAnchor((anchor) => {
        anchor.href = href;
      });
    },
    download({ fileName, href }: LauncherDownload) {
      clickAnchor((anchor) => {
        anchor.href = href;
        anchor.download = fileName;
      });
    },
  };
}
