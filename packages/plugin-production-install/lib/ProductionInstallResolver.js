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
exports.ProductionInstallResolver = void 0;
// imports
const core_1 = require("@yarnpkg/core");
class ProductionInstallResolver {
    constructor({ resolver, project, stripTypes = true, }) {
        this.resolver = resolver;
        this.project = project;
        this.stripTypes = stripTypes;
    }
    supportsDescriptor(descriptor, opts) {
        return this.resolver.supportsDescriptor(descriptor, opts);
    }
    supportsLocator(locator, opts) {
        return this.resolver.supportsLocator(locator, opts);
    }
    shouldPersistResolution(locator, opts) {
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol)) {
            return false;
        }
        else {
            return this.resolver.shouldPersistResolution(locator, opts);
        }
    }
    bindDescriptor(descriptor, fromLocator, opts) {
        return this.resolver.bindDescriptor(descriptor, fromLocator, opts);
    }
    getResolutionDependencies(descriptor, opts) {
        return this.resolver.getResolutionDependencies(descriptor, opts);
    }
    async getCandidates(descriptor, dependencies, opts) {
        if (descriptor.range.startsWith(core_1.WorkspaceResolver.protocol) &&
            descriptor.range !== `${core_1.WorkspaceResolver.protocol}.`) {
            const workplace = this.project.getWorkspaceByDescriptor(descriptor);
            return [workplace.anchoredLocator];
        }
        else {
            return this.resolver.getCandidates(descriptor, dependencies, opts);
        }
    }
    async resolve(locator, opts) {
        const resolve = async () => {
            if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
                locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
                const workspace = this.project.getWorkspaceByLocator(locator);
                return {
                    ...locator,
                    version: workspace.manifest.version || `0.0.0`,
                    languageName: `unknown`,
                    linkType: core_1.LinkType.SOFT,
                    dependencies: new Map([...workspace.manifest.dependencies]),
                    peerDependencies: new Map([...workspace.manifest.peerDependencies]),
                    dependenciesMeta: workspace.manifest.dependenciesMeta,
                    peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
                    bin: workspace.manifest.bin,
                };
            }
            return this.resolver.resolve(locator, opts);
        };
        const resolvedPackage = await resolve();
        const dependencies = new Map();
        for (const [hash, descriptor] of resolvedPackage.dependencies.entries()) {
            if (this.stripTypes && descriptor.scope === 'types') {
                continue;
            }
            dependencies.set(hash, descriptor);
        }
        return {
            ...resolvedPackage,
            dependencies,
        };
    }
    async getSatisfying(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _descriptor, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _references, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opts) {
        return null;
    }
}
exports.ProductionInstallResolver = ProductionInstallResolver;
