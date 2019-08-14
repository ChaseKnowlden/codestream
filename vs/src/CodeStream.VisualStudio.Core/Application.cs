﻿using System;
using System.IO;
using CodeStream.VisualStudio.Core.Properties;

namespace CodeStream.VisualStudio.Core
{
    public class Application
    {
        public const string Name = "CodeStream";

        /// <summary>
        /// Returns Major.Minor.Build for the Extension
        /// </summary>
        public static Version ExtensionVersionShort { get; }

        /// <summary>
        /// Returns a format like 1.2.3-4 if there is a revision number
        /// </summary>
        public static string ExtensionVersionSemVer { get; }

        /// <summary>
        /// Number of the build from CI
        /// </summary>
        public static int BuildNumber { get; }

        /// <summary>
        /// Environment where the build happened
        /// </summary>
        public static string BuildEnv { get; }

        /// <summary>
        /// Something like `Microsoft Visual Studio 2019`
        /// </summary>
        public static string VisualStudioName { get; }

        /// <summary>
        /// Short, abbreviated name for this IDE
        /// </summary>
        public static string IdeMoniker { get; } = "VS";

        /// <summary>
        /// Something like `15.9.123.4567`
        /// </summary>
        public static string VisualStudioVersionString { get; }

        /// <summary>
        /// Something like `15.9.123.4567`
        /// </summary>
        public static Version VisualStudioVersion { get; }

        public static string VisualStudioVersionYear { get; }

        /// <summary>
        /// Path to the log directory. C:\Users\{User}\AppData\Local\CodeStream\Logs\. Ends with a backslash.
        /// </summary>
        public static string LogPath { get; }

        /// <summary>
        /// C:\Users\{User}\AppData\Local\Temp\CodeStream\Data\. Ends with a backslash.
        /// </summary>
        public static string TempDataPath { get; }

		public static DeveloperSettings DeveloperOptions = new DeveloperSettings();

        static Application()
        {
            BuildEnv = SolutionInfo.BuildEnv;

            var versionFull = Version.Parse(SolutionInfo.Version);
            BuildNumber = versionFull.Revision;

            if (versionFull.Revision > 0)
            {
                ExtensionVersionSemVer = $"{versionFull.Major}.{versionFull.Minor}.{versionFull.Build}-{versionFull.Revision}";
            }
            else
            {
                ExtensionVersionSemVer = $"{versionFull.Major}.{versionFull.Minor}.{versionFull.Build}";
            }

            var fileVersionInfo = System.Diagnostics.Process.GetCurrentProcess().MainModule.FileVersionInfo;

            // Extension versions

            ExtensionVersionShort = new Version(versionFull.Major, versionFull.Minor, versionFull.Build);

            var localApplicationData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), Name);
            var tempData = Path.Combine(Path.GetTempPath(), Name);

            LogPath = Path.Combine(localApplicationData, "Logs") + @"\";
            TempDataPath = Path.Combine(tempData, "Data") + @"\";

            VisualStudioName = fileVersionInfo.FileDescription;
            VisualStudioVersionString = fileVersionInfo.ProductVersion;
            VisualStudioVersion= Version.Parse(fileVersionInfo.ProductVersion);

            if (VisualStudioVersion.Major == 15)
            {
                VisualStudioVersionYear = "2017";
            }
            else if (VisualStudioVersion.Major == 16)
            {
                VisualStudioVersionYear = "2019";
            }
        }

		public class DeveloperSettings {
			/// <summary>
			/// Run in the immediate window to enable or disable this
			/// </summary>
			public bool MuteIpcLogs { get; set; }
		}
	}
}
