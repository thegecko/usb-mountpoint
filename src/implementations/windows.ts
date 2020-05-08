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
const EOL = '\r\r\n';

interface WmiObject {
    DeviceID: string;
}

interface DiskDrive extends WmiObject, USBDevice {
}

interface DiskPartition extends WmiObject {
}

interface LogicalDisk extends WmiObject {
}

export class WindowsImplementation implements Implementation {
    public async listDevices(): Promise<USBDevice[]> {
        const results: USBDevice[] = [];
        const drives = await this.getDrives();

        for(const drive of drives) {
            const partitions = await this.getPartitions(drive.DeviceID);
            if (!partitions.length) {
                continue;
            }

            const disks = await this.getDisks(partitions[0].DeviceID);
            if (!disks.length) {
                continue;
            }

            results.push({
                serialNumber: drive.serialNumber,
                mountPoint: disks[0].DeviceID
            })
        }

        return results;
    }

    protected async getDrives(): Promise<DiskDrive[]> {
        const command = `Win32_DiskDrive WHERE (InterfaceType='USB') GET DeviceID, SerialNumber /FORMAT:list`;
        const data = await this.wmic(command);
        return this.parse<DiskDrive>(data);
    }

    protected async getPartitions(deviceId: string): Promise<DiskPartition[]> {
        let command = `Win32_DiskDrive WHERE (DeviceID='${deviceId}') ASSOC:list /RESULTCLASS:Win32_DiskPartition`;
        const data = await this.wmic(command);
        return this.parse<DiskPartition>(data);
    }

    protected async getDisks(deviceId: string): Promise<LogicalDisk[]> {
        let command = `Win32_DiskPartition WHERE (DeviceID='${deviceId}') ASSOC:list /RESULTCLASS:Win32_LogicalDisk`;
        const data = await this.wmic(command);
        return this.parse<LogicalDisk>(data);
    }

    protected async wmic(command: string): Promise<string> {
        command = command.replace(/\\/g, '\\\\');
        command = `wmic /NAMESPACE: \\\\root\\cimv2 /NODE: 127.0.0.1 PATH ${command}`;
        const { stdout } = await asyncExec(command);
        return stdout.toString();
    }

    protected async parse<T>(data: string): Promise<T[]> {
        const results = [];
        const items = data.split(`${EOL}${EOL}`);
        for (const item of items) {
            if (item) {
                const lines = item.split(`${EOL}`);
                if (lines.length > 1) {
                    const result = {};
                    for (const line of lines) {
                        const keyval = line.split('=');
                        result[keyval[0]] = keyval[1];
                    }
                    results.push(result);
                }
            }
        }
        return results;
    }
}
