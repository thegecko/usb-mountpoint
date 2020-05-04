import { exec } from 'child_process';
import { promisify } from 'util';
import * as parse from 'plist';

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

const runCommand = async (dataTypes: string[] = DataTypes): Promise<DataType[]> => {
    const command = `/usr/sbin/system_profiler -xml -detailLevel mini ${dataTypes.join(' ')}`;
    const { stdout } = await asyncExec(command);
    const parsed = parse.parse(stdout.toString());
    return parsed;
};

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

(async () => {
    const dataResult = await runCommand();
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

    const result = devices.map(device => {
        if (device.Media?.length) {
            const mount_point = getMountpoint(device.Media[0].bsd_name);
            if (mount_point) {
                return {
                    serialNumber: device.serial_num,
                    mountPoint: mount_point
                };
            }
        }
        return {};
    });

    console.log(JSON.stringify(result));
})();
