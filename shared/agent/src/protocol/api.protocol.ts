"use strict";
import {
	ChannelServiceType,
	CodemarkType,
	CSApiCapabilities,
	CSChannelStream,
	CSCodemark,
	CSCompany,
	CSDirectStream,
	CSFileStream,
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations,
	CSMe,
	CSPost,
	CSRepository,
	CSStream,
	CSTag,
	CSTeam,
	CSUser,
	ProviderType,
	StreamType
} from "./api.protocol.models";

export * from "./api.protocol.models";

export enum ApiErrors {
	InvalidCredentials = "INVALID_CREDENTIALS",
	InvalidToken = "TOKEN_INVALID",
	NotConfirmed = "NOT_CONFIRMED",
	NotOnTeam = "USER_NOT_ON_TEAM",
	NotFound = "NOT_FOUND",
	Unknown = "UNKNOWN",
	VersionUnsupported = "VERSION_UNSUPPORTED"
}

export enum LoginResult {
	Success = "SUCCESS",
	InvalidCredentials = "INVALID_CREDENTIALS",
	InvalidToken = "TOKEN_INVALID",
	ExpiredToken = "TOKEN_EXPIRED",
	NotConfirmed = "NOT_CONFIRMED",
	NotOnTeam = "USER_NOT_ON_TEAM",
	Unknown = "UNKNOWN",
	VersionUnsupported = "VERSION_UNSUPPORTED",
	ProviderConnectFailed = "PROVIDER_CONNECT_FAILED",
	MultipleWorkspaces = "MULTIPLE_WORKSPACES",
	AlreadyConfirmed = "ALREADY_CONFIRMED",
	InviteConflict = "INVITE_CONFLICT",
	AlreadySignedIn = "ALREADY_SIGNED_IN",
	SignupRequired = "SIGNUP_REQUIRED",
	SignInRequired = "SIGNIN_REQUIRED"
}

export interface CSCompleteSignupRequest {
	token: string;
}

export interface CSLoginRequest {
	email: string;
	password?: string;
	token?: string;
}

export interface CSLoginResponse {
	user: CSMe;
	accessToken: string;
	pubnubKey: string;
	pubnubToken: string;
	broadcasterToken?: string;
	socketCluster?: {
		host: string;
		port: string;
	};
	teams: CSTeam[];
	companies: CSCompany[];
	repos: CSRepository[];
	provider?: "codestream" | "slack" | "msteams" | string;
	providerAccess?: "strict";
	teamId?: string;
	capabilities?: CSApiCapabilities;
}

export interface CSRegisterRequest {
	email: string;
	username: string;
	password: string;
	fullName?: string;
	companyName?: string;
	wantLink?: boolean;
	inviteCode?: string;
}

export interface CSRegisterResponse {
	user?: CSUser; // No user means they are already registered. for security, that message is emailed to them rather than displayed in the client
}

export interface CSConfirmRegistrationRequest {
	email: string;
	confirmationCode: string;
}

export interface CSGetInviteInfoRequest {
	code: string;
}

export interface CSGetInviteInfoResponse {
	email: string;
	teamId: string;
	teamName: string;
}

export interface CSCreateMarkerLocationRequest {
	teamId: string;
	streamId: string;
	commitHash: string;
	locations: {
		[id: string]: CSLocationArray;
	};
}

export interface CSCreateMarkerLocationResponse {}

export interface CSCreatePostRequestCodeBlock {
	code: string;
	preContext?: string;
	postContext?: string;

	location?: CSLocationArray;
	commitHash?: string;

	streamId?: string;
	file?: string;

	repoId?: string;
	remotes?: string[];
}

export interface CSCreatePostRequestStream {
	teamId: string;
	type: StreamType.File;
	repoId?: string;
	file: string;
}

export interface CSCreatePostRequest {
	teamId: string;
	streamId?: string;
	stream?: CSCreatePostRequestStream;
	parentPostId?: string;
	text: string;
	codeBlocks?: CSCreatePostRequestCodeBlock[];
	commitHashWhenPosted?: string;
	mentionedUserIds?: string[];
	title?: string;
	type?: string;
	assignees?: [];
	color?: string;
}

