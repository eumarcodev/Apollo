import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="pin" titleKey="navbar.pin" />;
}

void createPage(Page);
