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

import {
  PortablePath, ppath, xfs 
} from '@yarnpkg/fslib'

export async function copyFile(
  src: PortablePath,
  dist: PortablePath,
  file: PortablePath,
): Promise<void> {
  return xfs.copyFilePromise(ppath.join(src, file), ppath.join(dist, file))
}

export async function copyFolder(
  src: PortablePath,
  dist: PortablePath,
  folder: PortablePath,
  exclude: Array<PortablePath> = [],
): Promise<void> {
  return copyFolderRecursivePromise(
    ppath.join(src, folder),
    ppath.join(dist, folder),
    exclude,
  )
}

export async function copyFolderRecursivePromise(
  source: PortablePath,
  target: PortablePath,
  exclude: Array<PortablePath> = [],
): Promise<void> {
  if ((await xfs.lstatPromise(source)).isDirectory()) {
    if (!(await xfs.existsPromise(target))) {
      await xfs.mkdirpPromise(target)
    }
    const files = await xfs.readdirPromise(source)
    for (const file of files) {
      const curSource = ppath.join(source, file)
      const curTarget = ppath.join(target, file)
      const isExcluded = () => {
        for (const portablePath of exclude) {
          if (curSource.endsWith(portablePath)) return true
        }
        return false
      }

      if (!isExcluded()) {
        if ((await xfs.lstatPromise(curSource)).isDirectory()) {
          await copyFolderRecursivePromise(curSource, curTarget, exclude)
        }
        else {
          await xfs.copyFilePromise(curSource, curTarget)
        }
      }
    }
  }
  else {
    throw new Error('src not a folder')
  }
}
