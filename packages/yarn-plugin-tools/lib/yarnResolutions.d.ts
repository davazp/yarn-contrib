/// <reference types="node" />
import type { PortablePath } from '@yarnpkg/fslib';
import { Project, Report } from '@yarnpkg/core';
export declare function downloadYarnRepo(project: Project, report: Report): Promise<Buffer>;
export declare function downloadAndExtractYarn(project: Project, extractPath: PortablePath, report: Report): Promise<void>;
export declare function readyYarnProject(yarnPath: PortablePath, report: Report): Promise<Project>;
export declare function genResolutions(yarnProject: Project, report: Report): Promise<Map<string, string>>;
export declare function updateProjectResolutions(project: Project, resolutions: Map<string, string>, report: Report): Promise<void>;
export declare function updateInstall(project: Project, report: Report): Promise<void>;
