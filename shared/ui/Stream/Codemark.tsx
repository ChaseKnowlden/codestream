import cx from "classnames";
import React from "react";
import { connect } from "react-redux";
import { fetchThread, setCodemarkStatus, setUserPreference } from "./actions";
import Headshot from "./Headshot";
import Icon from "./Icon";
import Menu from "./Menu";
import { markdownify } from "./Markdowner";
import Timestamp from "./Timestamp";
import CodemarkDetails from "./CodemarkDetails";
import {
	DocumentMarker,
	CodemarkPlus,
	OpenUrlRequestType,
	Capabilities
} from "@codestream/protocols/agent";
import { CodemarkType, CSUser, CSMe, CSPost } from "@codestream/protocols/api";
import { HostApi } from "../webview-api";
import { SetCodemarkPinnedRequestType } from "@codestream/protocols/agent";
import { range } from "../utils";
import { getUserByCsId } from "../store/users/reducer";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { CodemarkForm } from "./CodemarkForm";
import { deleteCodemark, editCodemark } from "../store/codemarks/actions";
import { confirmPopup } from "./Confirm";
import { getPost } from "../store/posts/reducer";
import { getPosts } from "../store/posts/actions";
import Tooltip from "./Tooltip";
import { getCurrentTeamProvider } from "../store/teams/actions";
import { isNil } from "lodash-es";

interface State {
	isEditing: boolean;
	menuOpen?: boolean;
	menuTarget?: any;
	showLabelText: boolean;
}

interface DispatchProps {
	author: CSUser;
	capabilities: Capabilities;
	codemarkKeybindings: { [key: string]: string };
	currentUser: CSMe;
	editorHasFocus: boolean;
	pinnedReplies: CSPost[];
	pinnedAuthors: CSUser[];
	isCodeStreamTeam: boolean;

	deleteCodemark: typeof deleteCodemark;
	editCodemark: typeof editCodemark;
	fetchThread: typeof fetchThread;
	setCodemarkStatus: typeof setCodemarkStatus;
	setUserPreference: typeof setUserPreference;
	getPosts: typeof getPosts;
}

interface Props extends DispatchProps {
	selected?: boolean;
	collapsed?: boolean;
	inline?: boolean;
	hover?: boolean;
	codemark: CodemarkPlus;
	marker: DocumentMarker;
	usernames: string[];
	postAction?(...args: any[]): any;
	action(action: string, post: any, args: any): any;
	onClick?(event: React.SyntheticEvent, codemark: CodemarkPlus, marker: DocumentMarker): any;
	onMouseEnter?(marker: DocumentMarker): any;
	onMouseLeave?(marker: DocumentMarker): any;
	query?: string;
	style?: object;
	lineNum?: Number;
	top?: Number;
	showLabelText?: boolean;
	hidden: boolean;
	deselectCodemarks?: Function;
	teammates?: CSUser[];
}

export class Codemark extends React.Component<Props, State> {
	static defaultProps = {
		style: {}
	};

	private _pollingTimer?: any;

	constructor(props: Props) {
		super(props);
		this.state = {
			isEditing: false,
			menuOpen: false,
			showLabelText: false
		};
	}

	componentDidMount() {
		const { codemark, pinnedReplies, getPosts, selected } = this.props;
		if (codemark.pinnedReplies && codemark.pinnedReplies.length > 0 && pinnedReplies.length === 0) {
			getPosts(codemark.streamId, codemark.pinnedReplies!, codemark.postId);
		}

		if (selected) {
			this.startPollingReplies(false);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.selected && !this.props.selected) {
			this.stopPollingReplies();
		} else if (this.props.selected && this._pollingTimer === undefined) {
			this.startPollingReplies(true);
		}
	}

	componentWillUnmount() {
		this.stopPollingReplies();
	}

	private startPollingReplies(prefetch: boolean) {
		if (this.props.capabilities.providerSupportsRealtimeEvents) return;

		if (prefetch) {
			this.fetchReplies();
		}

		if (this._pollingTimer !== undefined) return;

		this._pollingTimer = setInterval(() => {
			if (this.props.editorHasFocus) {
				this.fetchReplies();
			}
		}, 5000);
	}

