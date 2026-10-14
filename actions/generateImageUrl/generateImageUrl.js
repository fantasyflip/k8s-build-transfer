const { getInput, setOutput } = require("@actions/core");
const fs = require("fs");

const repo = getInput("repo-name");
const branch = getInput("branch-name");
const commit = getInput("sha");

const imageUrl = `ghcr.io/${repo}:${branch}-${commit}`;

console.log("Generated image URL:", imageUrl);

fs.appendFileSync(process.env.GITHUB_ENV, `RT_IMG_URL=${imageUrl}\n`);
setOutput("image-url", imageUrl);
