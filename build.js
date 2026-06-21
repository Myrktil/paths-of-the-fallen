const { build, transform } = require("esbuild");
const fs = require("fs/promises");
const path = require("path");
const { argv } = require('node:process');

// Supported command line args.
// --reset-config: Overwrite local config with template.
// --clean: Delete dist directory before building.
// --sourcemap: Activate sourcemap when building.
// --local-files: Copy local assets and paths into dist when building.
// --banners: Don't overwrite banner and footer.
// --user-files: Copy user related files such as the LICENSE and README into the dist folder.
// --rename: Create a zip from the directory.
const supportedOptions = [
    "reset-config", 
    "clean", "sourcemap", 
    "local-files", 
    "banners", 
    "user-files",
    "rename"
];
const options = {};
readArgs();

let sharedConfig = {
    target: "es2022",
    format: "esm",
};

const sourcemap = options["sourcemap"] === "true" ?? false;
sharedConfig.sourcemap = sourcemap;

const showBanners = options["banners"] === "true" ?? false;
if (!showBanners) {
    sharedConfig.banner = {
        js: "", 
    };
    sharedConfig.footer = {
        js: "", 
    };
}


const root = path.resolve(__dirname);
const src = path.join(root, "src");
const dist = path.join(root, "dist");

async function buildAll() {
    try {
        // Clean build with all previous data removed.
        const clean = options["clean"] === "true" ?? false;
        if (clean) {
            const distDir = path.join(root, "dist");
            await fs.rm(distDir, { recursive: true, force: true });
        }

        // Build and bundle main application.
        await build({
            ...sharedConfig,
            entryPoints: ["src/scripts/main.ts"],
            outfile: "dist/main.js",
            bundle: true,
            minify: true,
        });

        // Copy html and css.
        const srcHtml = path.join(src, "index.html");
        const destHtml = path.join(dist, "index.html")
        const srcCss = path.join(src, "index.css");
        const destCss = path.join(dist, "index.css");
        await fs.copyFile(srcHtml, destHtml);
        await fs.copyFile(srcCss, destCss);

        // Create data directory.
        const distDataDirPath = path.join(dist, "data");
        await fs.mkdir(distDataDirPath, { recursive: true });

        const userFiles = options["user-files"] === "true" ?? false;
        if (userFiles) {
            const srcReadmePath = path.join(root, "README.md");
            const destReadmePath = path.join(dist, "README.md");
            await fs.copyFile(srcReadmePath, destReadmePath);

            const srcLicensePath = path.join(root, "LICENSE");
            const destLicensePath = path.join(dist, "LICENSE");
            await fs.copyFile(srcLicensePath, destLicensePath);
        }

        // Copy config.
        const resetConfig = options["reset-config"] === "true" ?? false;
        if (resetConfig) {    
            // Reset config to current tempalte. 
            await createConfigFromTemplate();
        }
        const srcConfigJsonPath = path.join(src, "data/config.json");
        if (!await fileExists(srcConfigJsonPath)) {
            await createConfigFromTemplate();
        }
        const distConfigJsonPath = path.join(dist, "data/config.json");
        await fs.copyFile(srcConfigJsonPath, distConfigJsonPath);

        const includeLocalFiles = options["local-files"] === "true" ?? false;
        if (includeLocalFiles) {
            // Copy all assets including local files and all path data.
            const srcAssetsPath = path.join(src, "assets");
            const destAssetsPath = path.join(dist, "assets");
            await fs.cp(srcAssetsPath, destAssetsPath, { recursive: true });

            const srcPathsPath = path.join(src, "data/paths");
            const destPathsPath = path.join(dist, "data/paths");
            await fs.cp(srcPathsPath, destPathsPath, { recursive: true });  
        }
        else {
            // Copy only system assets and create empty user assets and paths folder.
            const srcAssetsPath = path.join(src, "assets/system");
            const destAssetsPath = path.join(dist, "assets/system");
            await fs.cp(srcAssetsPath, destAssetsPath, { recursive: true });

            const destUserAssetsPath = path.join(dist, "assets/user");
            await fs.mkdir(destUserAssetsPath, { recursive: true });

            const pathDirPath = path.join(dist, "data/paths");
            await fs.mkdir(pathDirPath, { recursive: true });
        }

        const srcCreditsPath = path.join(src, "data/credits.txt");
        const destCreditsPath = path.join(dist, "data/credits.txt");
        await fs.copyFile(srcCreditsPath, destCreditsPath);

        // Rename dist folder.
        const newName = options["rename"];
        if (newName) {
            const distDirPath = path.join(root, "dist");
            if (!(await fileExists(distDirPath))) {
                throw Error("Failed to rename. Dist directory could not be found.");
            }

            const renamedDirPath = path.join(root, newName);
            if (fileExists(renamedDirPath)) {
                await fs.rm(renamedDirPath, { recursive: true, force: true });
            }
            await fs.rename(distDirPath, renamedDirPath);
        }
    } 
    catch (error) {
        console.error("Build failed!", error);
        process.exit(1);
    }
}

async function createConfigFromTemplate() {
    const configTemplate = path.join(src, "data/config.template.ts");
    const source = await fs.readFile(configTemplate, "utf-8");

    const result = await transform(source, {
        loader: "ts",
        format: "cjs", 
        minify: false,
    });

    const js = result.code;
    const config = (new Function(js + "return CONFIG;"))();
    const configJson = JSON.stringify(config, null, 2);
    const configJsonPath = path.join(src, "data/config.json"); 
    await fs.writeFile(configJsonPath, configJson, { recursive: true });
}

async function fileExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

function readArgs() {
    const args = argv.slice(2);

    args.forEach((arg) => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.replace(/^--/, '').split('=');
            if (supportedOptions.includes(key)) {
                options[key] = value ?? "true";
            }
            else throw Error(`Parsing args failed. Unknown parameter: ${arg}`);
        }
        else {
            throw new Error(`Parsing args failed. Unknown parameter: ${arg}`);
        }
    });
}

buildAll();