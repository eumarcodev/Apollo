import { FileText, MessageCircle, Scale, ScrollText, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from './ExternalLink';
import { SectionHeading } from './SectionHeading';

interface LinkEntry {
  id: string;
  labelKey: string;
  href: string;
  icon: ReactNode;
}

const ICON = 'size-4';

const RESOURCES: readonly LinkEntry[] = [
  {
    id: 'discussions',
    labelKey: 'resource_card.github_discussions',
    href: 'https://github.com/eumarcodev/Helios-Server/discussions',
    icon: <MessageCircle aria-hidden="true" className={ICON} />,
  },
  {
    id: 'wiki',
    labelKey: 'resource_card.github_wiki',
    href: 'https://github.com/ClassicOldSong/Apollo/wiki',
    icon: <ScrollText aria-hidden="true" className={ICON} />,
  },
  {
    id: 'stuttering-clinic',
    labelKey: 'resource_card.github_stuttering_clinic',
    href: 'https://github.com/ClassicOldSong/Apollo/wiki/Stuttering-Clinic',
    icon: <Wrench aria-hidden="true" className={ICON} />,
  },
];

const LEGAL: readonly LinkEntry[] = [
  {
    id: 'license',
    labelKey: 'resource_card.license',
    href: 'https://github.com/eumarcodev/Helios-Server/blob/master/LICENSE',
    icon: <FileText aria-hidden="true" className={ICON} />,
  },
  {
    id: 'notice',
    labelKey: 'resource_card.third_party_notice',
    href: 'https://github.com/eumarcodev/Helios-Server/blob/master/NOTICE',
    icon: <Scale aria-hidden="true" className={ICON} />,
  },
];

/** Resources and legal links, shared by the home page and the welcome page. */
export function ResourceCard() {
  const { t } = useTranslation();
  return (
    <section
      className="helios-panel @container grid gap-8 rounded-2xl p-6 @3xl:grid-cols-2 @3xl:gap-12"
      data-testid="resource-card"
    >
      <div className="flex flex-col gap-6" data-testid="resources">
        <SectionHeading title={t('resource_card.resources')} description={t('resource_card.resources_desc')} />
        <div className="flex flex-wrap gap-3">
          {RESOURCES.map((entry) => (
            <ExternalLink key={entry.id} href={entry.href} icon={entry.icon} testId={`resource-${entry.id}`}>
              {t(entry.labelKey)}
            </ExternalLink>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6" data-testid="legal">
        <SectionHeading title={t('resource_card.legal')} description={t('resource_card.legal_desc')} />
        <div className="flex flex-wrap gap-3">
          {LEGAL.map((entry) => (
            <ExternalLink
              key={entry.id}
              href={entry.href}
              variant="danger-soft"
              icon={entry.icon}
              testId={`legal-${entry.id}`}
            >
              {t(entry.labelKey)}
            </ExternalLink>
          ))}
        </div>
      </div>
    </section>
  );
}
