const fs = require("fs");
const path = require("path");
const { arraysEqual } = require("../../utils");
const { getInput } = require("@actions/core");

const namespace = getInput("namespace");
const deploymentPath = getInput("deployment-path");

const targetPath = path.join("infra", "namespace", namespace, "ingress.json");
const sourcePath = path.join("source", deploymentPath, "ingress.json");

const targetRules = JSON.parse(fs.readFileSync(targetPath)).spec.rules;
const currentRules = JSON.parse(fs.readFileSync(sourcePath)).spec.rules;

console.log("Check if rules are identical");

if (arraysEqual(targetRules, currentRules)) {
  console.log("Files are identical");
  fs.appendFileSync(process.env.GITHUB_ENV, "RT_INGRESS_IDENTICAL=true\n");
} else {
  console.log("Files are not identical");
  fs.appendFileSync(process.env.GITHUB_ENV, "RT_INGRESS_IDENTICAL=false\n");
}
