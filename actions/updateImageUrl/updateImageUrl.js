const fs = require("fs");
const path = require("path");
const { getInput } = require("@actions/core");

const deploymentJson = getInput("deployment-file");
const imageUrl = getInput("image-url");

// Read the deployment.json file
const deploymentJsonPath = path.join(process.cwd(), deploymentJson);

const deploymentJsonContent = fs.readFileSync(deploymentJsonPath, "utf8");
const deployment = JSON.parse(deploymentJsonContent);

// Update the image URL
deployment.spec.template.spec.containers[0].image = imageUrl;

// Write the updated deployment.json file
fs.writeFileSync(deploymentJsonPath, JSON.stringify(deployment, null, 2));

console.log(`Updated image URL in ${deploymentJsonPath}`);
