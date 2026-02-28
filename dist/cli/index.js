#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/cli/index.ts
import { Command } from "commander";
import chalk7 from "chalk";
import { readFileSync as readFileSync4 } from "fs";
import { join as join6, dirname as dirname2 } from "path";
import { fileURLToPath } from "url";

// src/cli/commands/enhanced-setup.ts
import chalk3 from "chalk";
import inquirer from "inquirer";

// src/cli/config-manager.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";

// src/cli/platform-utils.ts
import { platform } from "os";
import { spawn } from "child_process";
function isWindows() {
  return platform() === "win32";
}
function isMacOS() {
  return platform() === "darwin";
}
function isLinux() {
  return platform() === "linux";
}
function crossPlatformSpawn(command, args = [], options = {}) {
  if (isWindows()) {
    if (command === "npm") {
      return spawn("npm.cmd", args, { ...options, shell: true });
    }
    if (command === "node") {
      return spawn("node.exe", args, options);
    }
    return spawn(command, args, { ...options, shell: true });
  }
  return spawn(command, args, options);
}
function killProcess(process2, signal = "SIGTERM") {
  if (isWindows()) {
    if (signal === "SIGTERM" || signal === "SIGINT") {
      process2.kill();
    } else {
      process2.kill(signal);
    }
  } else {
    process2.kill(signal);
  }
}
function getPlatformConfigDir() {
  if (isWindows()) {
    return process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  } else if (isMacOS()) {
    return process.env.HOME + "/Library/Application Support" || process.cwd();
  } else {
    return process.env.XDG_CONFIG_HOME || process.env.HOME + "/.config" || process.cwd();
  }
}

// src/cli/config-manager.ts
var ConfigManager = class {
  configDir;
  configPath;
  envPath;
  constructor(projectPath) {
    if (projectPath) {
      this.configDir = projectPath;
      this.configPath = join(projectPath, ".twenty-mcp.json");
      this.envPath = join(projectPath, ".env");
    } else {
      const platformConfigDir = getPlatformConfigDir();
      this.configDir = join(platformConfigDir, "twenty-mcp");
      this.configPath = join(this.configDir, "config.json");
      this.envPath = join(this.configDir, ".env");
    }
  }
  ensureConfigDir() {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }
  getDefaultConfig() {
    return {
      version: "1.1.0",
      installation: {
        installPath: process.cwd(),
        installedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      twenty: {},
      auth: {
        enabled: false,
        requireAuth: false
      },
      ipProtection: {
        enabled: false,
        allowlist: ["127.0.0.1"],
        trustedProxies: [],
        blockUnknownIPs: true
      },
      server: {
        port: 3e3,
        mode: "http",
        verbose: false
      },
      preferences: {
        autoStart: false,
        checkUpdates: true,
        telemetry: false
      }
    };
  }
  load() {
    if (!existsSync(this.configPath)) {
      return this.getDefaultConfig();
    }
    try {
      const configData = readFileSync(this.configPath, "utf8");
      const config = JSON.parse(configData);
      const defaultConfig = this.getDefaultConfig();
      return this.mergeConfigs(defaultConfig, config);
    } catch (error) {
      console.warn(chalk.yellow("\u26A0\uFE0F  Invalid config file, using defaults"));
      return this.getDefaultConfig();
    }
  }
  mergeConfigs(defaultConfig, userConfig) {
    return {
      version: userConfig.version || defaultConfig.version,
      installation: {
        ...defaultConfig.installation,
        ...userConfig.installation
      },
      twenty: {
        ...defaultConfig.twenty,
        ...userConfig.twenty
      },
      auth: {
        ...defaultConfig.auth,
        ...userConfig.auth
      },
      ipProtection: {
        ...defaultConfig.ipProtection,
        ...userConfig.ipProtection
      },
      server: {
        ...defaultConfig.server,
        ...userConfig.server
      },
      preferences: {
        ...defaultConfig.preferences,
        ...userConfig.preferences
      }
    };
  }
  save(config) {
    this.ensureConfigDir();
    config.installation.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const configData = JSON.stringify(config, null, 2);
      writeFileSync(this.configPath, configData, "utf8");
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : error}`);
    }
  }
  updateTwentyConfig(apiKey, baseUrl) {
    const config = this.load();
    config.twenty.apiKey = apiKey;
    config.twenty.baseUrl = baseUrl;
    this.save(config);
    this.syncToEnv(config);
  }
  updateAuthConfig(authConfig) {
    const config = this.load();
    config.auth = { ...config.auth, ...authConfig };
    this.save(config);
    this.syncToEnv(config);
  }
  updateIPProtectionConfig(ipConfig) {
    const config = this.load();
    config.ipProtection = { ...config.ipProtection, ...ipConfig };
    this.save(config);
    this.syncToEnv(config);
  }
  updateServerConfig(serverConfig) {
    const config = this.load();
    config.server = { ...config.server, ...serverConfig };
    this.save(config);
  }
  updatePreferences(preferences) {
    const config = this.load();
    config.preferences = { ...config.preferences, ...preferences };
    this.save(config);
  }
  // Sync configuration to .env file for backward compatibility
  syncToEnv(config) {
    const configData = config || this.load();
    const envVars = /* @__PURE__ */ new Map();
    if (configData.twenty.apiKey) {
      envVars.set("TWENTY_API_KEY", configData.twenty.apiKey);
    }
    if (configData.twenty.baseUrl) {
      envVars.set("TWENTY_BASE_URL", configData.twenty.baseUrl);
    }
    envVars.set("AUTH_ENABLED", configData.auth.enabled.toString());
    envVars.set("REQUIRE_AUTH", configData.auth.requireAuth.toString());
    if (configData.auth.provider) {
      envVars.set("AUTH_PROVIDER", configData.auth.provider);
    }
    if (configData.auth.clerkPublishableKey) {
      envVars.set("CLERK_PUBLISHABLE_KEY", configData.auth.clerkPublishableKey);
    }
    if (configData.auth.clerkSecretKey) {
      envVars.set("CLERK_SECRET_KEY", configData.auth.clerkSecretKey);
    }
    if (configData.auth.clerkDomain) {
      envVars.set("CLERK_DOMAIN", configData.auth.clerkDomain);
    }
    if (configData.auth.encryptionSecret) {
      envVars.set("API_KEY_ENCRYPTION_SECRET", configData.auth.encryptionSecret);
    }
    envVars.set("IP_PROTECTION_ENABLED", configData.ipProtection.enabled.toString());
    if (configData.ipProtection.allowlist.length > 0) {
      envVars.set("IP_ALLOWLIST", configData.ipProtection.allowlist.join(","));
    }
    if (configData.ipProtection.trustedProxies.length > 0) {
      envVars.set("TRUSTED_PROXIES", configData.ipProtection.trustedProxies.join(","));
    }
    envVars.set("IP_BLOCK_UNKNOWN", configData.ipProtection.blockUnknownIPs.toString());
    envVars.set("MCP_SERVER_URL", `http://localhost:${configData.server.port}`);
    let envContent = "";
    envVars.forEach((value, key) => {
      envContent += `${key}=${value}
`;
    });
    try {
      writeFileSync(this.envPath, envContent, "utf8");
    } catch (error) {
      console.warn(chalk.yellow("\u26A0\uFE0F  Could not write .env file"));
    }
  }
  // Load environment variables into current process
  loadEnv() {
    if (!existsSync(this.envPath)) {
      return;
    }
    try {
      const envContent = readFileSync(this.envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          process.env[match[1]] = match[2];
        }
      });
    } catch (error) {
      console.warn(chalk.yellow("\u26A0\uFE0F  Could not load .env file"));
    }
  }
  getConfigPath() {
    return this.configPath;
  }
  getEnvPath() {
    return this.envPath;
  }
  exists() {
    return existsSync(this.configPath);
  }
  reset() {
    const defaultConfig = this.getDefaultConfig();
    this.save(defaultConfig);
    this.syncToEnv(defaultConfig);
  }
  // Import from existing .env file
  importFromEnv() {
    const config = this.getDefaultConfig();
    if (!existsSync(this.envPath)) {
      return config;
    }
    try {
      const envContent = readFileSync(this.envPath, "utf8");
      const envVars = /* @__PURE__ */ new Map();
      envContent.split("\n").forEach((line) => {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          envVars.set(match[1], match[2]);
        }
      });
      if (envVars.has("TWENTY_API_KEY")) {
        config.twenty.apiKey = envVars.get("TWENTY_API_KEY");
      }
      if (envVars.has("TWENTY_BASE_URL")) {
        config.twenty.baseUrl = envVars.get("TWENTY_BASE_URL");
      }
      if (envVars.has("AUTH_ENABLED")) {
        config.auth.enabled = envVars.get("AUTH_ENABLED") === "true";
      }
      if (envVars.has("REQUIRE_AUTH")) {
        config.auth.requireAuth = envVars.get("REQUIRE_AUTH") === "true";
      }
      if (envVars.has("CLERK_PUBLISHABLE_KEY")) {
        config.auth.clerkPublishableKey = envVars.get("CLERK_PUBLISHABLE_KEY");
      }
      if (envVars.has("CLERK_SECRET_KEY")) {
        config.auth.clerkSecretKey = envVars.get("CLERK_SECRET_KEY");
      }
      if (envVars.has("IP_PROTECTION_ENABLED")) {
        config.ipProtection.enabled = envVars.get("IP_PROTECTION_ENABLED") === "true";
      }
      if (envVars.has("IP_ALLOWLIST")) {
        const allowlist = envVars.get("IP_ALLOWLIST");
        if (allowlist) {
          config.ipProtection.allowlist = allowlist.split(",").map((ip) => ip.trim());
        }
      }
      this.save(config);
      return config;
    } catch (error) {
      console.warn(chalk.yellow("\u26A0\uFE0F  Could not import from .env file"));
      return config;
    }
  }
};

