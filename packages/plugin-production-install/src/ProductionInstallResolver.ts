import {
  Descriptor,
  DescriptorHash,
  LinkType,
  Locator,
  MinimalResolveOptions,
  Package,
  Project,
  ResolveOptions,
  Resolver,
  WorkspaceResolver,
} from '@yarnpkg/core'

export class ProductionInstallResolver implements Resolver {
  protected readonly resolver: Resolver
  protected readonly project: Project

  constructor({ resolver, project }: { resolver: Resolver; project: Project }) {
    this.resolver = resolver
    this.project = project
  }

  supportsDescriptor(
    descriptor: Descriptor,
    opts: MinimalResolveOptions,
  ): boolean {
    return this.resolver.supportsDescriptor(descriptor, opts)
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean {
    return this.resolver.supportsLocator(locator, opts)
  }

  shouldPersistResolution(
    locator: Locator,
    opts: MinimalResolveOptions,
  ): boolean {
    if (locator.reference.startsWith(WorkspaceResolver.protocol)) {
      return false
    } else {
      return this.resolver.shouldPersistResolution(locator, opts)
    }
  }

  bindDescriptor(
    descriptor: Descriptor,
    fromLocator: Locator,
    opts: MinimalResolveOptions,
  ): Descriptor {
    return this.resolver.bindDescriptor(descriptor, fromLocator, opts)
  }

  getResolutionDependencies(
    descriptor: Descriptor,
    opts: MinimalResolveOptions,
  ): Array<Descriptor> {
    return this.resolver.getResolutionDependencies(descriptor, opts)
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: Map<DescriptorHash, Package>,
    opts: ResolveOptions,
  ): Promise<Array<Locator>> {
    if (
      descriptor.range.startsWith(WorkspaceResolver.protocol) &&
      descriptor.range !== `${WorkspaceResolver.protocol}.`
    ) {
      const workplace = this.project.getWorkspaceByDescriptor(descriptor)
      return [workplace.anchoredLocator]
    } else {
      return this.resolver.getCandidates(descriptor, dependencies, opts)
    }
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      let workspace = this.project.getWorkspaceByLocator(locator)
      return {
        ...locator,
        version: workspace.manifest.version || `0.0.0`,
        languageName: `unknown`,
        linkType: LinkType.SOFT,
        dependencies: new Map([
          ...workspace.manifest.dependencies,
          ...workspace.manifest.devDependencies,
        ]),
        peerDependencies: new Map([...workspace.manifest.peerDependencies]),
        dependenciesMeta: workspace.manifest.dependenciesMeta,
        peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
        bin: workspace.manifest.bin,
      }
    }
    return this.resolver.resolve(locator, opts)
  }
}