	private stopPollingReplies() {
		if (this._pollingTimer === undefined) return;

		clearInterval(this._pollingTimer);
		this._pollingTimer = undefined;
	}

	private async fetchReplies() {
		const postId = this.props.codemark.postId;
		// because the codemark is created before the third party chat post,
		// `postId` can be undefined for a period. in the case of ms teams at least,
		// that period can be long enough that if a user attempts to expand the newly created codemark,
		// postId will still be nil
		if (isNil(postId) || postId === "") return;

		return this.props.fetchThread(this.props.codemark.streamId, this.props.codemark.postId);
	}

	render() {
		let content;
		if (this.state.isEditing)
			content = (
				<div
					className="compose float-compose multi-compose"
					style={{ top: `${this.props.top}px` }}
					data-top={this.props.top}
				>
					<CodemarkForm
						isEditing
						editingCodemark={this.props.codemark}
						commentType={this.props.codemark.type}
						onSubmit={this.editCodemark}
						onClickClose={() => this.setState({ isEditing: false })}
						streamId={this.props.codemark.streamId}
						collapsed={false}
					/>
				</div>
			);
		else if (this.props.inline) content = this.renderInlineCodemark();
		else if (this.props.collapsed) content = this.renderCollapsedCodemark();

		return <span>{content}</span>;
	}

	editCodemark = async ({ text, color, assignees, title }) => {
		await this.props.editCodemark(this.props.codemark.id, {
			color,
			text,
			title,
			assignees
		});
		this.setState({ isEditing: false });
	};

	renderTextLinkified = text => {
		let html;
		if (text == null || text === "") {
			html = "";
		} else {
			const me = this.props.currentUser.username;
			html = markdownify(text).replace(/@(\w+)/g, (match: string, name: string) => {
				if (
					this.props.usernames.some(
						n => name.localeCompare(n, undefined, { sensitivity: "accent" }) === 0
					)
				) {
					return `<span class="at-mention${
						me.localeCompare(name, undefined, { sensitivity: "accent" }) === 0 ? " me" : ""
					}">${match}</span>`;
				}

				return match;
			});

			if (this.props.query) {
				const matchQueryRegexp = new RegExp(this.props.query, "gi");
				html = html.replace(matchQueryRegexp, "<u><b>$&</b></u>");
			}
		}

		return <span dangerouslySetInnerHTML={{ __html: html }} />;
	};

	renderTypeIcon() {
		const { codemark } = this.props;
		let icon: JSX.Element | null = null;
		switch (codemark.type) {
			case "question":
				icon = <Icon name="question" className="type-icon" />;
				break;
			case "bookmark":
				icon = <Icon name="bookmark" className="type-icon" />;
				break;
			case "trap":
				icon = <Icon name="trap" className="type-icon" />;
				break;
			case "issue":
				icon = <Icon name="issue" className="type-icon" />;
				break;
			default:
				icon = <Icon name="comment" className="type-icon" />;
		}
		return icon;
	}

	handleClickStatusToggle = (event: React.SyntheticEvent): any => {
		event.stopPropagation();
		const { codemark } = this.props;
		if (codemark.status === "closed") this.openIssue();
		else this.closeIssue();
	};

	closeIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark.id, "closed");
		this.submitReply("/me closed this issue");
	};

	openIssue = () => {
		const { codemark, setCodemarkStatus } = this.props;
		setCodemarkStatus(codemark.id, "open");
		this.submitReply("/me reopened this issue");
	};

	submitReply = text => {
		const { action, codemark } = this.props;
		const forceThreadId = codemark.parentPostId || codemark.postId;
		action("submit-post", null, { forceStreamId: codemark.streamId, forceThreadId, text });
	};

	renderStatus(codemark) {
		const { type, status = "open" } = codemark;
		if (type === CodemarkType.Issue) {
			if (this.props.inline) {
				return (
					<Tooltip title="Mark as resolved and hide discussion" placement="topRight">
						<div
							className={cx("resolve-button", { checked: status === "closed" })}
							onClick={this.handleClickStatusToggle}
						>
							{status === "open" ? "Resolve" : "Reopen"}
						</div>
					</Tooltip>
				);
			} else {
				return (
					<div className="align-far-left">
						<div
							className={cx("status-button", { checked: status === "closed" })}
							onClick={this.handleClickStatusToggle}
						>
							<Icon name="check" className="check" />
						</div>
					</div>
				);
			}
		}
		return null;
	}

	handleClickCodemark = (event: React.MouseEvent): any => {
		const target = event && (event.target as HTMLElement);
		if (target) {
			if (
				target.tagName === "A" ||
				target.closest(".post.reply") ||
				target.closest(".external-provider")
			)
				return false;
		}
		// if (this.props.selected) return false;

		event.preventDefault();
		const selection = window.getSelection();
		if (selection != null && selection.toString().length > 0) {
			// in this case the user has selected a string
			// by dragging
			return;
		}

		this.props.onClick && this.props.onClick(event, this.props.codemark, this.props.marker);
	};

	handleMouseEnterCodemark = (event: React.MouseEvent): any => {
		this.props.onMouseEnter && this.props.onMouseEnter(this.props.marker);
	};

	handleMouseLeaveCodemark = (event: React.MouseEvent): any => {
		this.props.onMouseLeave && this.props.onMouseLeave(this.props.marker);
	};

	handleMenuClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		this.setState({ menuOpen: !this.state.menuOpen, menuTarget: event.target });
	};

	handleSelectMenu = action => {
		this.setState({ menuOpen: false });

		if (!action) return;

		switch (action) {
			case "toggle-pinned": {
				this.togglePinned();
				break;
			}
			case "delete-post": {
				this.deleteCodemark();
				break;
			}
			case "edit-post": {
				this.setState({ isEditing: true });
				break;
			}
		}
		var found = action.match(/set-keybinding-(\d)/);
		if (found) this.setKeybinding(found[1]);
	};

	deleteCodemark() {
		confirmPopup({
			title: "Are you sure?",
			message: "Deleting a codemark cannot be undone.",
			centered: true,
			buttons: [
				{
					label: "Delete Codemark",
					wait: true,
					action: () => {
						this.props.deleteCodemark(this.props.codemark.id);
					}
				},
				{ label: "Cancel" }
			]
		});
	}

	togglePinned = () => {
		const { codemark } = this.props;
		if (!codemark) return;

		// if it's pinned, we're hiding/archiving/unpinning it
		if (codemark.pinned) {
			if (this.props.deselectCodemarks) this.props.deselectCodemarks();
		}

		HostApi.instance.send(SetCodemarkPinnedRequestType, {
			codemarkId: codemark.id,
			value: !codemark.pinned
		});
	};

	toggleLabelIndicators = (_event: React.SyntheticEvent) => {
		// event.stopPropagation();
		// HostApi.instance.send(UpdateConfigurationRequestType, {
		// 	name: "showLabelText",
		// 	value: !this.props.showLabelText
		// });
		// this.setState({ showLabelText: !this.state.showLabelText });
	};

	renderCollapsedCodemark() {
		const { codemark } = this.props;
		const file = codemark.markers && codemark.markers[0] && codemark.markers[0].file;

		if (!codemark) return null;

		return (
			<div
				style={{ ...this.props.style }}
				className={cx("codemark collapsed")}
				onClick={this.handleClickCodemark}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
			>
				<div className="contents">
					{this.renderStatus(codemark)}
					<div className="body">
						<span className={codemark.color}>{this.renderTypeIcon()}</span>
						{this.renderTextLinkified(codemark.title || codemark.text)}
						{file && <span className="file-name">{file}</span>}
					</div>
				</div>
			</div>
		);
	}

	setKeybinding(key) {
		const { codemark, codemarkKeybindings } = this.props;

		const bindings = { ...codemarkKeybindings };

		for (const [k, codemarkId] of Object.entries(codemarkKeybindings)) {
			if (codemarkId !== codemark.id) continue;

			bindings[k] = "";
		}
		bindings[key] = codemark.id;

		this.props.setUserPreference(["codemarkKeybindings"], bindings);
	}

	renderKeybinding(codemark) {
		const { codemarkKeybindings } = this.props;

		const found = Object.entries(codemarkKeybindings).find(
			([, codemarkId]) => codemarkId === codemark.id
		);
		if (found == null) return null;

		const [index] = found;
		if (parseInt(index, 10) > 0) {
			const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
			return (
				<div style={{ float: "right", marginRight: "5px", opacity: 0.6 }}>
					<span className="keybinding extra-pad">{modifier}</span>
					<span className="keybinding extra-pad">{index}</span>
				</div>
			);
		}

		return null;
	}

	renderAttachments = post => {
		if (post.files && post.files.length) {
			return post.files.map(file => {
				// console.log(file);
				//<img src={preview.url} width={preview.width} height={preview.height} />
				const { type, url, name, title, preview } = file;
				if (type === "image") {
					return (
						<div className="thumbnail">
							<a href={url}>{title}</a>
						</div>
					);
				} else if (type === "post") {
					return (
						<div className="external-post">
							<a href={url}>{title}</a>
							<div className="preview" dangerouslySetInnerHTML={{ __html: preview }} />
						</div>
					);
				} else {
					return (
						<div className="attachment">
							<a href={url}>{title}</a>
							<pre>
								<code>{preview}</code>
							</pre>
						</div>
					);
				}
			});
		}
		return null;
	};

	renderReplyCount = post => {
		let message = "";
		const { codemark } = this.props;

		if (!codemark) return null;

		const numReplies = codemark.numReplies || "0";
		switch (codemark.type) {
			case "question":
				message = numReplies === 1 ? "1 Answer" : `${numReplies} Answers`;
				break;
			default:
				message = numReplies === 1 ? "1 Reply" : `${numReplies} Replies`;
				break;
		}
		return <a className="num-replies">{message}</a>;
	};

	renderAssignees = (codemark: CodemarkPlus) => {
		let assigneeIcons: any = null;

		const { teammates } = this.props;
		if (teammates) {
			const assignees = (codemark.assignees || [])
				.map(id => teammates.find(t => t.id === id))
				.filter(Boolean) as CSUser[];
			const externalAssignees = (codemark.externalAssignees || [])
				.filter(user => !assignees.find(a => a.email === user.email))
				.filter(Boolean)
				.map(a => ({ fullName: a.displayName, email: a.email }));

			const assigneeHeadshots = [...assignees, ...externalAssignees].map(a => (
				<Headshot size={18} person={a} />
			));

			if (assigneeHeadshots.length > 0) {
				assigneeIcons = <span className="assignees">{assigneeHeadshots}</span>;
			}
		}
		return assigneeIcons;
	};

	renderExternalLink = codemark => {
		if (codemark.externalProviderUrl) {
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) {
				return null;
			}
			return [
				<br />,
				<a href={codemark.externalProviderUrl}>Open on {providerDisplay.displayName}</a>,
				<br />,
				<br />
			];
		}
		return null;
	};

	renderDetailIcons = codemark => {
		const hasDescription = codemark.title && codemark.text;
		const hasReplies = codemark.numReplies > 0;

		let externalLink: any = null;
		if (codemark.externalProviderUrl) {
			//@ts-ignore
			const providerDisplay = PROVIDER_MAPPINGS[codemark.externalProvider];
			if (!providerDisplay) return null;
			const icon = providerDisplay.icon;
			if (!icon) return null;
			externalLink = (
				<span
					className="detail-icon"
					onClickCapture={e => {
						e.preventDefault();
						HostApi.instance.send(OpenUrlRequestType, { url: codemark.externalProviderUrl });
					}}
				>
					<Icon name={icon} className="external-provider" />
				</span>
			);
		}

		if (externalLink || hasDescription || hasReplies) {
			return (
				<div className="detail-icons">
					{externalLink}
					{hasDescription && (
						<span className="detail-icon">
							<Icon name="description" />
						</span>
					)}
					{hasReplies && (
						<span className="detail-icon">
							<Icon name="comment" /> {this.props.isCodeStreamTeam && codemark.numReplies}
						</span>
					)}
				</div>
			);
		} else return name;
	};

	renderInlineCodemark() {
		const { codemark, codemarkKeybindings, hidden, selected, author } = this.props;
		const { menuOpen, menuTarget } = this.state;

		if (!codemark) return null;

		const type = codemark && codemark.type;

		const mine = author.id === this.props.currentUser.id;

		let menuItems: any[] = [
			// { label: "Add Reaction", action: "react" },
			// { label: "Get Permalink", action: "get-permalink" },
			// { label: "-" }
		];

		if (codemark.pinned) {
			menuItems.push({ label: "Archive", action: "toggle-pinned" });
		} else {
			menuItems.push({ label: "Unarchive", action: "toggle-pinned" });
		}

		if (mine) {
			menuItems.push(
				{ label: "Edit", action: "edit-post" },
				{ label: "Delete", action: "delete-post" }
			);
		}

		const submenu = range(1, 10).map(index => {
			const inUse = codemarkKeybindings[index] ? " (in use)" : "";
			return {
				label: `${index}${inUse}`,
				action: `set-keybinding-${index}`
			};
		});

		menuItems.push({ label: "Set Keybinding", action: "set-keybinding", submenu: submenu });

		const description = codemark.title ? this.renderTextLinkified(codemark.text) : null;
		return (
			<div
				style={{ ...this.props.style }}
				className={cx("codemark inline type-" + type, {
					// if it's selected, we don't render as hidden
					hidden: !selected ? hidden : false,
					collapsed: !selected,
					selected: selected,
					unpinned: !codemark.pinned
				})}
				onClick={this.handleClickCodemark}
				onMouseEnter={this.handleMouseEnterCodemark}
				onMouseLeave={this.handleMouseLeaveCodemark}
				data-linenum={this.props.lineNum}
				data-top={this.props.top}
			>
				<div className="contents">
					{(selected || !hidden) && !codemark.pinned && (
						<div className="archived">This codemark is archived</div>
					)}
					<div className="body">
						{this.renderKeybinding(codemark)}
						{this.renderStatus(codemark)}
						{this.renderAssignees(codemark)}
						<div className="author">
							<Headshot person={author} />
							{author.username}
							<Timestamp time={codemark.createdAt} />
							{codemark.color && (
								<div
									className={cx(`label-indicator ${codemark.color}-background`, {
										expanded: this.state.showLabelText
									})}
									onClick={this.toggleLabelIndicators}
								>
									<span>priority</span>
								</div>
							)}
						</div>
						{type === "bookmark" && <span className={codemark.color}>{this.renderTypeIcon()}</span>}
						{this.renderTextLinkified(codemark.title || codemark.text)}
						<div
							style={{ position: "absolute", top: "5px", right: "5px" }}
							onClick={this.handleMenuClick}
						>
							{menuOpen && (
								<Menu items={menuItems} target={menuTarget} action={this.handleSelectMenu} />
							)}
							<Icon name="kebab-vertical" className="kebab-vertical clickable" />
						</div>
						{!selected && this.renderPinnedReplies()}
						{!selected && this.renderDetailIcons(codemark)}
					</div>
					{selected && (
						<CodemarkDetails
							codemark={codemark}
							author={this.props.author}
							postAction={this.props.postAction}
						>
							<div className="description">
								{description}
								{this.renderExternalLink(codemark)}
							</div>
						</CodemarkDetails>
					)}
				</div>
				{this.props.hover && !selected && type !== "bookmark" && (
					<div style={{ opacity: 0.5, position: "absolute", right: "5px", bottom: "5px" }}>
						<Icon
							className="info"
							title={this.renderCodemarkFAQ()}
							placement="bottomRight"
							delay={1}
							name="info"
						/>
					</div>
				)}
			</div>
		);
	}

	renderPinnedReplies() {
		const { pinnedReplies = [] } = this.props;

		if (pinnedReplies.length === 0) return null;
		return (
			<div className="pinned-replies">
				{pinnedReplies.map((post, i) => {
					return (
						<div className="pinned-reply">
							<Icon className="pinned-reply-star" name="star" />{" "}
							<Headshot size={18} person={this.props.pinnedAuthors[i]} />
							<div className="pinned-reply-body">{this.renderTextLinkified(post.text)}</div>
						</div>
					);
				})}
			</div>
		);
	}

	renderCodemarkFAQ() {
		return (
			<div className="codemark-faq">
				Just like Twitter has Tweets, CodeStream uses Codemarks as a unit of conversation.
				<ul style={{ paddingLeft: "20px" }}>
					<li>
						Codemarks are <b>branch-agnostic</b>. That means this codemark will appear "in the right
						place" even for your teammates who are checked out to a different version of this file.{" "}
						<a href="https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks">
							learn more
						</a>
					</li>
					<li>
						Codemarks <b>move with the code</b>, so your conversation remains connected to the right
						codeblock even as your code changes.{" "}
						<a href="https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks">
							learn about comment drift
						</a>
					</li>
					<li>
						Codemarks <b>can be managed</b> by archiving or deleting them if they're no longer
						relevant.{" "}
						<a href="https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks">
							see how
						</a>
					</li>
					<li>
						<b>Replies can be promoted</b> with a <Icon name="star" /> so the best answer surfaces
						to the top, like in stack overflow.{" "}
						<a href="https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks">
							see how
						</a>
					</li>
				</ul>
			</div>
		);
	}

	renderDemoShit(codemark) {
		const user = {
			username: "pez",
			email: "pez@codestream.com",
			fullName: "Peter Pezaris"
		};
		return (
			<div>
				{codemark.text &&
					codemark.text.startsWith("does this") && [
						<div className="pinned-reply">
							<Icon name="star" /> <Headshot size={18} person={user} />
							<div className="pinned-reply-body">
								no; the javascript byte compiler optimizes it away
							</div>
						</div>,
						<div className="pinned-reply">
							<Icon name="star" /> <Headshot size={18} person={user} />
							<div className="pinned-reply-body">are you sure?</div>
						</div>
					]}
				{codemark.title && codemark.title.startsWith("let's avoid") && (
					<div className="pinned-reply">
						<Icon name="star" /> <Headshot size={18} person={user} />
						<div className="pinned-reply-body">i'll grab this in the next sprint</div>
					</div>
				)}
				{codemark.text && codemark.text.startsWith("how does") && (
					<div className="pinned-reply">
						<Icon name="star" /> <Headshot size={18} person={user} />
						<div className="pinned-reply-body">
							Sample <code>n</code> random values from a collection using the modern version of the{" "}
							<b>Fisher-Yates</b> shuffle. If <code>n</code> is not specified, returns a single
							random element. The internal <code>guard</code> argument allows it to work with{" "}
							<code>map</code>.
						</div>
					</div>
				)}
			</div>
		);
	}
}

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const unkownAuthor = {
	username: "CodeStream",
	fullName: "Uknown User"
};

const mapStateToProps = (state, props): Partial<DispatchProps> => {
	const { capabilities, context, preferences, users, session, posts } = state;
	const { codemark } = props;

	const teamProvider = getCurrentTeamProvider(state);

	const pinnedReplies = (codemark.pinnedReplies || EMPTY_ARRAY)
		.map(id => getPost(posts, codemark.streamId, id))
		.filter(Boolean);

	const pinnedAuthors = pinnedReplies.map(post => users[post.creatorId]);

	return {
		capabilities: capabilities,
		editorHasFocus: context.hasFocus,
		pinnedReplies,
		pinnedAuthors,
		currentUser: users[session.userId] as CSMe,
		author: getUserByCsId(users, props.codemark.creatorId) || (unkownAuthor as CSUser),
		codemarkKeybindings: preferences.codemarkKeybindings || EMPTY_OBJECT,
		isCodeStreamTeam: teamProvider === "codestream"
	};
};

export default connect<any, Partial<DispatchProps>, any>(
	mapStateToProps,
	{ setCodemarkStatus, setUserPreference, deleteCodemark, editCodemark, fetchThread, getPosts }
)(Codemark);
