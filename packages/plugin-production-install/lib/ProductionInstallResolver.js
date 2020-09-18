"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionInstallResolver = void 0;
const core_1 = require("@yarnpkg/core");
class ProductionInstallResolver {
    constructor({ resolver, project }) {
        this.resolver = resolver;
        this.project = project;
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
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
            locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
            const workspace = this.project.getWorkspaceByLocator(locator);
            return {
                ...locator,
                version: workspace.manifest.version || `0.0.0`,
                languageName: `unknown`,
                linkType: core_1.LinkType.SOFT,
                dependencies: new Map([
                    ...workspace.manifest.dependencies,
                ]),
                peerDependencies: new Map([...workspace.manifest.peerDependencies]),
                dependenciesMeta: workspace.manifest.dependenciesMeta,
                peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
                bin: workspace.manifest.bin,
            };
        }
        return this.resolver.resolve(locator, opts);
    }
    async getSatisfying(_descriptor, _references, _opts) {
        return null;
    }
}
exports.ProductionInstallResolver = ProductionInstallResolver;
