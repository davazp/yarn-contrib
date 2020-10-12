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
exports.getDependents = void 0;
/**
 * Get all packages that depend on a given package
 *
 * Be sure to have ran @{link Project#restoreInstallState} if needed
 *
 * @param project Project to search within
 * @param searchPackage Package to find as a dependency
 */
async function getDependents(project, searchPackage) {
    const collected = [];
    for (const dependencyPackage of project.storedPackages.values()) {
        for (const dependencyDescriptor of dependencyPackage.dependencies.values()) {
            const resolutionLocatorHash = project.storedResolutions.get(dependencyDescriptor.descriptorHash);
            if (resolutionLocatorHash === searchPackage.locatorHash) {
                collected.push(dependencyPackage);
                break;
            }
        }
    }
    return collected;
}
exports.getDependents = getDependents;
