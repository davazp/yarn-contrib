import type { Descriptor, DescriptorHash, Locator, MinimalResolveOptions, Package, ResolveOptions, Resolver, Project } from '@yarnpkg/core';
export declare class ProductionInstallResolver implements Resolver {
    protected readonly resolver: Resolver;
    protected readonly project: Project;
    protected readonly stripTypes: boolean;
    constructor({ resolver, project, stripTypes, }: {
        resolver: Resolver;
        project: Project;
        stripTypes: boolean;
    });
    supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean;
    supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean;
    shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean;
    bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): Descriptor;
    getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Array<Descriptor>;
    getCandidates(descriptor: Descriptor, dependencies: Map<DescriptorHash, Package>, opts: ResolveOptions): Promise<Array<Locator>>;
    resolve(locator: Locator, opts: ResolveOptions): Promise<Package>;
    getSatisfying(_descriptor: Descriptor, _references: Array<string>, _opts: ResolveOptions): Promise<Array<Locator> | null>;
}
