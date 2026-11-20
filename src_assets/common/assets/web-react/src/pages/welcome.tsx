import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="welcome" titleKey="welcome.greeting" />;
}

void createPage(Page, { layout: 'bare' });
