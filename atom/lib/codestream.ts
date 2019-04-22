import { ChangeDataType } from "@codestream/protocols/agent";
import { CodemarkType } from "@codestream/protocols/api";
import { CompositeDisposable, Disposable } from "atom";
import { Echo, Listener } from "utils";
import { Container } from "workspace/container";
import { Environment, EnvironmentConfig, PD_CONFIG, PRODUCTION_CONFIG } from "./env-utils";
import { PackageState } from "./types/package";
import { StatusBar } from "./types/package-services/status-bar";
import { ViewController } from "./views/controller";
import { MarkerDecorationProvider } from "./workspace/marker-decoration-provider";
import { SessionStatus, WorkspaceSession } from "./workspace/workspace-session";

class CodestreamPackage {
	subscriptions = new CompositeDisposable();
	workspaceSession: WorkspaceSession;
	viewController: ViewController;
	sessionStatusCommand?: Disposable;
	markerDecorationProvider: MarkerDecorationProvider;
	loggedInCommandsSubscription?: CompositeDisposable;
	private environmentChangeEmitter: Echo<EnvironmentConfig>;

	constructor(state: PackageState) {
		if (atom.inDevMode()) {
			console.debug("CodeStream package initialized with state:", state);
		}
		this.workspaceSession = WorkspaceSession.create(state);
		this.viewController = new ViewController(this.workspaceSession, state.views);
		this.markerDecorationProvider = new MarkerDecorationProvider(
			this.workspaceSession,
			this.viewController
		);
		this.environmentChangeEmitter = new Echo();
		Container.initialize(this.markerDecorationProvider);
		this.initialize();
	}

	// Package lifecyle 1
	async initialize() {
		this.subscriptions.add(
			this.workspaceSession.observeSessionStatus(status => {
				this.sessionStatusCommand && this.sessionStatusCommand.dispose();
				if (status === SessionStatus.SignedIn) {
					this.registerLoggedInCommands();
					this.sessionStatusCommand = atom.commands.add(
						"atom-workspace",
						"codestream:sign-out",
						() => {
							this.workspaceSession.signOut();
						}
					);
				}
				if (status === SessionStatus.SignedOut) {
					this.loggedInCommandsSubscription && this.loggedInCommandsSubscription.dispose();
					this.sessionStatusCommand = atom.commands.add(
						"atom-workspace",
						"codestream:sign-in",
						() => {}
					);
				}
			})
		);

		const hiddenInCommandPalette = !atom.inDevMode();
		this.subscriptions.add(
			// 		Dev mode goodies
			atom.commands.add("atom-workspace", "codestream:point-to-dev", {
				didDispatch: () => {
					this.workspaceSession.changeEnvironment(PD_CONFIG);
					this.environmentChangeEmitter.push(PD_CONFIG);
				},
				hiddenInCommandPalette,
			}),
			atom.commands.add("atom-workspace", "codestream:point-to-production", {
				didDispatch: () => {
					this.workspaceSession.changeEnvironment(PRODUCTION_CONFIG);
					this.environmentChangeEmitter.push(PRODUCTION_CONFIG);
				},
				hiddenInCommandPalette,
			})
		);
	}

	// Package lifecyle
	deserializeCodestreamView() {
		return this.viewController.getMainView();
	}

	// Package lifecyle
	// activate() {}

	// Package lifecyle
	serialize(): PackageState {
		return { ...this.workspaceSession.serialize(), views: this.viewController.serialize() };
	}

	// Package lifecyle
	deactivate() {
		this.environmentChangeEmitter.dispose();
		this.workspaceSession.dispose();
		this.subscriptions.dispose();
		this.sessionStatusCommand!.dispose();
		this.viewController.dispose();
		this.markerDecorationProvider.dispose();
		this.loggedInCommandsSubscription && this.loggedInCommandsSubscription.dispose();
	}

	provideEnvironmentConfig() {
		return {
			get: () => this.workspaceSession.environment,
			onDidChange: (cb: Listener<EnvironmentConfig>) => this.environmentChangeEmitter.listen(cb),
		};
	}

	private registerLoggedInCommands() {
		this.loggedInCommandsSubscription = new CompositeDisposable(
			atom.commands.add("atom-workspace", "codestream:create-comment", () => {
				const view = this.viewController.getMainView();
				view.show().then(() => {
					view.newCodemarkRequest(CodemarkType.Comment, "context-menu");
				});
			}),
			atom.commands.add("atom-workspace", "codestream:create-issue", () => {
				const view = this.viewController.getMainView();
				view.show().then(() => {
					view.newCodemarkRequest(CodemarkType.Issue, "context-menu");
				});
			}),
			atom.commands.add("atom-workspace", "codestream:create-bookmark", () => {
				const view = this.viewController.getMainView();
				view.show().then(() => {
					view.newCodemarkRequest(CodemarkType.Bookmark, "context-menu");
				});
			})
		);
	}

