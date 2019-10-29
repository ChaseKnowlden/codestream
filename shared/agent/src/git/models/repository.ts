"use strict";
import { WorkspaceFolder } from "vscode-languageserver";
import { SessionContainer } from "../../container";
import { CSFileStream, CSRepository } from "../../protocol/api.protocol";

export class GitRepository {
	readonly normalizedPath: string;

	private readonly _knownRepositorySearchPromise: Promise<CSRepository | undefined>;
	private _knownRepository: CSRepository | undefined;

	constructor(
		public readonly path: string,
		public readonly root: boolean,
		public readonly folder: WorkspaceFolder,
		knownRepos: Map<string, CSRepository>
	) {
		this.normalizedPath = (this.path.endsWith("/") ? this.path : `${this.path}/`).toLowerCase();

		this._knownRepositorySearchPromise = this.searchForKnownRepository(knownRepos);
	}

	get id() {
		return this._knownRepository !== undefined ? this._knownRepository.id : undefined;
	}

	async ensureSearchComplete() {
		await this._knownRepositorySearchPromise;
	}

	getRemotes() {
		return SessionContainer.instance().git.getRepoRemotes(this.path);
	}

	async getStreams(): Promise<CSFileStream[]> {
		if (this.id === undefined) return [];

		return SessionContainer.instance().files.getByRepoId(this.id);
	}

	async searchForKnownRepository(knownRepos: Map<string, CSRepository>) {
		let found;

		const remotes = await this.getRemotes();
		for (const r of remotes) {
			const repo = knownRepos.get(r.normalizedUrl);
			if (repo !== undefined) {
				found = repo;
				break;
			}
		}

		this._knownRepository = found;
		return this._knownRepository;
	}

	setKnownRepository(repo: CSRepository) {
		this._knownRepository = repo;
	}
}