export interface CSCreatePostResponse {
	post: CSPost;
	codemarks?: CSCodemark[];
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
}

export interface CSCreateRepoRequest {
	teamId: string;
	url: string;
	knownCommitHashes: string[];
}

export interface CSCreateRepoResponse {
	repo: CSRepository;
}

export interface CSCreateChannelStreamRequest {
	teamId: string;
	type: StreamType.Channel;
	name: string;
	memberIds?: string[];
	isTeamStream: boolean;
	privacy: "public" | "private";
	purpose?: string;
	serviceType?: ChannelServiceType.Vsls;
	serviceKey?: string;
	serviceInfo?: { [key: string]: any };
}

export interface CSCreateChannelStreamResponse {
	stream: CSChannelStream;
}

export interface CSCreateDirectStreamRequest {
	teamId: string;
	type: StreamType.Direct;
	memberIds: string[];
}

export interface CSCreateDirectStreamResponse {
	stream: CSDirectStream;
}

export interface CSCreateFileStreamRequest {
	teamId: string;
	repoId: string;
	type: StreamType.File;
	file: string;
}

export interface CSCreateFileStreamResponse {
	stream: CSFileStream;
}

export type CSCreateStreamRequest =
	| CSCreateChannelStreamRequest
	| CSCreateDirectStreamRequest
	| CSCreateFileStreamRequest;

export type CSCreateStreamResponse =
	| CSCreateChannelStreamResponse
	| CSCreateDirectStreamResponse
	| CSCreateFileStreamResponse;

export interface CSDeletePostResponse {
	posts: any[];
	codemarks: any[];
	markers: any[];
}

export interface CSDeleteTeamContentRequest {
	teamId: string;
	includeStreams?: boolean;
	newerThan?: number;
}

export interface CSDeleteTeamContentResponse {}

export interface CSEditPostRequest {
	text: string;
	mentionedUserIds?: string[];
}

export interface CSEditPostResponse {
	post: { [key: string]: any };
}

export interface CSReactions {
	[emoji: string]: boolean;
}

export interface CSReactToPostRequest {
	emojis: CSReactions;
}

export interface CSReactToPostResponse {
	post: { [key: string]: any };
}

export interface CSSetPostStatusRequest {
	status: string;
}

export interface CSSetPostStatusResponse {
	post: { [key: string]: any };
}

export interface CSMarkPostUnreadRequest {}

export interface CSMarkPostUnreadResponse {}

export interface CSSetCodemarkPinnedRequest {}

export interface CSSetCodemarkPinnedResponse {}

export interface CSPinReplyToCodemarkRequest {
	codemarkId: string;
	postId: string;
	value: boolean;
}

export interface CSPinReplyToCodemarkResponse {
	codemark: CSCodemark;
}

export interface CSFindRepoResponse {
	repo?: CSRepository;
	usernames?: string[];
}

export interface CSGetMarkerLocationsResponse {
	markerLocations: CSMarkerLocations;
}

export interface CSGetMarkerResponse {
	marker: CSMarker;
}

export interface CSGetMarkersRequest {
	streamId: string;
	teamId: string;
	commitHash?: string;
	markerIds?: string[];
}

export interface CSGetMarkersResponse {
	markers: CSMarker[];
	markerLocations: CSMarkerLocation[];
	codemarks: CSCodemark[];
}

export interface CSGetPostResponse {
	post: CSPost;
}

export interface CSGetPostsResponse {
	posts: CSPost[];
	codemarks?: CSCodemark[];
	markers?: CSMarker[];
	more?: boolean;
}

export interface CSGetRepoResponse {
	repo: CSRepository;
}

export interface CSGetReposResponse {
	repos: CSRepository[];
}

export interface CSGetStreamResponse<T extends CSStream> {
	stream: T;
}

export interface CSGetStreamsResponse<T extends CSStream> {
	streams: T[];
}

export interface CSCreateTeamRequest {
	name: string;
}

export interface CSCreateTeamResponse {
	team: CSUser;
}

