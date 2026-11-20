import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="index" titleKey="navbar.home" />;
}

void createPage(Page);
