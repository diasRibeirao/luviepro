import { PlatformBackupService } from './platform-backup.service';

describe('PlatformBackupService', () => {
  it('instancia em runtime CommonJS sem depender de default import de node:path', () => {
    expect(() => new PlatformBackupService()).not.toThrow();
  });
});