// src/cli/commands/enhanced-setup.ts
import crypto from "crypto";
import { isIP } from "node:net";

// src/cli/utils/execution-context.ts
import { existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
function detectExecutionContext() {
  const env = extractNPXEnvironment();
  if (isNPXExecution(env)) {
    return {
      type: "npx",
      isTemporary: true,
      packageCached: checkNPMCache(env),
      npmCacheDir: env.npmConfigCache,
      installLocation: "temporary"
    };
  }
  if (isGlobalInstallation()) {
    return {
      type: "global",
      isTemporary: false,
      packageCached: false,
      installLocation: getGlobalInstallPath()
    };
  }
  return {
    type: "local",
    isTemporary: false,
    packageCached: false,
    installLocation: process.cwd()
  };
}
function extractNPXEnvironment() {
  return {
    npmExecPath: process.env.npm_execpath,
    npmCommand: process.env.npm_command,
    npmConfigCache: process.env.npm_config_cache,
    initCwd: process.env.INIT_CWD,
    npmLifecycleEvent: process.env.npm_lifecycle_event
  };
}
function isNPXExecution(env) {
  const indicators = [
    // npm_command is 'exec' when using npx
    env.npmCommand === "exec",
    // npm_execpath contains 'npx' in the path
    env.npmExecPath && env.npmExecPath.includes("npx"),
    // Check for npx-specific environment patterns
    env.npmExecPath && env.npmExecPath.includes("_npx"),
    // Alternative detection for newer npm versions
    process.env.npm_config_user_config?.includes("npx"),
    // Process arguments analysis
    process.argv[1] && process.argv[1].includes("_npx")
  ];
  return indicators.some((indicator) => indicator === true);
}
function isGlobalInstallation() {
  const execPath = process.argv[1];
  if (!execPath) return false;
  const globalPaths = getGlobalNodeModulesPaths();
  return globalPaths.some((globalPath) => execPath.includes(globalPath));
}
function getGlobalNodeModulesPaths() {
  const paths = [];
  if (isWindows()) {
    paths.push(
      "node_modules\\.bin",
      "AppData\\Roaming\\npm\\node_modules",
      "Program Files\\nodejs\\node_modules"
    );
  } else if (isMacOS()) {
    paths.push(
      "/usr/local/lib/node_modules",
      "/usr/local/bin",
      "/opt/homebrew/lib/node_modules",
      "/opt/homebrew/bin"
    );
  } else if (isLinux()) {
    paths.push(
      "/usr/lib/node_modules",
      "/usr/local/lib/node_modules",
      "/usr/bin",
      "/usr/local/bin"
    );
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    paths.push(
      join2(homeDir, ".nvm"),
      join2(homeDir, ".nodenv"),
      join2(homeDir, ".node_modules")
    );
  }
  return paths;
}
function checkNPMCache(env) {
  if (!env.npmConfigCache) {
    return false;
  }
  try {
    const cachePath = join2(env.npmConfigCache, "_npx");
    const packageCachePath = join2(cachePath, "twenty-mcp-server");
    return existsSync2(packageCachePath);
  } catch {
    return false;
  }
}
function getGlobalInstallPath() {
  try {
    const execPath = process.argv[1];
    if (!execPath) return void 0;
    const globalPaths = getGlobalNodeModulesPaths();
    const matchingPath = globalPaths.find((path) => execPath.includes(path));
    return matchingPath ? execPath : void 0;
  } catch {
    return void 0;
  }
}
function validateExecutionContext(context) {
  if (!["global", "npx", "local"].includes(context.type)) {
    return false;
  }
  if (context.type === "npx" && !context.isTemporary) {
    return false;
  }
  if (context.type === "global" && context.isTemporary) {
    return false;
  }
  return true;
}
var cachedContext = null;
function getExecutionContext() {
  if (cachedContext === null) {
    cachedContext = detectExecutionContext();
    if (!validateExecutionContext(cachedContext)) {
      cachedContext = {
        type: "local",
        isTemporary: false,
        packageCached: false,
        installLocation: process.cwd()
      };
    }
  }
  return cachedContext;
}

// src/cli/utils/npx-helpers.ts
import chalk2 from "chalk";
function showNPXWelcome(context) {
  if (context.type !== "npx") return;
  console.log(chalk2.bold.cyan("\u{1F680} Welcome to Twenty MCP Server Trial!"));
  console.log(chalk2.gray("You're trying this tool without installing it globally.\n"));
  if (context.packageCached) {
    console.log(chalk2.green("\u2705 Running from npm cache (faster startup)"));
  } else {
    console.log(chalk2.yellow("\u{1F4E6} First run - package downloaded successfully"));
  }
  console.log(chalk2.cyan("\n\u{1F4A1} Key Benefits of npx usage:"));
  console.log(chalk2.gray("  \u2022 No global installation required"));
  console.log(chalk2.gray("  \u2022 Always runs the latest version"));
  console.log(chalk2.gray("  \u2022 Configuration persists between runs"));
  console.log(chalk2.gray("  \u2022 Perfect for trying before committing\n"));
  console.log(chalk2.yellow("\u{1F4AB} Like this tool? Install permanently:"));
  console.log(chalk2.cyan("   npm install -g twenty-mcp-server"));
  console.log(chalk2.gray("   Then use: twenty-mcp [command]\n"));
}
function showContextHeader(context) {
  switch (context.type) {
    case "npx":
      showNPXHeader(context);
      break;
    case "global":
      showGlobalHeader();
      break;
    case "local":
      showLocalHeader();
      break;
  }
}
function showNPXHeader(context) {
  console.log(chalk2.blue("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"));
  console.log(chalk2.blue("\u2502") + chalk2.bold.yellow("              Twenty MCP Server (via npx)               ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2502") + chalk2.gray("            Trying temporarily - no installation           ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
  if (context.packageCached) {
    console.log(chalk2.green("\u2705 Running from npm cache (faster startup)"));
  } else {
    console.log(chalk2.yellow("\u{1F4E6} First run - downloading package..."));
  }
  console.log("");
}
function showGlobalHeader() {
  console.log(chalk2.blue("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"));
  console.log(chalk2.blue("\u2502") + chalk2.bold.white("                   Twenty MCP Server                    ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2502") + chalk2.gray("         Model Context Protocol for Twenty CRM          ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
  console.log("");
}
function showLocalHeader() {
  console.log(chalk2.blue("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"));
  console.log(chalk2.blue("\u2502") + chalk2.bold.magenta("           Twenty MCP Server (Development)             ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2502") + chalk2.gray("         Model Context Protocol for Twenty CRM          ") + chalk2.blue("\u2502"));
  console.log(chalk2.blue("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
  console.log("");
}
function showContextualQuickStart(context) {
  console.log(chalk2.bold.yellow("\u{1F680} Quick Start:"));
  console.log("");
  switch (context.type) {
    case "npx":
      showNPXQuickStart();
      break;
    case "global":
      showGlobalQuickStart();
      break;
    case "local":
      showLocalQuickStart();
      break;
  }
}
function showNPXQuickStart() {
  console.log("  1. " + chalk2.cyan("npx twenty-mcp-server setup") + "  - Configure (saves globally)");
  console.log("  2. " + chalk2.cyan("npx twenty-mcp-server test") + "   - Test configuration");
  console.log("  3. " + chalk2.cyan("npx twenty-mcp-server start") + "  - Start server");
  console.log("");
  console.log(chalk2.yellow("\u{1F4A1} Install globally for easier access:"));
  console.log("    " + chalk2.cyan("npm install -g twenty-mcp-server"));
  console.log("    Then use: " + chalk2.cyan("twenty-mcp [command]"));
}
function showGlobalQuickStart() {
  console.log("  1. " + chalk2.cyan("twenty-mcp setup") + "     - Configure your server");
  console.log("  2. " + chalk2.cyan("twenty-mcp test") + "      - Validate configuration");
  console.log("  3. " + chalk2.cyan("twenty-mcp start") + "     - Start the server");
}
function showLocalQuickStart() {
  console.log("  1. " + chalk2.cyan("npm run build") + "       - Build the project");
  console.log("  2. " + chalk2.cyan("twenty-mcp setup") + "     - Configure your server");
  console.log("  3. " + chalk2.cyan("twenty-mcp start") + "     - Start the server");
  console.log("");
  console.log(chalk2.gray("\u{1F4BB} Development mode detected"));
}
function showContextualHelp(context) {
  showContextualQuickStart(context);
  console.log("");
  console.log(chalk2.bold.yellow("\u{1F4DA} Commands:"));
  console.log("");
  const commandPrefix = context.type === "npx" ? "npx twenty-mcp-server" : "twenty-mcp";
  console.log(`  ${chalk2.cyan(commandPrefix + " setup")}      - Interactive setup wizard`);
  console.log(`  ${chalk2.cyan(commandPrefix + " start")}      - Start the MCP server`);
  console.log(`  ${chalk2.cyan(commandPrefix + " test")}       - Test configuration and connection`);
  console.log(`  ${chalk2.cyan(commandPrefix + " status")}     - Show server status`);
  console.log(`  ${chalk2.cyan(commandPrefix + " help")}       - Show detailed help`);
  console.log("");
  console.log(chalk2.bold.yellow("\u{1F517} Resources:"));
  console.log("");
  console.log("  Documentation: " + chalk2.underline("https://github.com/jezweb/twenty-mcp#readme"));
  console.log("  Issues: " + chalk2.underline("https://github.com/jezweb/twenty-mcp/issues"));
  console.log("  Twenty CRM: " + chalk2.underline("https://twenty.com"));
  if (context.type === "npx") {
    console.log("");
    console.log(chalk2.yellow("\u{1F3AF} Running via npx:"));
    console.log("  \u2022 Configuration will be saved globally for future npx runs");
    console.log("  \u2022 No global installation required");
    console.log("  \u2022 Consider installing globally if you use this frequently");
  }
}
function showNPXCompletion() {
  console.log(chalk2.bold.green("\u{1F389} npx Trial Complete!"));
  console.log(chalk2.gray("Your configuration has been saved for future npx runs.\n"));
  console.log(chalk2.bold.yellow("\u{1F680} Next Steps:"));
  console.log(chalk2.cyan("  \u2022 npx twenty-mcp-server start") + chalk2.gray(" - Start using your configured server"));
  console.log(chalk2.cyan("  \u2022 npm install -g twenty-mcp-server") + chalk2.gray(" - Install permanently"));
  console.log(chalk2.gray("  \u2022 Share with your team - they can try it instantly with npx!\n"));
  console.log(chalk2.bold.yellow("\u{1F4AB} Benefits of Global Install:"));
  console.log(chalk2.gray("  \u2022 Faster startup (no download wait)"));
  console.log(chalk2.gray("  \u2022 Shorter commands (twenty-mcp vs npx twenty-mcp-server)"));
  console.log(chalk2.gray("  \u2022 Works offline"));
  console.log(chalk2.gray("  \u2022 Better IDE integration\n"));
}
function explainNPXConfiguration() {
  console.log(chalk2.bold.blue("\u{1F4CB} Configuration Note for npx Users:"));
  console.log(chalk2.gray("Your settings are saved globally and will persist between npx runs."));
  console.log(chalk2.gray("This means you only need to configure once, even when using npx!\n"));
  console.log(chalk2.yellow("\u{1F50D} Configuration Location:"));
  console.log(chalk2.gray("  \u2022 Windows: %APPDATA%\\twenty-mcp\\config.json"));
  console.log(chalk2.gray("  \u2022 macOS: ~/Library/Application Support/twenty-mcp/config.json"));
  console.log(chalk2.gray("  \u2022 Linux: ~/.config/twenty-mcp/config.json\n"));
}
function showNPXPerformanceTip(context) {
  if (context.type !== "npx") return;
  if (!context.packageCached) {
    console.log(chalk2.yellow("\u{1F4A1} Performance Tip:"));
    console.log(chalk2.gray("This was your first npx run, so the package was downloaded."));
    console.log(chalk2.gray("Subsequent npx runs will be much faster (cached)!\n"));
  }
}

// src/cli/commands/enhanced-setup.ts
async function enhancedSetupCommand(options) {
  const executionContext2 = getExecutionContext();
  if (executionContext2.type === "npx") {
    console.log(chalk3.bold.green("\u{1F6E0}\uFE0F  Twenty MCP Server Setup (via npx)"));
    console.log(chalk3.gray("Configure your Twenty MCP Server - settings will be saved globally\n"));
  } else {
    console.log(chalk3.bold.green("\u{1F6E0}\uFE0F  Twenty MCP Server Enhanced Setup Wizard"));
    console.log(chalk3.gray("Professional configuration for your Twenty MCP Server\n"));
  }
  try {
    const useGlobal = executionContext2.type === "npx" ? true : options.global || false;
    const configManager = new ConfigManager(useGlobal ? void 0 : process.cwd());
    let config;
    if (options.reset) {
      return await resetConfiguration(configManager);
    }
    if (options.import) {
      return await importExistingConfig(configManager);
    }
    if (configManager.exists()) {
      console.log(chalk3.blue("\u{1F4CB} Existing configuration found"));
      const shouldUpdate = await confirmUpdate();
      if (!shouldUpdate) {
        console.log(chalk3.gray("Setup cancelled"));
        return;
      }
      config = configManager.load();
    } else {
      console.log(chalk3.blue("\u{1F195} Creating new configuration"));
      config = configManager.load();
    }
    await showWelcome(executionContext2);
    config = await setupTwentyCRM(config);
    if (options.oauth || await shouldSetupFeature("OAuth 2.1 Authentication", "Secure multi-user access")) {
      config = await setupAuthentication(config);
    }
    if (options.ipProtection || await shouldSetupFeature("IP Address Protection", "Network-level access control")) {
      config = await setupIPProtection(config);
    }
    config = await setupServerSettings(config);
    config = await setupUserPreferences(config);
    await saveConfiguration(configManager, config);
    if (!options.skipTests) {
      await testConfiguration(configManager);
    }
    await showCompletion(config, configManager, executionContext2);
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_CANCELLED") {
      console.log(chalk3.yellow("\n\u26A0\uFE0F  Setup cancelled by user"));
      return;
    }
    console.error(chalk3.red("\n\u274C Setup failed:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
async function confirmUpdate() {
  const { update } = await inquirer.prompt([
    {
      type: "confirm",
      name: "update",
      message: "Update existing configuration?",
      default: true
    }
  ]);
  return update;
}
async function showWelcome(executionContext2) {
  if (executionContext2.type === "npx") {
    console.log(chalk3.bold.cyan("\n\u{1F389} Welcome to Twenty MCP Server Setup!"));
    console.log(chalk3.gray("\nYou're configuring Twenty MCP Server via npx - perfect for trying it out!"));
    console.log(chalk3.gray("Your configuration will be saved globally and persist between npx runs.\n"));
    explainNPXConfiguration();
  } else {
    console.log(chalk3.bold.cyan("\n\u{1F389} Welcome to Twenty MCP Server Setup!"));
    console.log(chalk3.gray("\nThis wizard will help you configure your Twenty CRM integration for AI assistants."));
    console.log(chalk3.gray("We'll walk through each feature and explain the benefits.\n"));
  }
  const { ready } = await inquirer.prompt([
    {
      type: "confirm",
      name: "ready",
      message: "Ready to begin?",
      default: true
    }
  ]);
  if (!ready) {
    throw new Error("SETUP_CANCELLED");
  }
}
async function shouldSetupFeature(featureName, description) {
  console.log(chalk3.bold.blue(`
\u{1F914} ${featureName}`));
  console.log(chalk3.gray(description + "\n"));
  const { enable } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enable",
      message: `Configure ${featureName}?`,
      default: false
    }
  ]);
  return enable;
}
async function setupTwentyCRM(config) {
  console.log(chalk3.bold.blue("\n\u{1F4CB} Step 1: Twenty CRM Connection"));
  console.log(chalk3.gray("Connect your Twenty CRM instance for AI assistant access\n"));
  console.log(chalk3.yellow("\u{1F4DA} How to get your Twenty API key:"));
  console.log("  1. Open your Twenty CRM instance");
  console.log("  2. Go to Settings \u2192 Developers \u2192 API Keys");
  console.log("  3. Create a new API key");
  console.log("  4. Copy the key (it won't be shown again!)\n");
  const questions = [
    {
      type: "input",
      name: "apiKey",
      message: "Twenty API Key:",
      default: config.twenty.apiKey,
      validate: (input) => {
        if (!input.trim()) return "API key is required";
        if (!input.startsWith("eyJ")) return 'API key should be a JWT token starting with "eyJ"';
        return true;
      }
    },
    {
      type: "list",
      name: "baseUrlChoice",
      message: "Twenty instance type:",
      choices: [
        { name: "Twenty Cloud (https://api.twenty.com)", value: "cloud" },
        { name: "Self-hosted instance", value: "self" },
        { name: "Local development (localhost)", value: "local" }
      ],
      default: config.twenty.baseUrl === "https://api.twenty.com" ? "cloud" : config.twenty.baseUrl?.includes("localhost") ? "local" : "self"
    }
  ];
  const answers = await inquirer.prompt(questions);
  let baseUrl = "";
  if (answers.baseUrlChoice === "cloud") {
    baseUrl = "https://api.twenty.com";
  } else if (answers.baseUrlChoice === "local") {
    const { port } = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: "Local port:",
        default: "3000",
        validate: (input) => {
          const port2 = parseInt(input, 10);
          return port2 > 0 && port2 < 65536 ? true : "Please enter a valid port number";
        }
      }
    ]);
    baseUrl = `http://localhost:${port}`;
  } else {
    const { customUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "customUrl",
        message: "Your Twenty instance URL:",
        default: config.twenty.baseUrl,
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return "Please enter a valid URL";
          }
        }
      }
    ]);
    baseUrl = customUrl;
  }
  config.twenty.apiKey = answers.apiKey;
  config.twenty.baseUrl = baseUrl;
  console.log(chalk3.green("\u2705 Twenty CRM configured"));
  return config;
}
async function setupAuthentication(config) {
  console.log(chalk3.bold.blue("\n\u{1F510} Step 2: OAuth 2.1 Authentication"));
  console.log(chalk3.gray("Secure, user-specific access to your Twenty CRM\n"));
  console.log(chalk3.yellow("\u{1F3AF} Benefits of OAuth Authentication:"));
  console.log("  \u2713 Each user has their own secure access");
  console.log("  \u2713 No shared API keys - better security");
  console.log("  \u2713 Easy user management via Clerk dashboard");
  console.log("  \u2713 Industry-standard OAuth 2.1 protocol");
  console.log("  \u2713 API keys encrypted at rest\n");
  const { setupAuth } = await inquirer.prompt([
    {
      type: "confirm",
      name: "setupAuth",
      message: "Enable OAuth authentication?",
      default: config.auth.enabled
    }
  ]);
  if (!setupAuth) {
    config.auth.enabled = false;
    console.log(chalk3.gray("OAuth authentication disabled"));
    return config;
  }
  console.log(chalk3.yellow("\n\u{1F4DA} Setting up Clerk (Free tier available):"));
  console.log("  1. Visit: https://dashboard.clerk.com/apps");
  console.log("  2. Create an app or select existing");
  console.log('  3. Go to "API Keys" in sidebar');
  console.log("  4. Copy both keys below\n");
  const authQuestions = [
    {
      type: "input",
      name: "publishableKey",
      message: "Clerk Publishable Key (pk_test_... or pk_live_...):",
      default: config.auth.clerkPublishableKey,
      validate: (input) => {
        if (!input.startsWith("pk_")) return 'Publishable key should start with "pk_"';
        return true;
      }
    },
    {
      type: "input",
      name: "secretKey",
      message: "Clerk Secret Key (sk_test_... or sk_live_...):",
      default: config.auth.clerkSecretKey,
      validate: (input) => {
        if (!input.startsWith("sk_")) return 'Secret key should start with "sk_"';
        return true;
      }
    },
    {
      type: "list",
      name: "authMode",
      message: "Authentication mode:",
      choices: [
        {
          name: "Flexible - Allow both OAuth and direct API key access",
          value: "flexible",
          short: "Flexible"
        },
        {
          name: "Strict - Require OAuth login before API key access",
          value: "strict",
          short: "Strict"
        }
      ],
      default: config.auth.requireAuth ? "strict" : "flexible"
    }
  ];
  const authAnswers = await inquirer.prompt(authQuestions);
  config.auth.enabled = true;
  config.auth.clerkPublishableKey = authAnswers.publishableKey;
  config.auth.clerkSecretKey = authAnswers.secretKey;
  config.auth.requireAuth = authAnswers.authMode === "strict";
  config.auth.provider = "clerk";
  if (!config.auth.encryptionSecret) {
    config.auth.encryptionSecret = crypto.randomBytes(32).toString("hex");
  }
  const domain = authAnswers.publishableKey.split("pk_test_")[1] || authAnswers.publishableKey.split("pk_live_")[1];
  if (domain) {
    config.auth.clerkDomain = domain.replace(/\$$/, "") + ".clerk.accounts.dev";
  }
  console.log(chalk3.green("\u2705 OAuth authentication configured"));
  return config;
}
async function setupIPProtection(config) {
  console.log(chalk3.bold.blue("\n\u{1F6E1}\uFE0F  Step 3: IP Address Protection"));
  console.log(chalk3.gray("Network-level security for your MCP server\n"));
  console.log(chalk3.yellow("\u{1F3AF} Benefits of IP Protection:"));
  console.log("  \u2713 Restrict access to known networks");
  console.log("  \u2713 Block unauthorized connections");
  console.log("  \u2713 Corporate network security");
  console.log("  \u2713 VPN-only access control\n");
  const { enableIP } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableIP",
      message: "Enable IP address protection?",
      default: config.ipProtection.enabled
    }
  ]);
  if (!enableIP) {
    config.ipProtection.enabled = false;
    console.log(chalk3.gray("IP protection disabled"));
    return config;
  }
  console.log(chalk3.yellow("\n\u{1F4CB} IP Configuration Examples:"));
  console.log("  \u2022 Single IP: 192.168.1.100");
  console.log("  \u2022 CIDR range: 192.168.1.0/24");
  console.log("  \u2022 IPv6: 2001:db8::/32");
  console.log("  \u2022 Note: 127.0.0.1 (localhost) is always allowed\n");
  const ipQuestions = [
    {
      type: "input",
      name: "allowedIPs",
      message: "Allowed IP addresses/CIDR blocks (comma-separated):",
      default: config.ipProtection.allowlist.join(","),
      filter: (input) => input.split(",").map((ip) => ip.trim()).filter((ip) => ip),
      validate: (input) => {
        const invalid = input.filter((ip) => !validateIPOrCIDR(ip));
        if (invalid.length > 0) {
          return `Invalid IP/CIDR format: ${invalid.join(", ")}`;
        }
        return true;
      }
    },
    {
      type: "confirm",
      name: "setupProxies",
      message: "Configure trusted reverse proxies?",
      default: config.ipProtection.trustedProxies.length > 0
    }
  ];
  const ipAnswers = await inquirer.prompt(ipQuestions);
  config.ipProtection.enabled = true;
  config.ipProtection.allowlist = ipAnswers.allowedIPs;
  if (ipAnswers.setupProxies) {
    const { trustedProxies } = await inquirer.prompt([
      {
        type: "input",
        name: "trustedProxies",
        message: "Trusted proxy IPs (comma-separated, optional):",
        default: config.ipProtection.trustedProxies.join(","),
        filter: (input) => input ? input.split(",").map((ip) => ip.trim()).filter((ip) => ip) : [],
        validate: (input) => {
          if (input.length === 0) return true;
          const invalid = input.filter((ip) => !validateIPOrCIDR(ip));
          if (invalid.length > 0) {
            return `Invalid proxy IP format: ${invalid.join(", ")}`;
          }
          return true;
        }
      }
    ]);
    config.ipProtection.trustedProxies = trustedProxies;
  }
  const { blockUnknown } = await inquirer.prompt([
    {
      type: "confirm",
      name: "blockUnknown",
      message: "Block connections when client IP cannot be determined?",
      default: config.ipProtection.blockUnknownIPs
    }
  ]);
  config.ipProtection.blockUnknownIPs = blockUnknown;
  console.log(chalk3.green("\u2705 IP protection configured"));
  return config;
}
async function setupServerSettings(config) {
  console.log(chalk3.bold.blue("\n\u2699\uFE0F  Step 4: Server Configuration"));
  console.log(chalk3.gray("Configure how your MCP server runs\n"));
  const serverQuestions = [
    {
      type: "list",
      name: "mode",
      message: "Default server mode:",
      choices: [
        { name: "HTTP Server - Web-based access, easier debugging", value: "http" },
        { name: "Stdio - Direct protocol communication", value: "stdio" }
      ],
      default: config.server.mode
    },
    {
      type: "input",
      name: "port",
      message: "HTTP server port:",
      default: config.server.port.toString(),
      when: (answers) => answers.mode === "http",
      validate: (input) => {
        const port = parseInt(input, 10);
        return port > 0 && port < 65536 ? true : "Please enter a valid port number";
      }
    },
    {
      type: "confirm",
      name: "verbose",
      message: "Enable verbose logging by default?",
      default: config.server.verbose
    }
  ];
  const serverAnswers = await inquirer.prompt(serverQuestions);
  config.server.mode = serverAnswers.mode;
  config.server.port = serverAnswers.port ? parseInt(serverAnswers.port, 10) : config.server.port;
  config.server.verbose = serverAnswers.verbose;
  console.log(chalk3.green("\u2705 Server settings configured"));
  return config;
}
async function setupUserPreferences(config) {
  console.log(chalk3.bold.blue("\n\u{1F39B}\uFE0F  Step 5: User Preferences"));
  console.log(chalk3.gray("Customize your Twenty MCP experience\n"));
  const prefQuestions = [
    {
      type: "confirm",
      name: "autoStart",
      message: "Auto-start server when running commands?",
      default: config.preferences.autoStart
    },
    {
      type: "confirm",
      name: "checkUpdates",
      message: "Check for updates automatically?",
      default: config.preferences.checkUpdates
    },
    {
      type: "confirm",
      name: "telemetry",
      message: "Send anonymous usage telemetry to help improve the project?",
      default: config.preferences.telemetry
    }
  ];
  const prefAnswers = await inquirer.prompt(prefQuestions);
  config.preferences.autoStart = prefAnswers.autoStart;
  config.preferences.checkUpdates = prefAnswers.checkUpdates;
  config.preferences.telemetry = prefAnswers.telemetry;
  console.log(chalk3.green("\u2705 User preferences configured"));
  return config;
}
async function saveConfiguration(configManager, config) {
  console.log(chalk3.bold.blue("\n\u{1F4BE} Saving Configuration"));
  try {
    configManager.save(config);
    configManager.syncToEnv(config);
    console.log(chalk3.green("\u2705 Configuration saved successfully"));
    console.log(chalk3.gray(`  Config: ${configManager.getConfigPath()}`));
    console.log(chalk3.gray(`  Environment: ${configManager.getEnvPath()}`));
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : error}`);
  }
}
async function testConfiguration(configManager) {
  console.log(chalk3.bold.blue("\n\u{1F9EA} Testing Configuration"));
  configManager.loadEnv();
  return new Promise((resolve) => {
    const testProcess = crossPlatformSpawn("npm", ["run", "validate"], {
      stdio: "pipe",
      cwd: process.cwd()
    });
    let output = "";
    testProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });
    testProcess.stderr?.on("data", (data) => {
      output += data.toString();
    });
    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk3.green("\u2705 Configuration test passed"));
      } else {
        console.log(chalk3.yellow("\u26A0\uFE0F  Configuration test had issues, but setup completed"));
        console.log(chalk3.gray('Run "twenty-mcp test" for detailed diagnostics'));
      }
      resolve();
    });
    testProcess.on("error", (error) => {
      console.log(chalk3.yellow("\u26A0\uFE0F  Could not run configuration test"));
      resolve();
    });
  });
}
async function showCompletion(config, configManager, executionContext2) {
  if (executionContext2.type === "npx") {
    showNPXCompletion();
  } else {
    console.log(chalk3.bold.green("\n\u{1F389} Setup Complete!"));
    console.log(chalk3.gray("Your Twenty MCP Server is professionally configured\n"));
  }
  console.log(chalk3.bold.yellow("\u{1F4CB} Configuration Summary:"));
  console.log(`  Twenty CRM: ${chalk3.green("\u2713")} ${config.twenty.baseUrl}`);
  console.log(`  OAuth Auth: ${config.auth.enabled ? chalk3.green("\u2713 Enabled") : chalk3.gray("\u2717 Disabled")}`);
  console.log(`  IP Protection: ${config.ipProtection.enabled ? chalk3.green("\u2713 Enabled") : chalk3.gray("\u2717 Disabled")}`);
  console.log(`  Server Mode: ${chalk3.blue(config.server.mode.toUpperCase())}`);
  console.log(`  Port: ${chalk3.blue(config.server.port)}
`);
  const commandPrefix = executionContext2.type === "npx" ? "npx twenty-mcp-server" : "twenty-mcp";
  if (executionContext2.type !== "npx") {
    console.log(chalk3.bold.yellow("\u{1F680} Next Steps:"));
    console.log(chalk3.cyan(`  1. ${commandPrefix} test`) + chalk3.gray("     - Test your configuration"));
    console.log(chalk3.cyan(`  2. ${commandPrefix} start`) + chalk3.gray("    - Start the server"));
    console.log(chalk3.cyan(`  3. ${commandPrefix} status`) + chalk3.gray("   - Check server status\n"));
    console.log(chalk3.bold.yellow("\u{1F4BB} IDE Integration:"));
    console.log(chalk3.gray("  Use this path in your IDE configuration:"));
    console.log(chalk3.cyan(`  ${process.cwd()}/dist/index.js
`));
  }
  console.log(chalk3.bold.yellow("\u{1F4DA} Resources:"));
  console.log(chalk3.gray("  \u2022 Configuration file: ") + chalk3.cyan(configManager.getConfigPath()));
  console.log(chalk3.gray("  \u2022 Environment file: ") + chalk3.cyan(configManager.getEnvPath()));
  console.log(chalk3.gray("  \u2022 Documentation: README.md"));
  console.log(chalk3.gray("  \u2022 Tool reference: TOOLS.md\n"));
  if (config.auth.enabled) {
    console.log(chalk3.bold.yellow("\u{1F510} OAuth Setup:"));
    console.log(chalk3.gray(`  \u2022 Test OAuth: ${commandPrefix} test --oauth`));
    console.log(chalk3.gray("  \u2022 OAuth docs: OAUTH.md\n"));
  }
}
function validateIPOrCIDR(input) {
  if (input.includes("/")) {
    const [ip, prefix] = input.split("/");
    const prefixNum = parseInt(prefix, 10);
    if (isNaN(prefixNum)) return false;
    const ipVersion = isIP(ip);
    if (ipVersion === 4) {
      return prefixNum >= 0 && prefixNum <= 32;
    } else if (ipVersion === 6) {
      return prefixNum >= 0 && prefixNum <= 128;
    }
    return false;
  } else {
    return isIP(input) !== 0;
  }
}
async function resetConfiguration(configManager) {
  console.log(chalk3.bold.red("\u{1F504} Reset Configuration"));
  console.log(chalk3.gray("This will reset all settings to defaults\n"));
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to reset all configuration?",
      default: false
    }
  ]);
  if (!confirm) {
    console.log(chalk3.gray("Reset cancelled"));
    return;
  }
  configManager.reset();
  console.log(chalk3.green("\u2705 Configuration reset to defaults"));
}
async function importExistingConfig(configManager) {
  console.log(chalk3.bold.blue("\u{1F4E5} Import Existing Configuration"));
  console.log(chalk3.gray("Import settings from existing .env file\n"));
  const config = configManager.importFromEnv();
  console.log(chalk3.green("\u2705 Configuration imported from .env file"));
  console.log(chalk3.yellow("\nImported settings:"));
  if (config.twenty.apiKey) console.log(chalk3.gray("  \u2022 Twenty API Key"));
  if (config.twenty.baseUrl) console.log(chalk3.gray(`  \u2022 Base URL: ${config.twenty.baseUrl}`));
  if (config.auth.enabled) console.log(chalk3.gray("  \u2022 OAuth authentication"));
  if (config.ipProtection.enabled) console.log(chalk3.gray("  \u2022 IP protection"));
}

// src/cli/commands/start.ts
import chalk4 from "chalk";
import { existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";
async function startCommand(options) {
  console.log(chalk4.bold.green("\u{1F680} Starting Twenty MCP Server"));
  const distPath = join3(process.cwd(), "dist");
  if (!existsSync3(distPath)) {
    console.log(chalk4.yellow("\u26A0\uFE0F  Project not built. Building now..."));
    await buildProject();
  }
  const envPath = join3(process.cwd(), ".env");
  if (!existsSync3(envPath)) {
    console.log(chalk4.red('\u274C No configuration found. Run "twenty-mcp setup" first.'));
    process.exit(1);
  }
  const mode = options.stdio ? "stdio" : "http";
  const port = options.port || "3000";
  console.log(chalk4.gray(`Starting server in ${mode} mode...`));
  if (options.verbose) {
    process.env.DEBUG = "twenty-mcp:*";
  }
  const serverScript = options.stdio ? "dist/index.js" : "dist/http-server.js";
  const serverPath = join3(process.cwd(), serverScript);
  if (!existsSync3(serverPath)) {
    console.log(chalk4.red(`\u274C Server file not found: ${serverScript}`));
    console.log(chalk4.gray("Try running: npm run build"));
    process.exit(1);
  }
  const args = [serverPath];
  if (!options.stdio) {
    process.env.PORT = port;
  }
  console.log(chalk4.cyan(`Starting: node ${serverPath}`));
  if (!options.stdio) {
    console.log(chalk4.gray(`HTTP server will be available at: http://localhost:${port}`));
  }
  console.log(chalk4.gray("Press Ctrl+C to stop\n"));
  const serverProcess = crossPlatformSpawn("node", args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env
  });
  process.on("SIGINT", () => {
    console.log(chalk4.yellow("\n\u{1F6D1} Stopping server..."));
    killProcess(serverProcess, "SIGINT");
  });
  process.on("SIGTERM", () => {
    console.log(chalk4.yellow("\n\u{1F6D1} Stopping server..."));
    killProcess(serverProcess, "SIGTERM");
  });
  serverProcess.on("close", (code) => {
    if (code !== 0) {
      console.log(chalk4.red(`\u274C Server exited with code ${code}`));
    } else {
      console.log(chalk4.green("\u2705 Server stopped"));
    }
    process.exit(code || 0);
  });
  serverProcess.on("error", (error) => {
    console.error(chalk4.red("\u274C Failed to start server:"), error.message);
    process.exit(1);
  });
}
async function buildProject() {
  return new Promise((resolve, reject) => {
    const buildProcess = crossPlatformSpawn("npm", ["run", "build"], {
      stdio: "inherit",
      cwd: process.cwd()
    });
    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk4.green("\u2705 Build completed"));
        resolve();
      } else {
        console.log(chalk4.red("\u274C Build failed"));
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    buildProcess.on("error", (error) => {
      console.error(chalk4.red("\u274C Build error:"), error.message);
      reject(error);
    });
  });
}

