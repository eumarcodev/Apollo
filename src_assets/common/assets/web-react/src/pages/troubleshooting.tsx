import { createPage, PagePlaceholder } from '@/app';

function Page() {
  return <PagePlaceholder page="troubleshooting" titleKey="navbar.troubleshoot" />;
}

void createPage(Page);
