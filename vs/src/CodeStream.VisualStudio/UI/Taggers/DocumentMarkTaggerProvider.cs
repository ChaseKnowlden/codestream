﻿using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Services;
using CodeStream.VisualStudio.UI.Glyphs;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;
using System.Collections.Generic;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.UI.Taggers
{
    [Export(typeof(IViewTaggerProvider))]
    [ContentType(ContentTypes.Text)]
    [TagType(typeof(DocumentMarkGlyphTag))]
    [TextViewRole(PredefinedTextViewRoles.Interactive)]
    [TextViewRole(PredefinedTextViewRoles.Document)]
    internal class DocumentMarkTaggerProvider : IViewTaggerProvider
    {
        [Import]
        public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }

        private static readonly List<string> TextViewRoles = new List<string>
        {
            PredefinedTextViewRoles.Interactive,
            PredefinedTextViewRoles.Document
        };

        public ITagger<T> CreateTagger<T>(ITextView textView, ITextBuffer buffer) where T : ITag
        {
            var wpfTextView = textView as IWpfTextView;

            if (wpfTextView == null) return null;

            if (textView.TextBuffer != buffer) return null;

            // only show for roles we care about
            if (!wpfTextView.Roles.ContainsAll(TextViewRoles)) return null;

            if (!TextDocumentExtensions.TryGetTextDocument(TextDocumentFactoryService, textView.TextBuffer, out var textDocument))
            {
                return null;
            }

            var sessionService = Package.GetGlobalService(typeof(SSessionService)) as ISessionService;
            return textView.TextBuffer.Properties.GetOrCreateSingletonProperty(typeof(DocumentMarkTagger),
                () => new DocumentMarkTagger(sessionService, textView, textDocument, buffer)) as ITagger<T>;
        }
    }
}