export interface CSGetTeamResponse {
	team: CSTeam;
}

export interface CSGetTeamsResponse {
	teams: CSTeam[];
}

export interface CSGetUserResponse {
	user: CSUser;
}

export interface CSGetUsersResponse {
	users: CSUser[];
}

export interface CSInviteUserRequest {
	email: string;
	teamId: string;
	fullName?: string;
}

export interface CSInviteUserResponse {
	user: CSUser;
}

export interface CSJoinStreamRequest {}

export interface CSJoinStreamResponse {
	stream: { [key: string]: any };
}

export interface CSGetMeResponse {
	user: CSMe;
}

export enum CSPresenceStatus {
	Online = "online",
	Away = "away"
}

export interface CSCreateCodemarkRequest {
	teamId: string;
	providerType?: ProviderType | undefined;
	type: CodemarkType;
	streamId?: string;
	postId?: string;
	color?: string;
	status?: string;
	title?: string;
	assignees?: string[];
	markers?: CSCreateMarkerRequest[];
	remotes?: string[];
	externalProvider?: string;
	externalProviderUrl?: string;
	externalAssignees?: { displayName: string; email?: string }[];
	remoteCodeUrl?: { name: string; url: string };
	threadUrl?: string;
	createPermalink?: false | "public" | "private";
}
export interface CSCreateMarkerRequest {
	code: string;
	remotes?: string[];
	file?: string;
	commitHash?: string;
	location?: CSLocationArray;
}

export interface CSCreateMarkerResponse {
	marker: CSMarker;
}

export interface CSCreateCodemarkResponse {
	codemark: CSCodemark;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	permalink?: string;
}

export interface CSGetCodemarkResponse {
	codemark: CSCodemark;
	post?: CSPost;
	markers?: CSMarker[];
}

export interface CSGetCodemarksResponse {
	codemarks: CSCodemark[];
	posts?: CSPost[];
	markers?: CSMarker[];
}

export interface CSUpdateCodemarkRequest {
	streamId?: string;
	postId?: string;
}
export interface CSUpdateCodemarkResponse {
	codemark: CSCodemark;
}

export interface CSDeleteCodemarkRequest {
	codemarkId: string;
}
export interface CSDeleteCodemarkResponse {}

export interface CSUpdateMarkerRequest {
	commitHashWhenCreated?: string;
}

export interface CSAddReferenceLocationRequest {
	commitHash: string;
	location: CSLocationArray;
	flags: { [id: string]: boolean };
}

export interface CSAddReferenceLocationResponse {
	// marker: < some directive >,
	// markerLocations: < markerLocations update >
}

export interface CSUpdateMarkerResponse {
	marker: CSMarker;
}

export interface CSUpdatePresenceRequest {
	sessionId: string;
	status: CSPresenceStatus;
}

export interface CSUpdatePresenceResponse {
	awayTimeout: number;
}

export interface CSUpdateStreamRequest {
	name?: string;
	purpose?: string;
	isArchived?: boolean;
	$push?: {
		memberIds: string[];
	};
	$pull?: {
		memberIds: string[];
	};
}

export interface CSUpdateStreamResponse {
	stream: { [key: string]: any };
}

export interface CSCreateCodemarkPermalinkRequest {
	isPublic: boolean;
}
export interface CSCreateCodemarkPermalinkResponse {
	permalink: string;
}

export interface CSTrackProviderPostRequest {
	provider: string;
	teamId: string;
	streamId: string;
	postId: string;
	parentPostId?: string;
}

export interface CSGetTelemetryKeyResponse {
	key: string;
}

export interface CSGetApiCapabilitiesResponse {
	capabilities: CSApiCapabilities;
}

export interface CSAddProviderHostRequest {
	host: string;
	appClientId?: string;
	appClientSecret?: string;
	[key: string]: any;
}

export interface CSAddProviderHostResponse {
	team: any;
	providerId: string;
}

export interface CSTeamTagRequest {
	team: CSTeam;
	tag: CSTag;
}

export interface CSTeamTagResponse {
	// name: string;
}
