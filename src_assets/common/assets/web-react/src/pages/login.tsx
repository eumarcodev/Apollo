import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="login" titleKey="welcome.login" />;
}

void createPage(Page, { layout: 'bare' });
