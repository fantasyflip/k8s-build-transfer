const fs = require("fs");
const path = require("path");
const { objectsEqual } = require("../../utils");
const { getInput } = require("@actions/core");

const namespace = getInput("namespace");
const deploymentPath = getInput("deployment-path");

const targetPath = path.join("infra", "namespace", namespace, "ingress.json");
const sourcePath = path.join("source", deploymentPath, "ingress.json");

const targetRules = JSON.parse(fs.readFileSync(targetPath)).spec.rules;
const currentRules = JSON.parse(fs.readFileSync(sourcePath)).spec.rules;

// check if the currentRule is already in the targetRules
const ruleAlreadyExists = targetRules.some((rule) => {
  return objectsEqual(rule, currentRules[0]);
});

// exit the script if the rule already exists but do not throw an error to continue the workflow

if (ruleAlreadyExists) {
  console.log(`Rule already exists in target ingress ruleset`);
  process.exit(0);
}

// get the host from the currentRules
const host = currentRules[0].host;

// check if targetRule contains a rule with the same host
const hostAlreadyExists = targetRules.some((rule) => rule.host === host);

// throw an error to stop the workflow if the host already exists
if (hostAlreadyExists) {
  console.error(`Error: Host ${host} already exists in target ingress`);
  process.exit(1);
}

console.log("New host detected. DNS record necessary.");

fs.appendFileSync(process.env.GITHUB_ENV, `RT_NEW_HOST=${host}\n`);

console.log("Add rule to target ingress ruleset");

// append the currentRules to the targetRules
targetRules.push(currentRules[0]);

// get the content of the target file
const targetContent = JSON.parse(fs.readFileSync(targetPath));

// update the target file with the new rules
targetContent.spec.rules = targetRules;

console.log("Write updated content to target file");
// write the updated content to the target file
fs.writeFileSync(targetPath, JSON.stringify(targetContent, null, 2));
