"use strict";
/*
 * Copyright 2020 Larry1123
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyFolderRecursivePromise = exports.copyFolder = exports.copyFile = void 0;
const fslib_1 = require("@yarnpkg/fslib");
async function copyFile(src, dist, file) {
    await fslib_1.xfs.mkdirpPromise(fslib_1.ppath.dirname(fslib_1.ppath.resolve(dist, file)));
    return fslib_1.xfs.copyFilePromise(fslib_1.ppath.resolve(src, file), fslib_1.ppath.resolve(dist, file));
}
exports.copyFile = copyFile;
async function copyFolder(src, dist, folder, exclude = []) {
    return copyFolderRecursivePromise(fslib_1.ppath.resolve(src, folder), fslib_1.ppath.resolve(dist, folder), exclude);
}
exports.copyFolder = copyFolder;
async function copyFolderRecursivePromise(source, target, exclude = []) {
    if ((await fslib_1.xfs.lstatPromise(source)).isDirectory()) {
        if (!(await fslib_1.xfs.existsPromise(target))) {
            await fslib_1.xfs.mkdirpPromise(target);
        }
        const files = await fslib_1.xfs.readdirPromise(source);
        for (const file of files) {
            const curSource = fslib_1.ppath.resolve(source, file);
            const curTarget = fslib_1.ppath.resolve(target, file);
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
