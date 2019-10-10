"use strict";
import { RequestType } from "vscode-languageserver-protocol";
import { ThirdPartyProviderUser } from "./agent.protocol";
import {
	CodemarkType,
	CSCodemark,
	CSLocationArray,
	CSMarker,
	CSMarkerLocations, CSReferenceLocation,
	CSRepository,
	CSStream,
	ProviderType
} from "./api.protocol";

export interface CodemarkPlus extends CSCodemark {
	markers?: CSMarker[];
}

export interface CreateCodemarkRequest {
	type: CodemarkType;
	providerType?: ProviderType;
	text?: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	color?: string;
	status?: string;
	title?: string;
	assignees?: string[];
	tags?: string[];
	markers?: CreateCodemarkRequestMarker[];
	remotes?: string[];
	externalProvider?: string;
	externalProviderUrl?: string;
	externalAssignees?: { displayName: string; email?: string }[];
	remoteCodeUrl?: { name: string; url: string };
	createPermalink?: false | "public" | "private";
}
export interface CreateCodemarkRequestMarker {
	code: string;
	remotes?: string[];
	file?: string;
	referenceLocations?: CSReferenceLocation[];
	commitHash?: string;
	location?: CSLocationArray;
	branchWhenCreated?: string;
	remoteCodeUrl?: { name: string; url: string };
}
export interface CreateCodemarkResponse {
	codemark: CSCodemark;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	permalink?: string;
}
export const CreateCodemarkRequestType = new RequestType<
	CreateCodemarkRequest,
	CreateCodemarkResponse,
	void,
	void
>("codestream/codemarks/create");

export interface CreateCodemarkPermalinkRequest {
	codemarkId: string;
	isPublic: boolean;
}
export interface CreateCodemarkPermalinkResponse {
	permalink: string;
}
export const CreateCodemarkPermalinkRequestType = new RequestType<
	CreateCodemarkPermalinkRequest,
	CreateCodemarkPermalinkResponse,
	void,
	void
>("codestream/codemark/permalink");

export interface FetchCodemarksRequest {
	streamId?: string;
}
export interface FetchCodemarksResponse {
	codemarks: CodemarkPlus[];
	markers?: CSMarker[];
}
export const FetchCodemarksRequestType = new RequestType<
	FetchCodemarksRequest,
	FetchCodemarksResponse | undefined,
	void,
	void
>("codestream/codemarks");

export interface DeleteCodemarkRequest {
	codemarkId: string;
}
export interface DeleteCodemarkResponse {}
export const DeleteCodemarkRequestType = new RequestType<
	DeleteCodemarkRequest,
	DeleteCodemarkResponse,
	void,
	void
>("codestream/codemark/delete");

export interface GetCodemarkRequest {
	codemarkId: string;
}

export interface GetCodemarkResponse {
	codemark: CSCodemark;
}

export const GetCodemarkRequestType = new RequestType<
	GetCodemarkRequest,
	GetCodemarkResponse,
	void,
	void
>("codestream/codemark");

export interface SetCodemarkPinnedRequest {
	codemarkId: string;
	value: boolean;
}
export interface SetCodemarkPinnedResponse {}
export const SetCodemarkPinnedRequestType = new RequestType<
	SetCodemarkPinnedRequest,
	SetCodemarkPinnedResponse,
	void,
	void
>("codestream/codemark/setPinned");

export interface SetCodemarkStatusRequest {
	codemarkId: string;
	status: string;
}
export interface SetCodemarkStatusResponse {
	codemark: CodemarkPlus;
}
export const SetCodemarkStatusRequestType = new RequestType<
	SetCodemarkStatusRequest,
	SetCodemarkStatusResponse,
	void,
	void
>("codestream/codemark/setStatus");

export interface UpdateCodemarkRequest {
	codemarkId: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	color?: string;
	status?: string;
	assignees?: string[];
	title?: string;
	text?: string;
	externalAssignees?: ThirdPartyProviderUser[];
	externalProvider?: string;
	externalProviderHost?: string;
	externalProviderUrl?: string;
}
export interface UpdateCodemarkResponse {
	codemark: CodemarkPlus;
}
export const UpdateCodemarkRequestType = new RequestType<
	UpdateCodemarkRequest,
	UpdateCodemarkResponse,
	void,
	void
>("codestream/codemark/update");

export interface GetCodemarkSha1Request {
	codemarkId: string;
	markerId?: string;
}
export interface GetCodemarkSha1Response {
	codemarkSha1: string | undefined;
	documentSha1: string | undefined;
}
export const GetCodemarkSha1RequestType = new RequestType<
	GetCodemarkSha1Request,
	GetCodemarkSha1Response,
	void,
	void
>("codestream/codemark/sha1");

export interface PinReplyToCodemarkRequest {
	codemarkId: string;
	postId: string;
	value: boolean;
}
export interface PinReplyToCodemarkResponse {
	codemark: CodemarkPlus;
}
export const PinReplyToCodemarkRequestType = new RequestType<
	PinReplyToCodemarkRequest,
	PinReplyToCodemarkResponse,
	void,
	void
>("codestream/codemark/pinReply");
