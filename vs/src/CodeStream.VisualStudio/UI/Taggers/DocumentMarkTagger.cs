﻿using CodeStream.VisualStudio.Extensions;
using CodeStream.VisualStudio.Models;
using CodeStream.VisualStudio.Services;
using CodeStream.VisualStudio.UI.Glyphs;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CodeStream.VisualStudio.UI.Taggers
{
    /// <summary>
    ///     Responsible for matching Codemarks up to a line
    /// </summary>
    internal class DocumentMarkTagger : ITagger<DocumentMarkGlyphTag>
    {
        private readonly ISessionService _sessionService;
        private readonly ITextView _textView;
        private readonly ITextDocument _textDocument;
        private readonly ITextBuffer _buffer;

        public DocumentMarkTagger(ISessionService sessionService, ITextView textView, ITextDocument textDocument, ITextBuffer buffer)
        {
            _sessionService = sessionService;
            _textView = textView;
            _textDocument = textDocument;
            _buffer = buffer;
        }

#pragma warning disable 67
        public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
#pragma warning restore 67

        IEnumerable<ITagSpan<DocumentMarkGlyphTag>> ITagger<DocumentMarkGlyphTag>.GetTags(
            NormalizedSnapshotSpanCollection spans)
        {
            if (_sessionService == null || !_sessionService.IsReady) yield break;

            List<DocumentMarker> markers = null;
            if (_textDocument.TextBuffer.Properties.ContainsProperty(PropertyNames.DocumentMarkers))
                markers = _textDocument.TextBuffer.Properties.GetProperty<List<DocumentMarker>>(PropertyNames.DocumentMarkers);

            if (markers == null || !markers.AnySafe()) yield break;

            foreach (var span in spans)
            {
                var lineNumber = span.Start.GetContainingLine().LineNumber;
                var codemark = markers.FirstOrDefault(_ => _?.Range?.Start.Line == lineNumber);
                if (codemark == null) continue;

                SnapshotPoint start = span.Start == 0 ? span.Start : span.Start - 1;
                yield return new TagSpan<DocumentMarkGlyphTag>(
                    new SnapshotSpan(start, 1),
                    new DocumentMarkGlyphTag(codemark)
                );
            }
        }
    }
}
