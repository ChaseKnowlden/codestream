"use strict";
import { ConfigurationChangeEvent, ExtensionContext, OutputChannel, Uri, window } from "vscode";
import { configuration, TraceLevel } from "./configuration";
import { extensionOutputChannelName } from "./constants";
import { getCorrelationContext } from "./system";
// import { Telemetry } from './telemetry';

export { TraceLevel } from "./configuration";

const ConsolePrefix = `[${extensionOutputChannelName}]`;

const isDebuggingRegex = /\bcodestream\b/i;

export interface LogCorrelationContext {
	correlationId?: number;
	prefix: string;
}

export class Logger {
	static level: TraceLevel = TraceLevel.Silent;
	static output: OutputChannel | undefined;
	static customLoggableFn: ((o: object) => string | undefined) | undefined;

	static configure(context: ExtensionContext, loggableFn?: (o: any) => string | undefined) {
		this.customLoggableFn = loggableFn;

		context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
		this.onConfigurationChanged(configuration.initializingChangeEvent);
	}

	private static onConfigurationChanged(e: ConfigurationChangeEvent) {
		const section = configuration.name("traceLevel").value;
		if (configuration.changed(e, section)) {
			this.level = configuration.get<TraceLevel>(section);

			if (this.level === TraceLevel.Silent) {
				if (this.output !== undefined) {
					this.output.dispose();
					this.output = undefined;
				}
			} else {
				this.output = this.output || window.createOutputChannel(extensionOutputChannelName);
			}
		}
	}

