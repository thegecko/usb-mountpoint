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
import * as parse from 'plist';
import { Implementation, USBDevice } from '../interfaces';

const asyncExec = promisify(exec);

interface SPUSBDevice {
    Media?: [{
        bsd_name: string;
    }];
    _name: string;
    manufacturer: string;
    product_id: number;
    serial_num: string;
    vendor_id: number;
}

interface SPStorageDevice {
    _name: string;
    bsd_name: string;
    mount_point: string;
}

interface SPUSBItems {
    _items?: Array<SPUSBItems | SPUSBDevice>;
}

interface SPStorageItems {
    _items: Array<SPStorageItems | SPStorageDevice>;
}

interface SPUSBDataType extends SPUSBItems {
    _dataType: 'SPUSBDataType';
}

interface SPStorageDataType extends SPStorageItems {
    _dataType: 'SPStorageDataType'
}

const DataTypes = ['SPUSBDataType', 'SPStorageDataType']
type DataType = SPUSBDataType | SPStorageDataType;

const isSPUSBDevice = (type: SPUSBItems | SPUSBDevice): type is SPUSBDevice => {
    return (type as SPUSBDevice).serial_num !== undefined;
}

const isSPUSBItems = (type: SPUSBItems | SPUSBDevice): type is SPUSBItems => {
    return (type as SPUSBItems)._items !== undefined;
}

const isSPStorageDevice = (type: SPStorageItems | SPStorageDevice): type is SPStorageDevice => {
    return (type as SPStorageDevice).bsd_name !== undefined;
}

const isSPStorageItems = (type: SPStorageItems | SPStorageDevice): type is SPStorageItems => {
    return (type as SPStorageItems)._items !== undefined;
}

export class MacImplementation implements Implementation {
    public async listDevices(): Promise<USBDevice[]> {
        const dataResult = await this.runPlistCommand();
        const deviceResult = <SPUSBDataType>dataResult.filter(type => type._dataType === 'SPUSBDataType')[0];
        const storageResult = <SPStorageDataType>dataResult.filter(type => type._dataType === 'SPStorageDataType')[0];
    
        const devices: SPUSBDevice[] = [];
        const disks: SPStorageDevice[] = [];
    
        const recurseUSBItems = (node: SPUSBItems) => {
            if (node._items) {
                node._items.forEach(element => {
                    if (isSPUSBDevice(element)) {
                        devices.push(element);
                    }
    
                    if (isSPUSBItems(element)) {
                        recurseUSBItems(element);
                    }
                });
            }
        };
    
        const recurseStorageItems = (node: SPStorageItems) => {
            if (node._items) {
                node._items.forEach(element => {
                    if (isSPStorageDevice(element)) {
                        disks.push(element);
                    }
    
                    if (isSPStorageItems(element)) {
                        recurseStorageItems(element);
                    }
                });
            }
        };
    
        recurseUSBItems(deviceResult);
        recurseStorageItems(storageResult);
    
        const getMountpoint = (bsd_name: string): string | undefined => {
            const disk = disks.find(disk => disk.bsd_name === bsd_name)
            if (disk) {
                return disk.mount_point;
            }
    
            return undefined;
        }
    
        const results: USBDevice[] = [];

        for (const device of devices) {
            if (!device.Media || !device.Media.length) {
                continue;
            }

            const mount_point = getMountpoint(device.Media[0].bsd_name);
            if (mount_point) {
                results.push({
                    serialNumber: device.serial_num,
                    mountPoint: mount_point
                });
            }
        }

        return results;
    }

    protected async runPlistCommand(dataTypes: string[] = DataTypes): Promise<DataType[]> {
        const command = `system_profiler -xml -detailLevel mini ${dataTypes.join(' ')}`;
        const { stdout } = await asyncExec(command);
        const parsed = parse.parse(stdout.toString());
        return parsed;
    }
}
