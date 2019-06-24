import {
	ConnectThirdPartyProviderRequestType,
	ConfigureThirdPartyProviderRequestType,
	DisconnectThirdPartyProviderRequestType,
	TelemetryRequestType,
	RegisterUserRequest
} from "@codestream/protocols/agent";
import { logError } from "../../logger";
import { setUserPreference } from "../../Stream/actions";
import { HostApi } from "../../webview-api";
import { action } from "../common";
import { ContextActionsType, ContextState, PostEntryPoint, Route } from "./types";

export const reset = () => action("RESET");

export const setContext = (payload: Partial<ContextState>) =>
	action(ContextActionsType.SetContext, payload);

export const _openPanel = (panel: string) => action(ContextActionsType.OpenPanel, panel);
export const openPanel = (panel: string) => (dispatch, getState) => {
	if (getState().context.panelStack[0] !== panel) {
		return dispatch(_openPanel(panel));
	}
};

export const closePanel = () => action(ContextActionsType.ClosePanel);

export const focus = () => action(ContextActionsType.SetFocusState, true);

export const blur = () => action(ContextActionsType.SetFocusState, false);

export const _setChannelFilter = (value: string) =>
	action(ContextActionsType.SetChannelFilter, value);

export const setChannelFilter = (value: string) => async dispatch => {
	if (value !== "selecting") {
		// if a filter is selected, only update user preferences
		// the context reducer will update the `channelFilter` on the preferences change
		return await dispatch(setUserPreference(["showChannels"], value));
	}
	return dispatch(_setChannelFilter(value));
};

export const setChannelsMuteAll = (enabled: boolean) =>
	action(ContextActionsType.SetChannelsMuteAll, enabled);

export const setCodemarkColorFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkColorFilter, value);

export const setCodemarkFileFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkFileFilter, value);

export const setCodemarkTypeFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkTypeFilter, value);

export const setCodemarksFileViewStyle = (style: "list" | "inline") =>
	action(ContextActionsType.SetCodemarksFileViewStyle, style);

export const setCodemarksShowArchived = (enabled: boolean) =>
	action(ContextActionsType.SetCodemarksShowArchived, enabled);

export const setCodemarksShowResolved = (enabled: boolean) =>
	action(ContextActionsType.SetCodemarksShowResolved, enabled);

export const setCurrentDocumentMarker = (documentMarkerId?: string) =>
	action(ContextActionsType.SetCurrentDocumentMarker, documentMarkerId);

export const _setCurrentStream = (streamId?: string, threadId?: string) =>
	action(ContextActionsType.SetCurrentStream, { streamId, threadId });

export const setCurrentStream = (streamId?: string, threadId?: string) => (dispatch, getState) => {
	if (streamId === undefined && threadId !== undefined) {
		const error = new Error("setCurrentStream was called with a threadId but no streamId");
		logError(error);
		throw error;
	}
	const { context } = getState();
	const streamChanged = context.currentStreamId !== streamId;
	const threadChanged = context.threadId !== threadId;
	if (streamChanged || threadChanged) {
		return dispatch(_setCurrentStream(streamId, threadId));
	}
};

export const setShowFeedbackSmiley = (enabled: boolean) =>
	action(ContextActionsType.SetShowFeedbackSmiley, enabled);

export const connectProvider = (providerId: string, fromMenu = false) => async (
	dispatch,
	getState
) => {
	const { context, users, session, providers } = getState();
	const provider = providers[providerId];
	if (!provider) return;
	const user = users[session.userId];
	const { name, host, isEnterprise } = provider;
	let providerInfo = ((user.providerInfo || {})[context.currentTeamId] || {})[name];
	if (providerInfo && providerInfo.accessToken) {
		if (isEnterprise) {
			providerInfo = (providerInfo.hosts || {})[host];
		}
		if (provider.hasIssues) {
			dispatch(setIssueProvider(providerId));
		}
		return;
	}
	try {
		const api = HostApi.instance;
		await api.send(ConnectThirdPartyProviderRequestType, { providerId });
		dispatch(sendIssueServiceConnected(providerId, fromMenu));
		if (provider.hasIssues) {
			return dispatch(setIssueProvider(providerId));
		}
	} catch (error) {
		logError(`Failed to connect ${provider.name}: ${error}`);
	}
};

