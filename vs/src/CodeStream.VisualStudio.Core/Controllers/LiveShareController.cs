﻿using System;
using System.Collections.Generic;
using System.Linq;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.Shell;
using Serilog;
using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Core.Controllers {
	public class LiveShareController {
		private static readonly ILogger Log = LogManager.ForContext<LiveShareController>();

		private readonly ISessionService _sessionService;
		private readonly ICodeStreamAgentService _codeStreamAgent;
		private readonly IEventAggregator _eventAggregator;
		private readonly IBrowserService _browserService;
		private readonly IIdeService _ideService;

		public LiveShareController(
			ISessionService sessionService,
			ICodeStreamAgentService codeStreamAgent,
			IEventAggregator eventAggregator,
			IBrowserService browserService,
			IIdeService ideService) {
			_sessionService = sessionService;
			_codeStreamAgent = codeStreamAgent;
			_eventAggregator = eventAggregator;
			_browserService = browserService;
			_ideService = ideService;
		}

		private async Task CreatePostAsync(string streamId, string threadId, string url) {
			if (url.IsNullOrWhiteSpace()) {
				Log.Debug($"{nameof(CreatePostAsync)} url is missing");
				await Task.CompletedTask;
			}
			else {

				try {
					var streamResponse = await _codeStreamAgent.GetStreamAsync(streamId);
					if (streamResponse != null) {
						var streamThread = new StreamThread(threadId, streamResponse.Stream);
						await _codeStreamAgent.CreatePostAsync(streamThread.Stream.Id,
							streamThread.Id, $"Join my Live Share session: {url}");

						_sessionService.LiveShareUrl = url;
					}
				}
				catch (Exception ex) {
					Log.Warning(ex, "Could not post Live Share url");
				}
			}
		}

		public async Task StartAsync(string streamId, string threadId) {
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

			var existingUrl = _sessionService.LiveShareUrl;
			if (!existingUrl.IsNullOrWhiteSpace()) {
				await CreatePostAsync(streamId, threadId, existingUrl);
			}
			else {
				if (!_ideService.TryStartLiveShare()) {
					await Task.CompletedTask;
				}
				else {
					IDisposable liveShareReadyEvent = null;
					liveShareReadyEvent = _eventAggregator.GetEvent<LiveShareStartedEvent>().Subscribe(e => {
						try {
							liveShareReadyEvent?.Dispose();

							_ = _ideService.GetClipboardTextValueAsync(10000, (string url) => {
								ThreadHelper.JoinableTaskFactory.Run(async delegate {
									await CreatePostAsync(streamId, threadId, url);
								});
							}, RegularExpressions.LiveShareUrl);
						}
						catch (Exception ex) {
							Log.Error(ex, "Could not start Live Share");
						}
					});
				}
			}

			await Task.CompletedTask;
		}

		public async Task InviteAsync(object userIdObj) {
			try {
				var userIds = new List<string>();
				var userId = userIdObj as string;
				if (userId != null) {
					userIds.Add(userId);
				}
				else {
					userIds = userIdObj as List<string>;
				}

				if (userId != null) {
					var memberIds = new List<string> { _sessionService.User.Id };
					foreach (var id in userIds) {
						var userResponse = await _codeStreamAgent.GetUserAsync(id);
						memberIds.Add(userResponse.User.Id);
					}

					CsStream stream = null;
					var fetchStreamsResponse = await _codeStreamAgent.FetchStreamsAsync(new FetchStreamsRequest {
						Types = new List<StreamType> { StreamType.direct },
						MemberIds = memberIds
					});

					if (fetchStreamsResponse != null) {
						stream = fetchStreamsResponse.Streams.FirstOrDefault();
					}

					if (stream == null) {
						stream = await _codeStreamAgent.CreateDirectStreamAsync(memberIds);
					}

					if (_sessionService.LiveShareUrl.IsNullOrWhiteSpace()) {
						// user clicked invite before starting a Live Share -- create one now!
						await StartAsync(stream.Id, null);
					}
					else {
						var postResponse = await _codeStreamAgent.CreatePostAsync(stream.Id, null,
							$"Join my Live Share session: {_sessionService.LiveShareUrl}");
						if (postResponse != null) {
							// view thread
#pragma warning disable VSTHRD103 // Call async methods when in an async method
							_browserService.Notify(new ShowStreamNotificationType {
								Params = new ShowStreamNotification {
									StreamId = stream.Id
								}
							});
#pragma warning restore VSTHRD103 // Call async methods when in an async method
						}
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, "Error inviting to Live Share");
			}
		}

		public Task JoinAsync(string url) {
			_ideService.Navigate(url);
			return Task.CompletedTask;
		}
	}
}
