import { TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';
import { textValue } from '@/features/config/ui/tabs/value-text';

/** Config Files tab (`configs/tabs/Files.vue`): paths of the apps, credentials, log, key, certificate and state files. */
export function FilesTab({ config, update }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="config-files">
      <TextField
        id="file_apps"
        label="config.file_apps"
        desc="config.file_apps_desc"
        placeholder="apps.json"
        monospace
        value={textValue(config['file_apps'])}
        onChange={(value) => update('file_apps', value)}
      />
      <TextField
        id="credentials_file"
        label="config.credentials_file"
        desc="config.credentials_file_desc"
        placeholder="sunshine_state.json"
        monospace
        value={textValue(config['credentials_file'])}
        onChange={(value) => update('credentials_file', value)}
      />
      <TextField
        id="log_path"
        label="config.log_path"
        desc="config.log_path_desc"
        placeholder="sunshine.log"
        monospace
        value={textValue(config['log_path'])}
        onChange={(value) => update('log_path', value)}
      />
      <TextField
        id="pkey"
        label="config.pkey"
        desc="config.pkey_desc"
        placeholder="/dir/pkey.pem"
        monospace
        value={textValue(config['pkey'])}
        onChange={(value) => update('pkey', value)}
      />
      <TextField
        id="cert"
        label="config.cert"
        desc="config.cert_desc"
        placeholder="/dir/cert.pem"
        monospace
        value={textValue(config['cert'])}
        onChange={(value) => update('cert', value)}
      />
      <TextField
        id="file_state"
        label="config.file_state"
        desc="config.file_state_desc"
        placeholder="sunshine_state.json"
        monospace
        value={textValue(config['file_state'])}
        onChange={(value) => update('file_state', value)}
      />
    </div>
  );
}