export const sendIssueServiceConnected = (providerId: string, fromMenu = false) => async (
	dispatch,
	getState
) => {
	const { providers } = getState();
	const provider = providers[providerId];
	if (!provider) return;
	const { name, host, isEnterprise } = provider;
	const api = HostApi.instance;
	api.send(TelemetryRequestType, {
		eventName: "Issue Service Connected",
		properties: {
			Service: name,
			Host: isEnterprise ? host : null,
			Connection: "On",
			"Connection Location": fromMenu ? "Global Nav" : "Compose Modal"
		}
	});
};

export const configureProvider = (
	providerId: string,
	data: { [key: string]: any },
	fromMenu = false,
	setConnectedWhenConfigured = false
) => async (dispatch, getState) => {
	const { providers } = getState();
	const provider = providers[providerId];
	if (!provider) return;
	try {
		const api = HostApi.instance;
		await api.send(ConfigureThirdPartyProviderRequestType, { providerId, data });
		api.send(TelemetryRequestType, {
			eventName: "Issue Service Configured",
			properties: {
				Service: provider.name
			}
		});

		// for some providers (namely YouTrack), configuring is as good as connecting,
		// since we allow the user to set their own access token
		if (setConnectedWhenConfigured && provider.hasIssues) {
			dispatch(sendIssueServiceConnected(providerId, fromMenu));
			dispatch(setIssueProvider(providerId));
		}
	} catch (error) {
		logError(`Failed to connect ${provider.name}: ${error}`);
	}
};

export const disconnectProvider = (providerId: string, fromMenu = false) => async (
	dispatch,
	getState
) => {
	try {
		const { providers } = getState();
		const provider = providers[providerId];
		if (!provider) return;
		const api = HostApi.instance;
		await api.send(DisconnectThirdPartyProviderRequestType, { providerId });
		api.send(TelemetryRequestType, {
			eventName: "Issue Service Connected",
			properties: {
				Service: provider.name,
				Host: provider.isEnterprise ? provider.host : null,
				Connection: "Off",
				"Connection Location": fromMenu ? "Global Nav" : "Compose Modal"
			}
		});
		if (getState().context.issueProvider.host === provider.host) {
			dispatch(setIssueProvider(undefined));
		}
	} catch (error) {
		logError(`failed to disconnect service ${providerId}: ${error}`);
	}
};

export const setIssueProvider = (providerId: string | undefined) =>
	action(ContextActionsType.SetIssueProvider, providerId);

export const setNewPostEntry = (entryPoint: PostEntryPoint) =>
	action(ContextActionsType.SetNewPostEntryPoint, entryPoint);

export const goToNewUserEntry = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.NewUser, params });

export const goToForgotPassword = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.ForgotPassword, params });

export const goToChatProviderSelection = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.ChatProviderSelection, params });

export const goToMSTeamsAdminApprovalInfo = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.MSTeamsAdminApprovalInfo, params });

export const goToSSOAuth = (provider: string, params = {}) => {
	switch (provider) {
		case "slack":
			return action(ContextActionsType.SetRoute, { name: Route.SlackAuth, params });
		case "msteams":
			return action(ContextActionsType.SetRoute, { name: Route.MSTeamsAuth, params });
		default:
			return action(ContextActionsType.SetRoute, { name: Route.ChatProviderSelection, params });
	}
};

export const goToSignup = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.Signup, params });

export const goToLogin = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.Login, params });

export const goToJoinTeam = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.JoinTeam, params });

export const goToEmailConfirmation = (params: {
	email: string;
	teamId?: string;
	registrationParams: RegisterUserRequest;
}) => action(ContextActionsType.SetRoute, { name: Route.EmailConfirmation, params });

export const goToTeamCreation = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.TeamCreation, params });
