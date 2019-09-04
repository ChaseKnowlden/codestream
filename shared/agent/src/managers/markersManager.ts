"use strict";
import { SessionContainer } from "../container";
import {
	GetMarkerRequest,
	GetMarkerRequestType,
	GetMarkerResponse
} from "../protocol/agent.protocol";
import { CSMarker, CSStream, StreamType } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { EntityManagerBase, Id } from "./entityManager";

@lsp
export class MarkersManager extends EntityManagerBase<CSMarker> {
	async getByStreamId(streamId: Id, visibleOnly?: boolean): Promise<CSMarker[]> {
		const markers = await this.cache.getGroup([["fileStreamId", streamId]]);
		return visibleOnly ? await this.filterMarkers(markers) : markers;
	}

	protected async fetchById(id: Id): Promise<CSMarker> {
		const response = await this.session.api.getMarker({ markerId: id });
		return response.marker;
	}

	getIndexedFields(): IndexParams<CSMarker>[] {
		return [
			{
				fields: ["fileStreamId"],
				type: IndexType.Group,
				fetchFn: this.fetchByStreamId.bind(this)
			}
		];
	}

	protected async fetchByStreamId(criteria: KeyValue<CSMarker>[]): Promise<CSMarker[]> {
		const [streamId] = getValues(criteria);
		const response = await this.session.api.fetchMarkers({ streamId: streamId });
		if (response.codemarks) {
			for (const codemark of response.codemarks) {
				SessionContainer.instance().codemarks.cacheSet(codemark);
			}
		}
		return response.markers;
	}

	private async filterMarkers(markers: CSMarker[]): Promise<CSMarker[]> {
		const includedMarkers = [];
		const { streams } = SessionContainer.instance();

		for (const marker of markers) {
			if (marker.deactivated) {
				continue;
			}

			if (!marker.postStreamId) {
				includedMarkers.push(marker);
				continue;
			}

			try {
				const stream = await streams.getByIdFromCache(marker.postStreamId);
				if (stream && this.canSeeMarkers(stream, this.session.userId)) {
					includedMarkers.push(marker);
				}
			} catch (ignore) {
				// TODO the APIs will fail when the user doesn't have access to the channel/dm
			}
		}

		return includedMarkers;
	}

	private canSeeMarkers(stream: CSStream, userId: string): boolean {
		if (stream.deactivated || stream.type === StreamType.File) return false;
		if (stream.type === StreamType.Channel) {
			if (stream.isArchived) return false;
			if (stream.memberIds === undefined) return true;
			if (!stream.memberIds.includes(userId)) return false;
		}
		return true;
	}

	@lspHandler(GetMarkerRequestType)
	protected async getMarker(request: GetMarkerRequest): Promise<GetMarkerResponse> {
		const marker = await this.getById(request.markerId);
		return { marker: marker };
	}

	protected getEntityName(): string {
		return "Marker";
	}
}
