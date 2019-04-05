package com.codestream

import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.set
import com.google.gson.JsonObject
import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.util.net.HttpConfigurable
import protocols.agent.Extension
import protocols.agent.Ide
import protocols.agent.ProxySettings
import protocols.agent.TraceLevel
import protocols.webview.CodeStreamEnvironment
import protocols.webview.Configs

const val INLINE_CODEMARKS = "viewCodemarksInline"

// PD urls
private const val API_PD = "https://pd-api.codestream.us:9443"
private const val WEB_PD = "http://pd-app.codestream.us:1380"

// QA urls
private const val API_QA = "https://qa-api.codestream.us"
private const val WEB_QA = "http://qa-app.codestream.us"

// PROD urls
private const val API_PROD = "https://api.codestream.com"
private const val WEB_PROD = "https://app.codestream.com"

data class SettingsServiceState(
    var autoSignIn: Boolean = true,
    var email: String? = null,
    var serverUrl: String = API_PROD,
    var webAppUrl: String = WEB_PROD,
    var avatars: Boolean = true,
    var muteAll: Boolean = false,
    var team: String? = null,
    var showFeedbackSmiley: Boolean = true,
    var showMarkers: Boolean = true,
    var autoHideMarkers: Boolean = true,
    var proxySupport: String = "on",
    var proxyUrl: String = "",
    var proxyStrictSSL: Boolean = true,
    var webViewConfig: MutableMap<String, String?> = mutableMapOf(
        INLINE_CODEMARKS to "true"
    ),
    var webViewContext: String = "{}"
)

@State(name = "CodeStream", storages = [Storage("codestream.xml")])
class SettingsService(val project: Project) : PersistentStateComponent<SettingsServiceState>, ServiceConsumer(project) {
    private var _state = SettingsServiceState()

    override fun getState(): SettingsServiceState = _state

    override fun loadState(state: SettingsServiceState) {
        _state = state
    }

    private val viewCodemarksInline: Boolean
        get() {
            return state.webViewConfig[INLINE_CODEMARKS]?.toBoolean() ?: true
        }

    val environment: CodeStreamEnvironment
        get() = CodeStreamEnvironment.PROD
    val environmentVersion: String
        get() = PluginManager.getPlugin(PluginId.findId("com.codestream.jetbrains-codestream"))!!.version
    val extensionInfo: Extension
        get() {
            return Extension(
                environmentVersion
            )
        }
    val ideInfo: Ide
        get() = Ide()
    val traceLevel: TraceLevel
        get() = TraceLevel.DEBUG
    val isDebugging: Boolean
        get() = DEBUG
    var currentStreamId: String? = null
    var threadId: String? = null

    val team
        get() = state.team

    val autoHideMarkers
        get() = state.autoHideMarkers

    val showMarkers get() = state.showMarkers

    val proxyUrl: String?
        get() = if (state.proxyUrl.isNotEmpty()) state.proxyUrl else null

    val proxySupport get() = state.proxySupport

    var webViewContext: JsonObject
        get() {
            var jsonObject = gson.fromJson<JsonObject>(state.webViewContext)
            sessionService.userLoggedIn?.team?.id.let {
                jsonObject["currentTeamId"] = it
            }
            jsonObject["hasFocus"] = true
            return jsonObject
        }
        set(jsonObject: JsonObject) {
            state.webViewContext = jsonObject.toString()
        }

    fun getWebviewConfigs(): Configs = Configs(
        state.serverUrl,
        state.email,
        state.avatars,
        viewCodemarksInline,
        state.muteAll,
        isDebugging,
        state.showFeedbackSmiley
    )

    fun getEnvironmentDisplayPrefix(): String {
        return when (state.serverUrl) {
            API_PD -> "PD:"
            API_QA -> "QA:"
            else -> if (state.serverUrl.contains("localhost")) {
                "Local:"
            } else {
                "CodeStream:"
            }
        }
    }

    // 💩: I HATE THIS
    fun set(name: String, value: String?) {
        if (state.webViewConfig.containsKey(name)) {
            state.webViewConfig[name] = value
        } else {
            when (name) {
                "muteAll" -> value?.let {
                    state.muteAll = it.toBoolean()
                }
            }
        }
    }

    val proxySettings
        get(): ProxySettings? {
            return when (state.proxySupport) {
                "on" -> {
                    val host = HttpConfigurable.getInstance().PROXY_HOST ?: return null
                    val port = HttpConfigurable.getInstance().PROXY_PORT
                    ProxySettings("$host:$port", state.proxyStrictSSL)
                }
                "override" -> ProxySettings(state.proxyUrl, state.proxyStrictSSL)
                else -> null
            }
        }

}
