package com.codestream.agent

import com.codestream.editorService
import com.codestream.extensions.workspaceFolders
import com.codestream.gson
import com.codestream.sessionService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonElement
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.services.LanguageClient
import java.util.concurrent.CompletableFuture

class CodeStreamLanguageClient(private val project: Project) : LanguageClient {

    private val logger = Logger.getInstance(CodeStreamLanguageClient::class.java)

    @JsonNotification("codestream/didChangeDocumentMarkers")
    fun didChangeDocumentMarkers(notification: DidChangeDocumentMarkersNotification) {
        notification.textDocument.uri?.let {
            project.editorService?.updateMarkers(it)
        }
        project.webViewService?.postNotification("codestream/didChangeDocumentMarkers", notification)
    }

    @JsonNotification("codestream/didChangeData")
    fun didChangeData(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didChangeData", json)
        val notification = gson.fromJson<DidChangeDataNotification>(json)
        when (notification.type) {
            "unreads" -> project.sessionService?.didChangeUnreads(gson.fromJson(notification.data))
        }
    }

    @JsonNotification("codestream/didChangeConnectionStatus")
    fun didChangeConnectionStatus(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didChangeConnectionStatus", json)
    }

    @JsonNotification("codestream/didLogout")
    fun didLogout(json: JsonElement) {
        project.webViewService?.postNotification("codestream/didLogout", json)
    }

    override fun workspaceFolders(): CompletableFuture<MutableList<WorkspaceFolder>> {
        return CompletableFuture.completedFuture(project.workspaceFolders.toMutableList())
    }

    override fun configuration(configurationParams: ConfigurationParams): CompletableFuture<List<Any>> {
        return CompletableFuture.completedFuture(emptyList())
    }

    override fun registerCapability(params: RegistrationParams): CompletableFuture<Void> {
        params.registrations.forEach {
            logger.info("Language server wants to register ${it.method}")
        }
        return CompletableFuture.completedFuture(null)
    }

    override fun unregisterCapability(params: UnregistrationParams?): CompletableFuture<Void> {
        params?.unregisterations?.forEach {
            logger.info("Language server wants to unregister ${it.method}")
        }
        return CompletableFuture.completedFuture(null)
    }

    override fun showMessageRequest(requestParams: ShowMessageRequestParams?): CompletableFuture<MessageActionItem> {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun telemetryEvent(`object`: Any?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun logMessage(message: MessageParams?) {
        when (message?.type) {
            MessageType.Log -> logger.debug(message.message)
            MessageType.Info -> logger.info(message.message)
            MessageType.Warning -> logger.warn(message.message)
            MessageType.Error -> logger.warn(message.message)
        }
    }

    override fun showMessage(messageParams: MessageParams?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun publishDiagnostics(diagnostics: PublishDiagnosticsParams?) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

}

class DidChangeDocumentMarkersNotification(
    val textDocument: TextDocumentIdentifier
)

class DidChangeDataNotification(
    val type: String,
    val data: JsonElement
)

class DidChangeUnreadsNotification(
    val totalMentions: Int,
    val totalUnreads: Int
)
