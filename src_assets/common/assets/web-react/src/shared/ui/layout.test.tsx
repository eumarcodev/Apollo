import { toast } from '@heroui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { notify } from './notify';
import { PageLayout } from './PageLayout';
import { PlatformOnly } from './PlatformOnly';

describe('PageLayout', () => {
  it('renders title, description, actions and content', () => {
    render(
      <PageLayout title="Title" description="Desc" actions={<button type="button">act</button>} className="extra">
        body
      </PageLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument();
    // fills the dashboard content area up to a wide cap instead of a narrow centered column
    expect(screen.getByText('body').closest('section')).toHaveClass('extra', 'w-full', 'max-w-[1920px]');
  });

  it('omits the header when there is no title nor actions', () => {
    render(<PageLayout>only body</PageLayout>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('PlatformOnly', () => {
  it('renders only on the listed platforms', () => {
    const { rerender } = render(
      <PlatformOnly platform="windows" platforms={['windows']}>
        win
      </PlatformOnly>,
    );
    expect(screen.getByText('win')).toBeInTheDocument();
    rerender(
      <PlatformOnly platform="linux" platforms={['windows', 'macos']}>
        win
      </PlatformOnly>,
    );
    expect(screen.queryByText('win')).not.toBeInTheDocument();
    rerender(
      <PlatformOnly platform={undefined} platforms={['linux']}>
        win
      </PlatformOnly>,
    );
    expect(screen.queryByText('win')).not.toBeInTheDocument();
  });
});

describe('notify', () => {
  it('maps to HeroUI toast variants', () => {
    const info = vi.spyOn(toast, 'info').mockReturnValue('1');
    const success = vi.spyOn(toast, 'success').mockReturnValue('2');
    const warning = vi.spyOn(toast, 'warning').mockReturnValue('3');
    const danger = vi.spyOn(toast, 'danger').mockReturnValue('4');
    expect(notify.info('i')).toBe('1');
    expect(notify.success('s', { timeout: 0 })).toBe('2');
    expect(notify.warning('w')).toBe('3');
    expect(notify.error('e', { description: 'd' })).toBe('4');
    expect(info).toHaveBeenCalledWith('i', undefined);
    expect(success).toHaveBeenCalledWith('s', { timeout: 0 });
    expect(warning).toHaveBeenCalledOnce();
    expect(danger).toHaveBeenCalledWith('e', { description: 'd' });
  });
});