	static debug(message: string, ...params: any[]): void;
	static debug(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static debug(
		callerOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (this.level !== TraceLevel.Debug && !Logger.isDebugging) return;

		let message;
		if (typeof callerOrMessage === "string") {
			message = callerOrMessage;
		} else {
			message = params.shift();

			if (callerOrMessage !== undefined) {
				message = `${callerOrMessage.prefix} ${message || ""}`;
			}
		}

		if (Logger.isDebugging) {
			console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		}

		if (this.output !== undefined && this.level === TraceLevel.Debug) {
			this.output.appendLine(
				`${this.timestamp} ${message || ""} ${this.toLoggableParams(true, params)}`
			);
		}
	}

	static error(ex: Error, message?: string, ...params: any[]): void;
	static error(
		ex: Error,
		context?: LogCorrelationContext,
		message?: string,
		...params: any[]
	): void;
	static error(
		ex: Error,
		callerOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (this.level === TraceLevel.Silent && !Logger.isDebugging) return;

		let message;
		if (callerOrMessage === undefined || typeof callerOrMessage === "string") {
			message = callerOrMessage;
		} else {
			message = params.shift();

			if (callerOrMessage !== undefined) {
				message = `${callerOrMessage.prefix} ${message || ""}`;
			}
		}

		if (message === undefined) {
			const stack = ex.stack;
			if (stack) {
				const match = /.*\s*?at\s(.+?)\s/.exec(stack);
				if (match != null) {
					message = match[1];
				}
			}
		}

		if (Logger.isDebugging) {
			console.error(this.timestamp, ConsolePrefix, message || "", ...params, ex);
		}

		if (this.output !== undefined && this.level !== TraceLevel.Silent) {
			this.output.appendLine(
				`${this.timestamp} ${message || ""} ${this.toLoggableParams(false, params)}\n${ex}`
			);
		}

		// Telemetry.trackException(ex);
	}

	static getCorrelationContext() {
		return getCorrelationContext();
	}

	static log(message: string, ...params: any[]): void;
	static log(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static log(callerOrMessage: LogCorrelationContext | string | undefined, ...params: any[]): void {
		if (
			this.level !== TraceLevel.Verbose &&
			this.level !== TraceLevel.Debug &&
			!Logger.isDebugging
		) {
			return;
		}

		let message;
		if (typeof callerOrMessage === "string") {
			message = callerOrMessage;
		} else {
			message = params.shift();

			if (callerOrMessage !== undefined) {
				message = `${callerOrMessage.prefix} ${message || ""}`;
			}
		}

		if (Logger.isDebugging) {
			console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		}

		if (
			this.output !== undefined &&
			(this.level === TraceLevel.Verbose || this.level === TraceLevel.Debug)
		) {
			this.output.appendLine(
				`${this.timestamp} ${message || ""} ${this.toLoggableParams(false, params)}`
			);
		}
	}

	static logWithDebugParams(message: string, ...params: any[]): void;
	static logWithDebugParams(
		context: LogCorrelationContext | undefined,
		message: string,
		...params: any[]
	): void;
	static logWithDebugParams(
		callerOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (
			this.level !== TraceLevel.Verbose &&
			this.level !== TraceLevel.Debug &&
			!Logger.isDebugging
		) {
			return;
		}

		let message;
		if (typeof callerOrMessage === "string") {
			message = callerOrMessage;
		} else {
			message = params.shift();

			if (callerOrMessage !== undefined) {
				message = `${callerOrMessage.prefix} ${message || ""}`;
			}
		}

		if (Logger.isDebugging) {
			console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		}

		if (
			this.output !== undefined &&
			(this.level === TraceLevel.Verbose || this.level === TraceLevel.Debug)
		) {
			this.output.appendLine(
				`${this.timestamp} ${message || ""} ${this.toLoggableParams(true, params)}`
			);
		}
	}

	static warn(message: string, ...params: any[]): void;
	static warn(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static warn(callerOrMessage: LogCorrelationContext | string | undefined, ...params: any[]): void {
		if (this.level === TraceLevel.Silent && !Logger.isDebugging) return;

		let message;
		if (typeof callerOrMessage === "string") {
			message = callerOrMessage;
		} else {
			message = params.shift();

			if (callerOrMessage !== undefined) {
				message = `${callerOrMessage.prefix} ${message || ""}`;
			}
		}

		if (Logger.isDebugging) {
			console.warn(this.timestamp, ConsolePrefix, message || "", ...params);
		}

		if (this.output !== undefined && this.level !== TraceLevel.Silent) {
			this.output.appendLine(
				`${this.timestamp} ${message || ""} ${this.toLoggableParams(false, params)}`
			);
		}
	}

	static showOutputChannel() {
		if (this.output === undefined) return;

		this.output.show();
	}

	static toLoggable(p: any, sanitize?: ((key: string, value: any) => any) | undefined) {
		if (typeof p !== "object") return String(p);
		if (this.customLoggableFn !== undefined) {
			const loggable = this.customLoggableFn(p);
			if (loggable != null) return loggable;
		}
		if (p instanceof Uri) return `Uri(${p.toString(true)})`;

		try {
			return JSON.stringify(p, sanitize);
		} catch {
			return `<error>`;
		}
	}

	static toLoggableName(instance: { constructor: Function }) {
		const name =
			typeof instance === "function"
				? instance.name
				: instance.constructor != null
					? instance.constructor.name
					: "";
		// Strip webpack module name (since I never name classes with an _)
		const index = name.indexOf("_");
		return index === -1 ? name : name.substr(index + 1);
	}

	private static get timestamp(): string {
		const now = new Date();
		return `[${now
			.toISOString()
			.replace(/T/, " ")
			.replace(/\..+/, "")}:${("00" + now.getUTCMilliseconds()).slice(-3)}]`;
	}

	private static toLoggableParams(debugOnly: boolean, params: any[]) {
		if (
			params.length === 0 ||
			(debugOnly && this.level !== TraceLevel.Debug && !Logger.isDebugging)
		) {
			return "";
		}

		const loggableParams = params.map(p => this.toLoggable(p)).join(", ");
		return loggableParams || "";
	}

	private static _isDebugging: boolean | undefined;
	static get isDebugging() {
		if (this._isDebugging === undefined) {
			const env = process.env;
			this._isDebugging =
				env && env.VSCODE_DEBUGGING_EXTENSION
					? isDebuggingRegex.test(env.VSCODE_DEBUGGING_EXTENSION)
					: false;
		}

		return this._isDebugging;
	}

	static overrideIsDebugging() {
		this._isDebugging = true;
	}
}
