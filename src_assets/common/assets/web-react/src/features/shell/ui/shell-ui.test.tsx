import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { DashboardFrame } from './DashboardFrame';
import { PublicLayout } from './PublicLayout';

function mockSystemTheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        matches: dark,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  mockSystemTheme(false);
});

describe('DashboardFrame', () => {
  it('shows the brand, the six links in order and the content', async () => {
    await renderWithProviders(
      <DashboardFrame pathname="/">
        <p>page body</p>
      </DashboardFrame>,
    );
    const sidebar = screen.getByTestId('sidebar');
    const hrefs = within(sidebar)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    // the brand first, then the navigation
    expect(hrefs).toEqual(['./', './', './pin', './apps', './config', './password', './troubleshooting']);
    const logo = within(sidebar).getByAltText('Helios');
    expect(logo).toHaveAttribute('src', '/images/logo-helios-45.png');
    expect(logo).toHaveAttribute('title', 'Helios');
    expect(screen.getByRole('main')).toHaveTextContent('page body');
    expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'shell');
  });

  it.each([
    ['/', 'home'],
    ['/index.html', 'home'],
    ['/pin', 'pin'],
    ['/apps', 'applications'],
    ['/config', 'configuration'],
    ['/password', 'password'],
    ['/troubleshooting', 'troubleshooting'],
  ])('marks only the current page at %s', async (pathname, id) => {
    await renderWithProviders(<DashboardFrame pathname={pathname}>x</DashboardFrame>);
    const sidebar = screen.getByTestId('sidebar');
    const current = within(sidebar)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toBe(within(sidebar).getByTestId(`nav-${id}`));
  });

  it('marks nothing on pages that are not in the navigation', async () => {
    await renderWithProviders(<DashboardFrame pathname="/welcome">x</DashboardFrame>);
    expect(document.querySelector('[aria-current="page"]')).toBeNull();
  });

  it('translates the labels', async () => {
    const i18n = await createTestI18n('pt_BR');
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>, { i18n });
    expect(within(screen.getByTestId('sidebar')).getByTestId('nav-applications')).toHaveTextContent('Aplicativos');
    expect(screen.getByTestId('menu-button')).toHaveAccessibleName('Alternar navegação');
  });

  it('opens the drawer from the menu button and closes it with Escape, restoring focus', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DashboardFrame pathname="/pin">x</DashboardFrame>);
    const button = screen.getByTestId('menu-button');
    expect(screen.queryByTestId('drawer')).toBeNull();
    await user.click(button);
    const drawer = await screen.findByTestId('drawer');
    expect(within(drawer).getByTestId('nav-pin')).toHaveAttribute('aria-current', 'page');
    expect(within(drawer).getByTestId('theme-switcher')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await vi.waitFor(() => expect(screen.queryByTestId('drawer')).toBeNull());
    await vi.waitFor(() => expect(button).toHaveFocus());
  });

  it('closes the drawer with its close button', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    await user.click(screen.getByTestId('menu-button'));
    await user.click(await screen.findByTestId('drawer-close'));
    await vi.waitFor(() => expect(screen.queryByTestId('drawer')).toBeNull());
  });

  it('renders the optional top bar content', async () => {
    await renderWithProviders(
      <DashboardFrame pathname="/" topBar={<span>actions</span>}>
        x
      </DashboardFrame>,
    );
    expect(within(screen.getByTestId('top-bar')).getByText('actions')).toBeInTheDocument();
  });

  it('defaults the active page to window.location', async () => {
    await renderWithProviders(<DashboardFrame>x</DashboardFrame>);
    expect(within(screen.getByTestId('sidebar')).getByTestId('nav-home')).toHaveAttribute('aria-current', 'page');
  });
});

describe('sidebar collapse', () => {
  it('collapses to icons, keeps the links reachable and remembers the choice', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DashboardFrame pathname="/pin">x</DashboardFrame>);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    const toggle = within(sidebar).getByTestId('sidebar-toggle');
    expect(toggle).toHaveAccessibleName('Collapse sidebar');
    await user.click(toggle);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
    expect(within(sidebar).getByTestId('nav-pin')).toHaveAccessibleName('PIN');
    expect(within(sidebar).getByTestId('nav-pin')).toHaveAttribute('aria-current', 'page');
    expect(toggle).toHaveAccessibleName('Expand sidebar');
    await user.click(toggle);
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    expect(localStorage.getItem('sidebarCollapsed')).toBe('false');
  });

  it('starts collapsed when it was collapsed before', async () => {
    localStorage.setItem('sidebarCollapsed', 'true');
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('works when localStorage is blocked', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    await user.click(screen.getByTestId('sidebar-toggle'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('does not show the collapse button in the drawer', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    await user.click(screen.getByTestId('menu-button'));
    const drawer = await screen.findByTestId('drawer');
    expect(within(drawer).queryByTestId('sidebar-toggle')).toBeNull();
  });
});

describe('theme switcher', () => {
  it('defaults to dark when nothing is stored, whatever the system theme is', async () => {
    mockSystemTheme(false);
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    const sidebar = screen.getByTestId('sidebar');
    expect(within(sidebar).getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(within(sidebar).getByTestId('theme-light')).toHaveAttribute('aria-pressed', 'false');
  });

  it.each(['light', 'dark', 'auto'] as const)('stores and applies %s', async (value) => {
    const user = userEvent.setup();
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    const sidebar = screen.getByTestId('sidebar');
    await user.click(within(sidebar).getByTestId(`theme-${value}`));
    expect(localStorage.getItem('theme')).toBe(value);
    const resolved = value === 'auto' ? 'light' : value;
    expect(document.documentElement).toHaveAttribute('data-theme', resolved);
    expect(document.documentElement).toHaveClass(resolved);
    expect(within(sidebar).getByTestId(`theme-${value}`)).toHaveAttribute('aria-pressed', 'true');
    expect(within(sidebar).getByTestId('theme-preview')).toHaveAttribute('data-preview', value);
  });

  it('still applies the theme when localStorage throws', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await renderWithProviders(<DashboardFrame pathname="/">x</DashboardFrame>);
    await user.click(within(screen.getByTestId('sidebar')).getByTestId('theme-dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});

describe('PublicLayout', () => {
  it('is centered and has no navigation', async () => {
    await renderWithProviders(
      <PublicLayout>
        <p>login form</p>
      </PublicLayout>,
    );
    expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'bare');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByText('login form')).toBeInTheDocument();
  });
});
