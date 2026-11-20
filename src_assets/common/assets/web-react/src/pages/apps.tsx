import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="apps" titleKey="navbar.applications" />;
}

void createPage(Page);
