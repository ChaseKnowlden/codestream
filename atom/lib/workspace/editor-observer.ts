import { CompositeDisposable, Disposable, Emitter, Point, Range, TextEditor } from "atom";
import { throttle } from "utils";

const DID_CHANGE_SELECTION = "did-change-selection";
const DID_CHANGE_EDITOR = "did-change-editor";
const DID_CHANGE_VISIBLE_RANGES = "did-change-visible-ranges";

export class EditorObserver implements Disposable {
	private subscriptions: CompositeDisposable;
	private emitter = new Emitter();

	constructor() {
		this.subscriptions = new CompositeDisposable();
		this.subscriptions.add(
			atom.workspace.observeActiveTextEditor(editor => {
				this.emitter.emit(DID_CHANGE_EDITOR, editor);
				if (editor) {
					const editorSubscriptions = new CompositeDisposable(
						editor.observeSelections(selection => {
							const callback = throttle(event => {
								if (
									!event.newBufferRange.isEqual(event.oldBufferRange) &&
									!event.newBufferRange.isEmpty()
								) {
									this.emitter.emit(DID_CHANGE_SELECTION, {
										editor,
										range: event.selection.getBufferRange(),
										cursor: editor.getCursorBufferPosition(),
									});
								}
							});
							selection.onDidChangeRange(callback);
							selection.onDidDestroy(() => {
								callback.cancel();
							});
						}),
						editor.onDidDestroy(() => editorSubscriptions.dispose())
					);
					const editorView = atom.views.getView(editor);
					if (editorView) {
						editorSubscriptions.add(
							editorView.onDidChangeScrollTop(() => {
								this.emitter.emit(DID_CHANGE_VISIBLE_RANGES, editor);
							})
						);
					}
					this.subscriptions.add(editorSubscriptions);
				}
			})
		);
	}

	onDidChangeSelection(
		cb: (event: { editor: TextEditor; range: Range; cursor: Point }) => void
	): Disposable {
		return this.emitter.on(DID_CHANGE_SELECTION, cb);
	}

	onDidChangeActiveEditor(cb: (editor?: TextEditor) => void): Disposable {
		return this.emitter.on(DID_CHANGE_EDITOR, cb);
	}

	onDidChangeVisibleRanges(cb: (editor: TextEditor) => void) {
		return this.emitter.on(DID_CHANGE_VISIBLE_RANGES, cb);
	}

	dispose() {
		this.subscriptions.dispose();
		this.emitter.dispose();
	}
}