	async consumeStatusBar(statusBar: StatusBar) {
		const createStatusBarTitle = (
			status: SessionStatus,
			unreads?: { totalMentions: number; totalUnreads: number }
		) => {
			const environmentLabel = (() => {
				const env = this.workspaceSession.environment.name;
				switch (env) {
					case Environment.PD:
						return `${env}:`;
					default:
						return "";
				}
			})();
			const unreadsLabel = (() => {
				if (unreads) {
					if (unreads.totalMentions > 0) return `(${unreads.totalMentions})`;
					if (unreads.totalUnreads > 0) return "\u00a0\u2022";
				}
				return "";
			})();

			switch (status) {
				case SessionStatus.SignedIn:
					return `${environmentLabel} ${
						this.workspaceSession.user!.username
					} ${unreadsLabel}`.trim();
				case SessionStatus.SigningIn:
					return `Signing in...${environmentLabel}`.replace(":", "");
				default:
					return `${environmentLabel} Sign in`.trim();
			}
		};

		const getStatusBarIconClasses = (
			status: SessionStatus,
			unreads?: { totalMentions: number }
		) => {
			if (status === SessionStatus.SigningIn) {
				return "icon loading loading-spinner-tiny inline-block".split(" ");
			}
			return "icon icon-comment-discussion".split(" ");
		};

		const tileRoot = document.createElement("div");
		tileRoot.classList.add("inline-block", "codestream-session-status");
		tileRoot.onclick = event => {
			event.stopPropagation();
			atom.commands.dispatch(document.querySelector("atom-workspace")!, "codestream:toggle");
		};
		const icon = document.createElement("span");
		icon.classList.add(...getStatusBarIconClasses(this.workspaceSession.status));
		tileRoot.appendChild(icon);
		atom.tooltips.add(tileRoot, { title: "Toggle CodeStream" });
		const text = document.createElement("span");
		tileRoot.appendChild(text);

		const statusBarTile = statusBar.addRightTile({ item: tileRoot, priority: 400 });

		const sessionStatusSubscription = this.workspaceSession!.observeSessionStatus(status => {
			text.innerText = createStatusBarTitle(status);
			icon.classList.remove(...icon.classList.values());
			icon.classList.add(...getStatusBarIconClasses(this.workspaceSession.status));
		});

		const dataChangeSubscription = this.workspaceSession.agent.onDidChangeData(event => {
			if (event.type === ChangeDataType.Unreads) {
				text.innerText = createStatusBarTitle(this.workspaceSession.status, event.data);
			}
		});

		return new Disposable(() => {
			sessionStatusSubscription.dispose();
			dataChangeSubscription.dispose();
			if (statusBarTile) {
				statusBarTile.destroy();
			}
		});
	}
}

let codestream;
const packageWrapper = {
	initialize(state: PackageState) {
		codestream = new CodestreamPackage(state);
	},
};

export default new Proxy(packageWrapper, {
	get(target: any, name: any) {
		if (codestream && Reflect.has(codestream, name)) {
			let property = codestream[name];
			if (typeof property === "function") {
				property = property.bind(codestream);
			}
			return property;
		} else {
			return target[name];
		}
	},
});

