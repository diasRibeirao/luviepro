// Workaround for Node 22 on some Windows installations where os.userInfo()
// throws uv_os_get_passwd ENOMEM. tsx only needs a stable temporary-folder key.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}
