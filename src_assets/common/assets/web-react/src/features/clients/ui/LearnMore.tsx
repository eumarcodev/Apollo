import { Link } from '@heroui/react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface LearnMoreProps {
  href: string;
  testId?: string;
}

/** "Learn more" link that opens the documentation in a new tab. */
export function LearnMore({ href, testId }: LearnMoreProps) {
  const { t } = useTranslation();
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>
      {t('_common.learn_more')}
      <ExternalLink aria-hidden="true" className="size-3.5" />
    </Link>
  );
}