// src/cli/commands/test.ts
import chalk5 from "chalk";
import { existsSync as existsSync4, readFileSync as readFileSync2 } from "fs";
import { join as join4 } from "path";
async function testCommand(options) {
  console.log(chalk5.bold.green("\u{1F9EA} Testing Twenty MCP Server"));
  console.log(chalk5.gray("Running diagnostics and validation tests\n"));
  try {
    await checkBasicSetup();
    if (options.smoke) {
      await runSmokeTests();
    } else if (options.oauth) {
      await runOAuthTests();
    } else if (options.full) {
      await runFullTestSuite();
    } else {
      await runDefaultTests();
    }
    console.log(chalk5.bold.green("\n\u2705 All tests completed successfully!"));
  } catch (error) {
    console.error(chalk5.red("\n\u274C Tests failed:"), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
async function checkBasicSetup() {
  console.log(chalk5.bold.blue("\u{1F4CB} Basic Setup Check"));
  const checks = [
    {
      name: "Project built",
      path: join4(process.cwd(), "dist/index.js"),
      required: true
    },
    {
      name: "Configuration file",
      path: join4(process.cwd(), ".env"),
      required: true
    },
    {
      name: "Node modules",
      path: join4(process.cwd(), "node_modules"),
      required: true
    },
    {
      name: "Package.json",
      path: join4(process.cwd(), "package.json"),
      required: true
    }
  ];
  for (const check of checks) {
    if (existsSync4(check.path)) {
      console.log(chalk5.green(`  \u2705 ${check.name}`));
    } else {
      console.log(chalk5.red(`  \u274C ${check.name}`));
      if (check.required) {
        throw new Error(`Required file missing: ${check.path}`);
      }
    }
  }
  console.log(chalk5.bold.blue("\n\u{1F527} Environment Configuration"));
  await checkEnvironmentConfig();
}
async function checkEnvironmentConfig() {
  const envPath = join4(process.cwd(), ".env");
  if (!existsSync4(envPath)) {
    console.log(chalk5.red("  \u274C .env file not found"));
    return;
  }
  const envContent = readFileSync2(envPath, "utf8");
  const envVars = /* @__PURE__ */ new Map();
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      envVars.set(match[1], match[2]);
    }
  });
  const requiredVars = ["TWENTY_API_KEY", "TWENTY_BASE_URL"];
  const optionalVars = ["AUTH_ENABLED", "IP_PROTECTION_ENABLED"];
  for (const varName of requiredVars) {
    if (envVars.has(varName) && envVars.get(varName)) {
      console.log(chalk5.green(`  \u2705 ${varName} is set`));
    } else {
      console.log(chalk5.red(`  \u274C ${varName} is missing or empty`));
    }
  }
  for (const varName of optionalVars) {
    if (envVars.has(varName)) {
      const value = envVars.get(varName);
      console.log(chalk5.blue(`  \u2139\uFE0F  ${varName} = ${value}`));
    }
  }
}
async function runSmokeTests() {
  console.log(chalk5.bold.blue("\n\u{1F4A8} Running Smoke Tests"));
  console.log(chalk5.gray("Quick tests without API calls\n"));
  await runNpmScript("test:smoke");
}
async function runOAuthTests() {
  console.log(chalk5.bold.blue("\n\u{1F510} Running OAuth Tests"));
  console.log(chalk5.gray("Testing OAuth authentication endpoints\n"));
  await runNpmScript("test:oauth");
}
async function runFullTestSuite() {
  console.log(chalk5.bold.blue("\n\u{1F52C} Running Full Test Suite"));
  console.log(chalk5.gray("Comprehensive tests including API calls\n"));
  await runNpmScript("test:full");
}
async function runDefaultTests() {
  console.log(chalk5.bold.blue("\n\u{1F3AF} Running Default Tests"));
  console.log(chalk5.gray("Standard validation and basic API tests\n"));
  try {
    await runNpmScript("validate");
  } catch (error) {
    console.log(chalk5.yellow("\u26A0\uFE0F  Configuration validation had issues"));
  }
  await runNpmScript("test");
}
async function runNpmScript(script) {
  return new Promise((resolve, reject) => {
    console.log(chalk5.cyan(`Running: npm run ${script}`));
    const testProcess = crossPlatformSpawn("npm", ["run", script], {
      stdio: "pipe",
      cwd: process.cwd()
    });
    let output = "";
    let errorOutput = "";
    testProcess.stdout?.on("data", (data) => {
      const text = data.toString();
      output += text;
      if (text.includes("SUCCESS") || text.includes("ERROR") || text.includes("WARNING")) {
        process.stdout.write(text);
      }
    });
    testProcess.stderr?.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });
    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk5.green(`\u2705 ${script} completed successfully`));
        resolve();
      } else {
        console.log(chalk5.red(`\u274C ${script} failed with code ${code}`));
        if (errorOutput) {
          console.log(chalk5.gray("Error details:"));
          console.log(errorOutput);
        }
        reject(new Error(`Test script ${script} failed`));
      }
    });
    testProcess.on("error", (error) => {
      console.error(chalk5.red(`\u274C Failed to run ${script}:`), error.message);
      reject(error);
    });
  });
}

