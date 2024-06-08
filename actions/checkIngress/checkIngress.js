const fs = require("fs");
const path = require("path");
const { getInput } = require("@actions/core");

const namespace = getInput("namespace");
const deploymentPath = getInput("deployment-path");

// Define the paths
const targetPath = path.join("infra", "namespace", namespace, "ingress.json");
const sourcePath = path.join("source", deploymentPath, "ingress.json");

try {
  if (fs.existsSync(targetPath)) {
    console.log("File exists in target repository");
    fs.appendFileSync(process.env.GITHUB_ENV, "RT_INGRESS_EXISTS=true\n");
  } else {
    console.log("File does not exist in target repository");
    fs.appendFileSync(process.env.GITHUB_ENV, "RT_INGRESS_EXISTS=false\n");
    console.log(
      "Copy file to target repository. Creating directory if it does not exist. Skipping diff check."
    );
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);

    // Add host to environment variable
    const ingressContent = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const host = ingressContent.spec.rules[0].host;
    fs.appendFileSync(process.env.GITHUB_ENV, `RT_NEW_HOST=${host}\n`);
  }
} catch (error) {
  console.error(`Error: ${error}`);
  process.exit(1);
}
