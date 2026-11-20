/** The 8 pages served by Helios, with the route and the h1 each one shows. */
export const PAGES = [
  { page: 'index', route: '/', title: { en: 'Hello, Helios!', pt_BR: 'Olá, Helios!' } },
  { page: 'pin', route: '/pin', title: { en: 'PIN', pt_BR: 'PIN' } },
  { page: 'apps', route: '/apps', title: { en: 'Applications', pt_BR: 'Aplicativos' } },
  { page: 'config', route: '/config', title: { en: 'Configuration', pt_BR: 'Configuração' } },
  { page: 'password', route: '/password', title: { en: 'Change Password', pt_BR: 'Alterar senha' } },
  { page: 'welcome', route: '/welcome', title: { en: 'Welcome to Helios!', pt_BR: 'Bem-vindo ao Helios!' } },
  { page: 'login', route: '/login', title: { en: 'Login', pt_BR: 'Login' } },
  {
    page: 'troubleshooting',
    route: '/troubleshooting',
    title: { en: 'Troubleshooting', pt_BR: 'Solução de Problemas' },
  },
] as const;
