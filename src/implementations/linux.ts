/*
MIT License

Copyright (c) 2020 Rob Moran

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { promisify } from 'util';
import { exec } from 'child_process';
import { Implementation, USBDevice } from '../interfaces';

const asyncExec = promisify(exec);

interface FindMountResult {
    filesystems: { target: string; }[]
}

export class LinuxImplementation implements Implementation {
    public async listDevices(): Promise<USBDevice[]> {
        const udev = await import('udev');

        let devices = udev.list('usb');
        let drives = udev.list('block');
        devices = devices.filter(device => !!device.ID_SERIAL_SHORT);
        drives = drives.filter(drive => !!drive.ID_SERIAL_SHORT);
        
        const results: USBDevice[] = [];

        for (const device of devices) {
            const found = drives.find(drive => drive.ID_SERIAL_SHORT === device.ID_SERIAL_SHORT);
            if (found) {
                const mountPoint = await this.findMount(found.DEVNAME);
                if (found) {
                    results.push({
                        serialNumber: device.ID_SERIAL_SHORT,
                        mountPoint
                    });
                }
            }
        }

        return results;
    }

    protected async findMount(deviceName: string): Promise<string | undefined> {
        const command = `findmnt ${deviceName} --json --first-only --output target`
        const { stdout } = await asyncExec(command);
        try {
            const json: FindMountResult = JSON.parse(stdout.toString());
            if (json.filesystems.length) {
                return json.filesystems[0].target;
            }
        } catch (_error) {
            return undefined;
        }
    }
}
