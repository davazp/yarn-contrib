import type { Fetcher, FetchOptions, FetchResult, Locator, MinimalFetchOptions, Project } from '@yarnpkg/core';
import { Cache } from '@yarnpkg/core';
import { PortablePath, ZipFS } from '@yarnpkg/fslib';
export declare class ProductionInstallFetcher implements Fetcher {
    protected readonly fetcher: Fetcher;
    protected readonly project: Project;
    protected readonly cache: Cache;
    constructor({ fetcher, project, cache, }: {
        fetcher: Fetcher;
        project: Project;
        cache: Cache;
    });
    supports(locator: Locator, opts: MinimalFetchOptions): boolean;
    getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null;
    fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult>;
    packWorkspace(locator: Locator, { report }: FetchOptions): Promise<ZipFS>;
    makeTemporaryCache(cache: Cache): Promise<Cache>;
}
