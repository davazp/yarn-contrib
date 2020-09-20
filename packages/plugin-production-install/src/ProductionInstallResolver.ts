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

  constructor({
    resolver, project 
  }: { resolver: Resolver; project: Project }) {
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
    }
    else {
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
    }
    else {
      return this.resolver.getCandidates(descriptor, dependencies, opts)
    }
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      const workspace = this.project.getWorkspaceByLocator(locator)
      return {
        ...locator,
        version: workspace.manifest.version || `0.0.0`,
        languageName: `unknown`,
        linkType: LinkType.SOFT,
        dependencies: new Map([...workspace.manifest.dependencies]),
        peerDependencies: new Map([...workspace.manifest.peerDependencies]),
        dependenciesMeta: workspace.manifest.dependenciesMeta,
        peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
        bin: workspace.manifest.bin,
      }
    }
    return this.resolver.resolve(locator, opts)
  }

  async getSatisfying(
    _descriptor: Descriptor,
    _references: Array<string>,
    _opts: ResolveOptions,
  ): Promise<Array<Locator> | null> {
    return null
  }
}
