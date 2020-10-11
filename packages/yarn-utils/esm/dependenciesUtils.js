// types
/**
 * Get all packages that depend on a given package
 *
 * Be sure to have ran @{link Project#restoreInstallState} if needed
 *
 * @param project Project to search within
 * @param searchPackage Package to find as a dependency
 */
export async function getDependents(project, searchPackage) {
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