// export default {
// 	subscriptions: null,
// 	view: null,
// 	statusBar: null,
// 	store: null,
// 	config: {
// 		showHeadshots: {
// 			description: "Display headshots in the stream.",
// 			type: "boolean",
// 			default: true
// 		},
// 		reduceMotion: {
// 			description: "Reduce the animations when transitioning between streams.",
// 			type: "boolean",
// 			default: false
// 		},
// 		emailNotifications: {
// 			description:
// 				"Send email notifications for new messages when Atom is closed, or I've been idle.",
// 			type: "boolean",
// 			default: true
// 		}
// 	},
//
// 	initialize(state) {
// 		this.subscriptions = new CompositeDisposable();
// 		workspaceSession = new WorkspaceSession(state.workspaceSession);
// 		this.store = createStore(
// 			{ ...state.viewState, configs: atom.config.get("CodeStream") },
// 			workspaceSession.viewApi
// 		);
// 		bootstrapStore(this.store);
// 	},
//
// 	async activate(_state) {
// 		this.subscriptions = this.subscriptions || new CompositeDisposable();
// 		this.subscriptions.add(
// 			atom.workspace.addOpener(uri => {
// 				if (uri === CODESTREAM_VIEW_URI) {
// 					if (this.view && this.view.alive) return this.view;
// 					this.view = new CodestreamView(this.store);
// 					return this.view;
// 				}
// 			}),
// 			atom.commands.add("atom-workspace", {
// 				"codestream:toggle": () => atom.workspace.toggle(CODESTREAM_VIEW_URI),
// 				"codestream:reset": () => {
// 					// db.delete();
// 					atom.commands.dispatch(document.querySelector("atom-workspace"), "codestream:logout");
// 					this.store.dispatch({ type: "RESET" });
// 					workspaceSession.logout();
// 					// atom.reload();
// 				}
// 			})
// 			// atom.config.observe("CodeStream", configs => {
// 			// 	store.dispatch(updateConfigs(configs));
// 			// }),
// 			// atom.config.observe("CodeStream.emailNotifications", setting => {
// 			// 	this.store.dispatch(setUserPreference(["emailNotifications"], setting ? "on" : "off"));
// 			// })
// 		);
//
// 		// Dev mode goodies
// 		const hiddenInCommandPalette = !atom.inDevMode();
// 		this.subscriptions.add(
// 			atom.commands.add("atom-workspace", "codestream:wipe-cache", {
// 				didDispatch: () => db.delete(),
// 				hiddenInCommandPalette
// 			}),
// 			atom.commands.add("atom-workspace", "codestream:point-to-dev", {
// 				didDispatch: () => {
// 					sessionStorage.setItem("codestream.env", "dev");
// 					sessionStorage.setItem("codestream.url", "https://pd-api.codestream.us:9443");
// 					this.store.dispatch(logout());
// 					atom.reload();
// 				},
// 				hiddenInCommandPalette
// 			}),
// 			atom.commands.add("atom-workspace", "codestream:point-to-local", {
// 				didDispatch: () => {
// 					sessionStorage.setItem("codestream.env", "local");
// 					sessionStorage.setItem("codestream.url", "https://localhost.codestream.us:12079");
// 					this.store.dispatch(logout());
// 					atom.reload();
// 				},
// 				hiddenInCommandPalette
// 			}),
// 			atom.commands.add("atom-workspace", "codestream:point-to-qa", {
// 				didDispatch: () => {
// 					sessionStorage.setItem("codestream.env", "qa");
// 					sessionStorage.setItem("codestream.url", "https://qa-api.codestream.us");
// 					this.store.dispatch(logout());
// 					atom.reload();
// 				},
// 				hiddenInCommandPalette
// 			}),
// 			atom.commands.add("atom-workspace", "codestream:point-to-production", {
// 				didDispatch: () => {
// 					sessionStorage.removeItem("codestream.env");
// 					sessionStorage.removeItem("codestream.url");
// 					this.store.dispatch(logout());
// 					atom.reload();
// 				},
// 				hiddenInCommandPalette
// 			}),
// 			atom.commands.add("atom-workspace", "codestream:which-environment?", {
// 				didDispatch: () => {
// 					const urlConfig = sessionStorage.getItem("codestream.url") || "production";
// 					atom.notifications.addInfo(`CodeStream is pointed to ${urlConfig}`, {
// 						dismissable: true
// 					});
// 				},
// 				hiddenInCommandPalette
// 			})
// 		);
// 	},
//
// 	// async setup() {
// 	// 		this.subscriptions.add(
// 	// 			atom.workspace.observeActiveTextEditor(editor => {
// 	// 				// Only dispatch the action if there is a current file that belongs to the git repo
// 	// 				// that way if a user looks at settings or a non-repo file,
// 	// 				// the stream for the last active repo file is still visible
// 	// 				if (editor) {
// 	// 					const directoryForFile = directories.find(directory =>
// 	// 						directory.contains(editor.getPath())
// 	// 					);
// 	// 					if (directoryForFile) {
// 	// 						atom.project.repositoryForDirectory(directoryForFile).then(repo => {
// 	// 							if (repo) {
// 	// 								let path = repo.relativize(editor.getPath());
// 	// 								// note we always maintain the current file with a forward slash separator
// 	// 								// even if we are on a Windows machine using a backslash
// 	// 								path = path.replace("\\", "/");
// 	// 								store.dispatch(setCurrentFile(path));
// 	// 							} else store.dispatch(setCurrentFile(null));
// 	// 						});
// 	// 					}
// 	// 				} else {
// 	// 					// in the case of no editor, for example the settings page,
// 	// 					// we display the "intro" welcome to codestream text, which
// 	// 					// is handled by lib/components/Stream.js when there is no file
// 	// 					store.dispatch(setCurrentFile(null));
// 	// 				}
// 	// 			}),
// 	// 		);
// 	//
// 	// 		window.addEventListener("online", e => store.dispatch(online()), false);
// 	// 		window.addEventListener("offline", e => store.dispatch(offline()), false);
// 	// 		window.addEventListener("mousemove", e => store.dispatch(setActive()), false);
// 	// 		window.addEventListener("keypress", e => store.dispatch(setActive()), false);
// 	// 		window.addEventListener("focus", e => store.dispatch(setActive()), false);
// 	// 		window.addEventListener("blur", e => store.dispatch(setHasFocus(false)), false);
// 	// 		window.addEventListener("focus", e => store.dispatch(setHasFocus(true)), false);
// 	// 		store.dispatch(setHasFocus(true));
// 	// },
// };
