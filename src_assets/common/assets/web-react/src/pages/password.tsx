import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="password" titleKey="navbar.password" />;
}

void createPage(Page);
