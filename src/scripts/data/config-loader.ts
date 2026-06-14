import { Config } from "./config";

const config: Config | null = null;

export async function getConfig() {
    if (config) {
        return config;
    }
    else {
        return await fetchConfig();
    }
}

async function fetchConfig() {
    let json;
    try {
        let response = await fetch("data/config.json");
        json = await response.json();
    }
    catch (e) {
        if (e instanceof Error) {
            throw new Error("Failed to fetch config.\n" + e.message);
        }
    }

    const config = Object.assign({}, json) as Config;
    if (!config) {
        throw new Error("Failed to parse config. Examine config.json syntax.")
    }

    return config;
}
