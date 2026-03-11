import {defineConfig} from "vite";

/** @type {import('vite').UserConfig} */
export default ({
    scripts: {
        "build": "vite build",
        "preview": "vite preview"
    },
    base: "/ascii-sea/"
})