import { Package, Project } from '@yarnpkg/core';
/**
 * Get all packages that depend on a given package
 *
 * Be sure to have ran @{link Project#restoreInstallState} if needed
 *
 * @param project Project to search within
 * @param searchPackage Package to find as a dependency
 */
export declare function getDependents(project: Project, searchPackage: Package): Promise<Array<Package>>;
