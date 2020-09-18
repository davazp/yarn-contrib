"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyFolderRecursivePromise = exports.copyFolder = exports.copyFile = void 0;
const fslib_1 = require("@yarnpkg/fslib");
async function copyFile(src, dist, file) {
    return fslib_1.xfs.copyFilePromise(fslib_1.ppath.join(src, file), fslib_1.ppath.join(dist, file));
}
exports.copyFile = copyFile;
async function copyFolder(src, dist, folder, exclude = []) {
    return copyFolderRecursivePromise(fslib_1.ppath.join(src, folder), fslib_1.ppath.join(dist, folder), exclude);
}
exports.copyFolder = copyFolder;
async function copyFolderRecursivePromise(source, target, exclude = []) {
    if ((await fslib_1.xfs.lstatPromise(source)).isDirectory()) {
        if (!(await fslib_1.xfs.existsPromise(target))) {
            await fslib_1.xfs.mkdirpPromise(target);
        }
        const files = await fslib_1.xfs.readdirPromise(source);
        for (const file of files) {
            const curSource = fslib_1.ppath.join(source, file);
            const curTarget = fslib_1.ppath.join(target, file);
            const isExcluded = () => {
                for (const portablePath of exclude) {
                    if (curSource.endsWith(portablePath))
                        return true;
                }
                return false;
            };
            if (!isExcluded()) {
                if ((await fslib_1.xfs.lstatPromise(curSource)).isDirectory()) {
                    await copyFolderRecursivePromise(curSource, curTarget, exclude);
                }
                else {
                    await fslib_1.xfs.copyFilePromise(curSource, curTarget);
                }
            }
        }
    }
    else {
        throw new Error('src not a folder');
    }
}
exports.copyFolderRecursivePromise = copyFolderRecursivePromise;
