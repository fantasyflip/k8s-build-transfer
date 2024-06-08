const fs = require("fs");
const { getInput } = require("@actions/core");

const repo = getInput("repo-name");
const namespace = getInput("namespace");
const appName = getInput("app-name");

let message = `chore(k8s): Add ingress for ${appName} to namespace ${namespace} from ${repo} [CI][N=${namespace}]\n`;

if (process.env.RT_NEW_HOST) {
  message = `chore(k8s): Add ingress for ${appName} to namespace ${namespace} from ${repo} [CI][N=${namespace}][H=${process.env.RT_NEW_HOST}]\n`;
}

fs.appendFileSync(process.env.GITHUB_ENV, `RT_COM_MSG=${message}\n`);
