﻿using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Extensions;
using CodeStream.VisualStudio.Services.Providers;
using EnvDTE;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio.Services {
	public interface SUserSettingsService { }

	public interface IUserSettingsService {
		bool TryGetValue<T>(string bucketName, string dataKey, out T val);
		void Save(string bucketName, string dataKey, object obj);
	}

	/// <summary>
	/// Saves settings based on the current solution file name
	/// </summary>
	public class UserSettingsService : SUserSettingsService, IUserSettingsService {
		private readonly IServiceProvider _serviceProvider;
		private readonly ISettingsProvider _settingsProvider;
		private static readonly ILogger Log = LogManager.ForContext<UserSettingsService>();
		public UserSettingsService(IServiceProvider serviceProvider) {
			_serviceProvider = serviceProvider;
			_settingsProvider = new ShellSettingsProvider(serviceProvider);
		}

		private const string CollectionName = "codestream";
		private const string PropertyFormat = "codestream.{0}";

		public bool TryGetValue<T>(string bucketName, string dataKey, out T val) {
			if (dataKey.IsNullOrWhiteSpace()) {
				val = default(T);
				return false;
			}
			try {
				System.Windows.Threading.Dispatcher.CurrentDispatcher.VerifyAccess();

				var settings = Load(bucketName);
				if (settings == null || settings.Data == null) {
					val = default(T);
					return false;
				}
				if (settings.Data.TryGetValue(dataKey.ToLowerInvariant(), out object value)) {

					if (value != null) {
						var jObject = value as JObject;
						if (jObject != null) {
							val = jObject.ToObject<T>();
							return true;
						}
					}

				}
			}
			catch (InvalidCastException ex) {
				val = default(T);
				return false;
			}
			catch (Exception ex) {
				Log.Warning($"{nameof(TryGetValue)} Key={dataKey}");
				val = default(T);
				return false;
			}
			val = default(T);
			return false;
		}

		public void Save(string bucketName, string dataKey, object obj) {
			string solutionName = null;
			string propertyName = null;
			try {
				System.Windows.Threading.Dispatcher.CurrentDispatcher.VerifyAccess();

				solutionName = GetSolutionName();
				if (solutionName.IsNullOrWhiteSpace()) {
					Log.Verbose($"{nameof(Save)} No solution name");
					return;
				}
				bucketName = bucketName.Replace("{{solutionName}}", solutionName);

				propertyName = string.Format(PropertyFormat, bucketName).ToLowerInvariant();
				var loaded = Load(bucketName);
				if (loaded == null) {
					loaded = new UserSettings { Data = new Dictionary<string, object>() };
				}

				if (loaded.Data.ContainsKey(dataKey) && obj == null) {
					loaded.Data.Remove(dataKey);
				}
				else {
					loaded.Data[dataKey] = obj;
				}

				_settingsProvider.SetString(CollectionName, propertyName, JsonConvert.SerializeObject(loaded));
				Log.Verbose($"{nameof(Save)} to {CollectionName}:{propertyName}");
			}
			catch (Exception ex) {
				Log.Error(ex, $"{nameof(Save)} Key={dataKey} SolutionName={solutionName} PropertyName={propertyName}");
			}
		}

		private UserSettings Load(string bucketName) {
			try {
				System.Windows.Threading.Dispatcher.CurrentDispatcher.VerifyAccess();

				var solutionName = GetSolutionName();
				if (solutionName.IsNullOrWhiteSpace()) return null;

				bucketName = bucketName.Replace("{{solutionName}}", solutionName);

				if (_settingsProvider.TryGetString(CollectionName, string.Format(PropertyFormat, bucketName),
					out string data)) {
					Log.Verbose($"{nameof(Load)} Loaded={data}");
					return JsonConvert.DeserializeObject<UserSettings>(data);
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(Load));
			}

			return new UserSettings {
				Data = new Dictionary<string, object>()
			};
		}

		private string GetSolutionName() {
			try {
				System.Windows.Threading.Dispatcher.CurrentDispatcher.VerifyAccess();

				var dte = (DTE)_serviceProvider.GetService(typeof(DTE));
				if (dte == null) return null;

				var solutionPath = dte.Solution.FullName;
				if (solutionPath.IsNullOrWhiteSpace()) return null;

				var solutionName = System.IO.Path.GetFileName(solutionPath).ToLowerInvariant();
				Log.Verbose($"{nameof(GetSolutionName)} : {solutionName}");
				return solutionName;
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetSolutionName));
			}

			return null;
		}
	}

	public class UserSettings {
		public Dictionary<string, object> Data { get; set; }
	}
}
