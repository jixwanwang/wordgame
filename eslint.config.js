const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.js"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                exports: "writable",
                module: "writable",
                require: "readonly",
                global: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            // Indentation: 4 spaces
            "indent": ["error", 4, { "SwitchCase": 1 }],

            // Other formatting rules
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "comma-dangle": ["error", "always-multiline"],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
            "space-before-function-paren": ["error", "never"],
            "keyword-spacing": ["error", { "before": true, "after": true }],
            "space-infix-ops": "error",
            "eol-last": ["error", "always"],
            "no-trailing-spaces": "error",
            "max-len": ["error", { "code": 120 }],

            // TypeScript specific
            "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",

            // Disable some problematic rules
            "no-undef": "off", // TypeScript handles this
        },
    },
];
