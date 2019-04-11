package protocols.webview

import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range

class LoginRequest(
    val email: String?,
    val password: String?
)

class SignedOutBootstrapResponse(
    val capabilities: Capabilities,
    val configs: Map<String, Any?>,
    val env: CodeStreamEnvironment,
    val version: String
)

class SignedInBootstrapResponse(
    val capabilities: Capabilities,
    val configs: Configs,
    val env: CodeStreamEnvironment,
    val version: String,
    val context: JsonObject,
    val editorContext: EditorContext,
    val session: UserSession
)

class Capabilities(
    val channelMute: Boolean?,
    val codemarkApply: Boolean?,
    val codemarkCompare: Boolean?,
    val editorTrackVisibleRange: Boolean?,
    val services: Services?
)

class Configs(
    val serverUrl: String,
    val email: String?,
    val showHeadshots: Boolean,
    val viewCodemarksInline: Boolean,
    val muteAll: Boolean,
    val debug: Boolean,
    val showFeedbackSmiley: Boolean
)

class Services(
    val vsls: Boolean?
)

class UserSession(
    val userId: String
)

enum class CodeStreamEnvironment {
    @SerializedName("local")
    LOCAL,
    @SerializedName("prod")
    PROD,
    @SerializedName("unknown")
    UNKNOWN
}

class ContextDidChangeNotification(
    val context: WebViewContext
)

class UpdateConfigurationRequest(
    val name: String,
    val value: String?
)

class EditorRangeHighlightRequest(
    val uri: String,
    val range: Range,
    val highlight: Boolean
)

class EditorRangeRevealRequest(
    val uri: String,
    val range: Range,
    val preserveFocus: Boolean?
)

class EditorRangeRevealResponse(
    val success: Boolean
)

class EditorRangeSelectRequest(
    val uri: String,
    val selection: EditorSelection,
    val preserveFocus: Boolean?
)

class EditorRangeSelectResponse(
    val success: Boolean
)

class EditorScrollToRequest(
    val uri: String,
    val position: Position,
    val atTop: Boolean
)