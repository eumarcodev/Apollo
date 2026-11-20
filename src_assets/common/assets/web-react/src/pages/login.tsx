import { createPage } from '@/app';
import { LoginPage } from '@/features/auth';

void createPage(LoginPage, { layout: 'bare' });