// src/cli/commands/status.ts
import chalk6 from "chalk";
import { existsSync as existsSync5, readFileSync as readFileSync3, statSync } from "fs";
import { join as join5 } from "path";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
async function statusCommand(options) {
  if (!options.json) {
    console.log(chalk6.bold.blue("\u{1F4CA} Twenty MCP Server Status"));
    console.log(chalk6.gray("Checking server status and configuration\n"));
  }
  try {
    const status = await gatherStatus(options.verbose || false);
    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      displayStatus(status, options.verbose || false);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : error }, null, 2));
    } else {
      console.error(chalk6.red("\u274C Failed to get status:"), error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}
async function gatherStatus(verbose) {
  const status = {
    installation: {
      projectBuilt: false,
      nodeModulesInstalled: false,
      configurationExists: false
    },
    configuration: {
      twentyApiKey: false,
      twentyBaseUrl: null,
      authEnabled: false,
      ipProtectionEnabled: false,
      environment: "development"
    },
    server: {
      httpServerRunning: false
    },
    validation: {
      configValid: false,
      apiConnectionWorking: false
    }
  };
  await checkInstallation(status);
  await checkConfiguration(status);
  await checkServerStatus(status);
  if (verbose) {
    await checkValidation(status);
  }
  return status;
}
async function checkInstallation(status) {
  const distPath = join5(process.cwd(), "dist/index.js");
  status.installation.projectBuilt = existsSync5(distPath);
  if (status.installation.projectBuilt) {
    const stats = statSync(distPath);
    status.installation.lastBuilt = stats.mtime.toISOString();
  }
  const nodeModulesPath = join5(process.cwd(), "node_modules");
  status.installation.nodeModulesInstalled = existsSync5(nodeModulesPath);
  const envPath = join5(process.cwd(), ".env");
  status.installation.configurationExists = existsSync5(envPath);
}
async function checkConfiguration(status) {
  const envPath = join5(process.cwd(), ".env");
  if (!existsSync5(envPath)) {
    return;
  }
  const envContent = readFileSync3(envPath, "utf8");
  const envVars = /* @__PURE__ */ new Map();
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      envVars.set(match[1], match[2]);
    }
  });
  status.configuration.twentyApiKey = envVars.has("TWENTY_API_KEY") && !!envVars.get("TWENTY_API_KEY");
  status.configuration.twentyBaseUrl = envVars.get("TWENTY_BASE_URL") || null;
  status.configuration.authEnabled = envVars.get("AUTH_ENABLED") === "true";
  status.configuration.ipProtectionEnabled = envVars.get("IP_PROTECTION_ENABLED") === "true";
  if (envVars.has("NODE_ENV")) {
    status.configuration.environment = envVars.get("NODE_ENV") || "development";
  }
}
async function checkServerStatus(status) {
  try {
    const response = await checkHttpServer(3e3);
    if (response) {
      status.server.httpServerRunning = true;
      status.server.port = 3e3;
    }
  } catch {
    status.server.httpServerRunning = false;
  }
  try {
    const { stdout } = await execAsync('pgrep -f "twenty-mcp"');
    const pids = stdout.trim().split("\n").filter((pid) => pid);
    if (pids.length > 0) {
      status.server.processId = parseInt(pids[0], 10);
    }
  } catch {
  }
}
async function checkHttpServer(port) {
  return new Promise((resolve) => {
    const http = __require("http");
    const req = http.request({
      hostname: "localhost",
      port,
      path: "/health",
      method: "GET",
      timeout: 2e3
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}
async function checkValidation(status) {
  try {
    const { stdout, stderr } = await execAsync("npm run validate");
    status.validation.configValid = !stderr && stdout.includes("SUCCESS");
    status.validation.lastValidated = (/* @__PURE__ */ new Date()).toISOString();
    if (status.configuration.twentyApiKey && status.configuration.twentyBaseUrl) {
      status.validation.apiConnectionWorking = await testApiConnection(
        status.configuration.twentyBaseUrl
      );
    }
  } catch {
    status.validation.configValid = false;
    status.validation.apiConnectionWorking = false;
  }
}
async function testApiConnection(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TWENTY_API_KEY}`
      },
      body: JSON.stringify({
        query: "{ __typename }"
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
function displayStatus(status, verbose) {
  console.log(chalk6.bold.yellow("\u{1F3D7}\uFE0F  Installation:"));
  console.log(`  Project Built: ${status.installation.projectBuilt ? chalk6.green("\u2705 Yes") : chalk6.red("\u274C No")}`);
  console.log(`  Dependencies: ${status.installation.nodeModulesInstalled ? chalk6.green("\u2705 Installed") : chalk6.red("\u274C Missing")}`);
  console.log(`  Configuration: ${status.installation.configurationExists ? chalk6.green("\u2705 Found") : chalk6.red("\u274C Missing")}`);
  if (verbose && status.installation.lastBuilt) {
    console.log(`  Last Built: ${chalk6.gray(new Date(status.installation.lastBuilt).toLocaleString())}`);
  }
  console.log(chalk6.bold.yellow("\n\u2699\uFE0F  Configuration:"));
  console.log(`  Twenty API Key: ${status.configuration.twentyApiKey ? chalk6.green("\u2705 Set") : chalk6.red("\u274C Missing")}`);
  console.log(`  Twenty Base URL: ${status.configuration.twentyBaseUrl ? chalk6.green(status.configuration.twentyBaseUrl) : chalk6.red("\u274C Not set")}`);
  console.log(`  OAuth Auth: ${status.configuration.authEnabled ? chalk6.green("\u2705 Enabled") : chalk6.gray("\u274C Disabled")}`);
  console.log(`  IP Protection: ${status.configuration.ipProtectionEnabled ? chalk6.green("\u2705 Enabled") : chalk6.gray("\u274C Disabled")}`);
  console.log(`  Environment: ${chalk6.blue(status.configuration.environment)}`);
  console.log(chalk6.bold.yellow("\n\u{1F680} Server:"));
  console.log(`  HTTP Server: ${status.server.httpServerRunning ? chalk6.green("\u2705 Running") : chalk6.red("\u274C Not running")}`);
  if (status.server.port) {
    console.log(`  Port: ${chalk6.cyan(status.server.port)}`);
  }
  if (status.server.processId) {
    console.log(`  Process ID: ${chalk6.gray(status.server.processId)}`);
  }
  if (verbose) {
    console.log(chalk6.bold.yellow("\n\u{1F50D} Validation:"));
    console.log(`  Config Valid: ${status.validation.configValid ? chalk6.green("\u2705 Yes") : chalk6.red("\u274C No")}`);
    console.log(`  API Connection: ${status.validation.apiConnectionWorking ? chalk6.green("\u2705 Working") : chalk6.red("\u274C Failed")}`);
    if (status.validation.lastValidated) {
      console.log(`  Last Checked: ${chalk6.gray(new Date(status.validation.lastValidated).toLocaleString())}`);
    }
  }
  console.log(chalk6.bold.yellow("\n\u{1F4CB} Summary:"));
  const isHealthy = status.installation.projectBuilt && status.installation.nodeModulesInstalled && status.installation.configurationExists && status.configuration.twentyApiKey;
  if (isHealthy) {
    console.log(chalk6.green("\u2705 Server is ready to use"));
    if (!status.server.httpServerRunning) {
      console.log(chalk6.blue('\u{1F4A1} Run "twenty-mcp start" to start the server'));
    }
  } else {
    console.log(chalk6.red("\u274C Server needs configuration"));
    console.log(chalk6.blue('\u{1F4A1} Run "twenty-mcp setup" to configure'));
  }
  console.log("");
}

// src/cli/index.ts
var __dirname = dirname2(fileURLToPath(import.meta.url));
var program = new Command();
var executionContext = getExecutionContext();
function getVersion() {
  try {
    const packagePath = join6(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync4(packagePath, "utf8"));
    return packageJson.version;
  } catch {
    return "1.0.0";
  }
}
function showHeader() {
  showContextHeader(executionContext);
  if (executionContext.type === "npx") {
    showNPXPerformanceTip(executionContext);
  }
}
program.name("twenty-mcp").description("Twenty MCP Server - Model Context Protocol for Twenty CRM").version(getVersion()).hook("preAction", () => {
  showHeader();
});
program.command("setup").description("Interactive setup wizard for Twenty MCP Server").option("--oauth", "Enable OAuth 2.1 authentication setup").option("--ip-protection", "Enable IP address protection setup").option("--skip-tests", "Skip running tests after setup").option("--global", "Use global configuration directory").option("--import", "Import existing .env configuration").option("--reset", "Reset configuration to defaults").action(enhancedSetupCommand);
program.command("start").description("Start the Twenty MCP Server").option("-p, --port <port>", "HTTP server port (default: 3000)", "3000").option("--stdio", "Use stdio transport instead of HTTP").option("--verbose", "Enable verbose logging").action(startCommand);
program.command("test").description("Test the Twenty MCP Server configuration and connection").option("--full", "Run full test suite including API tests").option("--oauth", "Test OAuth authentication endpoints").option("--smoke", "Run smoke tests only (no API calls)").action(testCommand);
program.command("status").description("Show server status and configuration details").option("--json", "Output status in JSON format").option("--verbose", "Show detailed configuration").action(statusCommand);
program.command("help [command]").description("Show help for commands").action((command) => {
  if (command) {
    program.help();
  } else {
    showHeader();
    showContextualHelp(executionContext);
    console.log("");
    program.outputHelp();
    console.log("");
  }
});
process.on("uncaughtException", (error) => {
  console.error(chalk7.red("\n\u274C Unexpected error:"), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error(chalk7.red("\n\u274C Unhandled promise rejection:"), reason);
  process.exit(1);
});
if (!process.argv.slice(2).length) {
  showHeader();
  if (executionContext.type === "npx") {
    showNPXWelcome(executionContext);
  }
  showContextualHelp(executionContext);
  console.log("");
  program.outputHelp();
  console.log("");
} else {
  program.parse();
}
