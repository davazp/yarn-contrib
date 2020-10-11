import { PortablePath } from '@yarnpkg/fslib';
export declare function copyFile(src: PortablePath, dist: PortablePath, file: PortablePath): Promise<void>;
export declare function copyFolder(src: PortablePath, dist: PortablePath, folder: PortablePath, exclude?: Array<PortablePath>): Promise<void>;
export declare function copyFolderRecursivePromise(source: PortablePath, target: PortablePath, exclude?: Array<PortablePath>): Promise<void>;
