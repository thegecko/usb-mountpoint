import { exec } from 'child_process';
import { promisify } from 'util';

const asyncExec = promisify(exec);
const EOL = '\r\r\n';

interface Result {
    SerialNumber: string;
    MountPoint: string;
}

interface WmiObject {
    DeviceID: string;
}

interface DiskDrive extends WmiObject, Result {
}

interface DiskPartition extends WmiObject {
}

interface LogicalDisk extends WmiObject {
}

const getDrives = async (): Promise<DiskDrive[]> => {
    const command = `Win32_DiskDrive WHERE (InterfaceType='USB') GET DeviceID, SerialNumber /FORMAT:list`;
    const data = await wmic(command);
    return parse<DiskDrive>(data);
};

const getPartitions = async (deviceId: string): Promise<DiskPartition[]> => {
    let command = `Win32_DiskDrive WHERE (DeviceID='${deviceId}') ASSOC:list /RESULTCLASS:Win32_DiskPartition`;
    const data = await wmic(command);
    return parse<DiskPartition>(data);
};

const getDisks = async (deviceId: string): Promise<LogicalDisk[]> => {
    let command = `Win32_DiskPartition WHERE (DeviceID='${deviceId}') ASSOC:list /RESULTCLASS:Win32_LogicalDisk`;
    const data = await wmic(command);
    return parse<LogicalDisk>(data);
};

const wmic = async (command: string): Promise<string> => {
    command = command.replace(/\\/g, '\\\\');
    command = `wmic /NAMESPACE: \\\\root\\cimv2 /NODE: 127.0.0.1 PATH ${command}`;
    const { stdout } = await asyncExec(command);
    return stdout.toString();
};

const parse = async <T>(data: string): Promise<T[]>  => {
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

const log = (data: {}) => {
    console.log(JSON.stringify(data, null, '\t'));
}

(async () => {
    const results: Result[] = [];
    const drives = await getDrives();
    for(const drive of drives) {
        const partitions = await getPartitions(drive.DeviceID);
        if (partitions.length) {
            const disks = await getDisks(partitions[0].DeviceID);
            if (disks.length) {
                results.push({
                    SerialNumber: drive.SerialNumber,
                    MountPoint: disks[0].DeviceID
                })
            }
        }
    }
    log(results);
})();
