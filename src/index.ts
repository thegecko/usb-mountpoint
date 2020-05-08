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

import { platform } from 'os';
import { Implementation } from './interfaces';
import { MacImplementation } from './implementations/mac';
import { LinuxImplementation } from './implementations/linux';
import { WindowsImplementation } from './implementations/windows';

const getImplementation = (): Implementation => {
    const host = platform();

    if (host === 'win32') {
        return new WindowsImplementation();
    }

    if (host === 'darwin') {
        return new MacImplementation();
    }

    // Default to linux
    return new LinuxImplementation();
}

const implementation = getImplementation();
export const listDevices = () => implementation.listDevices();
