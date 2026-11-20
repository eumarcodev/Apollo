import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="config" titleKey="navbar.configuration" />;
}

void createPage(Page);
