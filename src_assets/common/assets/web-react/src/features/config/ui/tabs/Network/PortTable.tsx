import { Alert, Table } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import {
  needsHttpPortNote,
  networkPortAlerts,
  networkPortRows,
  type NetworkPortPurpose,
  type NetworkPortRow,
} from '@/features/config/domain/network-ports';

/** Translation key of the note column of a port row (empty when the row has none). */
function noteKey(row: NetworkPortRow, port: number): string | null {
  if (row.purpose === 'web_ui') {
    return 'config.port_web_ui';
  }
  if (row.purpose === 'http' && needsHttpPortNote(port)) {
    return 'config.port_http_port_note';
  }
  return null;
}

const PURPOSE_KEYS: Readonly<Record<NetworkPortPurpose, string>> = {
  https: 'config.port_tcp',
  http: 'config.port_tcp',
  web_ui: 'config.port_tcp',
  rtsp: 'config.port_tcp',
  media: 'config.port_udp',
};

/**
 * Port table of the Network tab, with the two danger alerts of the base port and the note of the HTTP port.
 * The arithmetic lives in `domain/network-ports`; this component only renders it.
 */
export function PortTable({ port }: { port: number }) {
  const { t } = useTranslation();
  const alerts = networkPortAlerts(port);
  const rows = networkPortRows(port);

  return (
    <div className="flex flex-col gap-3" data-testid="port-table">
      {alerts.lowPort && (
        <Alert status="danger" data-testid="port-alert-low">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('config.port_alert_1')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      {alerts.highPort && (
        <Alert status="danger" data-testid="port-alert-high">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('config.port_alert_2')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label={t('config.port')}>
            <Table.Header>
              <Table.Column isRowHeader>{t('config.port_protocol')}</Table.Column>
              <Table.Column>{t('config.port_port')}</Table.Column>
              <Table.Column>{t('config.port_note')}</Table.Column>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => {
                const key = noteKey(row, port);
                return (
                  <Table.Row key={`${row.protocol}-${row.purpose}`} id={`${row.protocol}-${row.purpose}`}>
                    <Table.Cell>{t(PURPOSE_KEYS[row.purpose])}</Table.Cell>
                    <Table.Cell>{row.from === row.to ? String(row.from) : `${row.from} - ${row.to}`}</Table.Cell>
                    <Table.Cell>
                      {row.purpose === 'http' && key !== null ? (
                        <Alert status="accent">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Description>{t(key)}</Alert.Description>
                          </Alert.Content>
                        </Alert>
                      ) : key !== null ? (
                        t(key)
                      ) : null}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
