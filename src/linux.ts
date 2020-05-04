import { platform } from 'os';
const isLinux = platform() === 'linux';

(async () => {
    if (!isLinux) {
        return;
    }

    const udev = await import('udev');

    let devices = udev.list('usb');
    let drives = udev.list('block');
    devices = devices.filter(device => !!device.ID_SERIAL_SHORT);
    drives = drives.filter(drive => !!drive.ID_SERIAL_SHORT);
    
    devices.forEach(device => {
        const mount = drives.find(drive => drive.ID_SERIAL_SHORT === device.ID_SERIAL_SHORT);
        if (mount) {
            console.log(`${device.ID_SERIAL_SHORT}: ${mount.ID_FS_LABEL}`);
        }
    });
})();
