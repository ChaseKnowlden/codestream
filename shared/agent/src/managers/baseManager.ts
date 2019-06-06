"use strict";
import { RawRTMessage } from "../api/apiProvider";
import { CodeStreamSession } from "../session";
import { debug, log } from "../system";
import { IndexParams } from "./cache";
import { BaseCache, KeyValue } from "./cache/baseCache";
import { isDirective, resolve } from "./operations";

function isCompatibleVersion(cachedEntity: any, newEntityOrDirective: any): boolean {
	if (isDirective(newEntityOrDirective)) {
		const directiveVersion = newEntityOrDirective.$version;
		if (!directiveVersion) {
			throw new Error(
				`Received directive without version attribute for object Id=${newEntityOrDirective.id}`
			);
		}
		return directiveVersion.before === cachedEntity.version || directiveVersion.before === "*";
	} else {
		if (cachedEntity.version == null && newEntityOrDirective.version == null) {
			return true;
		}
		return cachedEntity.version < newEntityOrDirective.version;
	}
}

export abstract class ManagerBase<T> {
	protected readonly cache: BaseCache<T> = new BaseCache<T>({
		idxFields: this.getIndexedFields(),
		entityName: this.getEntityName()
	});

	protected forceFetchToResolveOnCacheMiss = false;

	constructor(public readonly session: CodeStreamSession) {
		this.session.onDidRequestReset(() => {
			this.invalidateCache();
		});

		this.initialize();
	}

	protected initialize() {}

	getIndexedFields(): IndexParams<T>[] {
		return [];
	}

	protected abstract getEntityName(): string;

	protected abstract fetch(criteria: KeyValue<T>[]): Promise<T>;

	protected abstract fetchCriteria(obj: T): KeyValue<T>[];

	@log()
	protected invalidateCache() {
		this.cache.invalidate();
	}

	@debug()
	async resolve(message: RawRTMessage): Promise<T[]> {
		const resolved = await Promise.all(
			message.data.map(async (data: any) => {
				const criteria = this.fetchCriteria(data as T);
				const cached = await this.cacheGet(criteria);

				if (cached && isCompatibleVersion(cached, data)) {
					const updatedEntity = resolve(cached as any, data);
					return await this.cacheSet(updatedEntity as T, cached);
				}

				let entity;
				if (this.forceFetchToResolveOnCacheMiss || isDirective(data)) {
					entity = await this.fetch(criteria);
				} else {
					entity = data as T;
				}

				if (entity) {
					return await this.cacheSet(entity);
				}

				return undefined;
			})
		);
		return resolved.filter(Boolean) as T[];
	}

	cacheGet(criteria: KeyValue<T>[]): Promise<T | undefined> {
		return this.cache.get(criteria, { fromCacheOnly: true });
	}

	async cacheSet(entity: T, oldEntity?: T): Promise<T | undefined> {
		this.cache.set(entity, oldEntity);
		return entity;
	}
}
