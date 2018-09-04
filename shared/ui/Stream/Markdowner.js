// import { UIMessage, SlackChannelMessages } from "../interfaces";
// import * as str from "../strings";
const MarkdownIt = require("markdown-it");
const markdownItSlack = require("markdown-it-slack");
import hljs from "highlight.js";

// export const parseUsernames = (uiMessage: UIMessage): UIMessage => {
// 	// Find and replace names like <@UBCQ8LF28>
// 	const { messages, users } = uiMessage;
// 	let newMessages = {};
// 	Object.keys(messages).map(ts => {
// 		const message = messages[ts];
// 		let { text } = message;
// 		const matched = text.match(/<@([A-Z0-9]+)>/);

// 		if (matched && matched.length > 0) {
// 			const userId = matched[1];
// 			if (userId in users) {
// 				const { name } = users[userId];
// 				text = text.replace(matched[0], `@${name}`);
// 			}
// 		}

// 		newMessages[ts] = {
// 			...message,
// 			text
// 		};
// 	});
// 	return {
// 		...uiMessage,
// 		messages: newMessages
// 	};
// };

// export const parseLinks = (messages: SlackChannelMessages): SlackChannelMessages => {
// 	// Looks for <url|title> pattern, and replaces them with normal markdown
// 	// The |pattern can be optional
// 	let parsed = {};
// 	Object.keys(messages).forEach(key => {
// 		const { content, text } = messages[key];
// 		const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=;\^]*)/;
// 		const SLACK_MODIFIER = /(|.[^><]+)/;
// 		const re = new RegExp(`<(${URL_REGEX.source})(${SLACK_MODIFIER.source})>`, "g");
// 		parsed[key] = {
// 			...messages[key],
// 			text: text
// 				? text.replace(re, function(a, b, c, d, e) {
// 						return e ? `[${e.substr(1)}](${b})` : `[${b}](${b})`;
// 				  })
// 				: "",
// 			content: {
// 				...content,
// 				text:
// 					content && content.text
// 						? content.text.replace(re, function(a, b, c, d, e) {
// 								return e ? `[${e.substr(1)}](${b})` : `[${b}](${b})`;
// 						  })
// 						: "",
// 				footer:
// 					content && content.footer
// 						? content.footer.replace(re, function(a, b, c, d, e) {
// 								return e ? `[${e.substr(1)}](${b})` : `[${b}](${b})`;
// 						  })
// 						: ""
// 			}
// 		};
// 	});
// 	return parsed;
// };

const md = new MarkdownIt({
	breaks: true,
	linkify: true,
	highlight: function(str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return '<pre class="hljs"><code>' + hljs.highlight(lang, str, true).value + "</code></pre>";
			} catch (__) {}
		}

		return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + "</code></pre>";
	}
}).use(markdownItSlack);

md.renderer.rules.emoji = function(token, idx) {
	return '<span class="emoji">' + token[idx].content + "</span>";
};

export const emojify = text => {
	return md.render(text);
};

export const markdownify = text => {
	const replaced = md
		.render(text)
		.replace(/blockquote>\n/g, "blockquote>")
		.replace(/<br>\n/g, "\n")
		.replace(/<\/p>\n$/, "</p>");
	// console.log(replaced);
	if (text.trim().match(/^(:[\w_+]+:|\s)+$/))
		return "<span class='only-emoji'>" + replaced + "</span>";
	else return replaced;
	// // Override renderer for link_open --> this adds an onclick attribute
	// // on links, so that we can open them via message passing. This relies
	// // on method `openLink` inside src/ui/static.js
	// var defaultRender =
	// 	md.renderer.rules.link_open ||
	// 	function(tokens, idx, options, env, self) {
	// 		return self.renderToken(tokens, idx, options);
	// 	};

	// md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
	// 	const index = tokens[idx].attrIndex("href");
	// 	const value = tokens[idx].attrs[index][1];
	// 	tokens[idx].attrPush(["onclick", `openLink('${value}'); return false;`]);
	// 	tokens[idx].attrPush(["tabindex", "-1"]);
	// 	return defaultRender(tokens, idx, options, env, self);
	// };

	// textHTML: content && content.text ? md.render(content.text) : ``,
	// 			footerHTML: content && content.footer ? md.renderInline(content.footer) : ``
	// 		}
	// 	};
	// });

	// return markdowned;
};

// const transformChain = (uiMessage: UIMessage): UIMessage => {
// 	const { messages } = parseUsernames(uiMessage);
// 	return {
// 		...uiMessage,
// 		messages: markdownify(parseLinks(emojify(messages)))
// 	};
// };

// export default transformChain;
