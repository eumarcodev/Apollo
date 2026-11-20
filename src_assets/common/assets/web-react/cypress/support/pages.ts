/** The 8 pages served by Helios, with the route and the h1 each one shows (welcome and login share the greeting). */
export const PAGES = [
  { page: 'index', route: '/', title: { en: 'Hello, Helios!', pt_BR: 'Olá, Helios!' } },
  { page: 'pin', route: '/pin', title: { en: 'PIN', pt_BR: 'PIN' } },
  { page: 'apps', route: '/apps', title: { en: 'Applications', pt_BR: 'Aplicativos' } },
  { page: 'config', route: '/config', title: { en: 'Configuration', pt_BR: 'Configuração' } },
  { page: 'password', route: '/password', title: { en: 'Password Change', pt_BR: 'Alteração de senha' } },
  { page: 'welcome', route: '/welcome', title: { en: 'Welcome to Helios!', pt_BR: 'Bem-vindo ao Helios!' } },
  { page: 'login', route: '/login', title: { en: 'Welcome to Helios!', pt_BR: 'Bem-vindo ao Helios!' } },
  {
    page: 'troubleshooting',
    route: '/troubleshooting',
    title: { en: 'Troubleshooting', pt_BR: 'Solução de Problemas' },
  },
] as const;
