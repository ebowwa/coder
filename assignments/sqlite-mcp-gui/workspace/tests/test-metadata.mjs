import { getMetadata } from "../src/lib/metadata.ts";

const id = "117844012";
const metadata = getMetadata(id);

console.log("Server ID:", id);
console.log("Metadata:", JSON.stringify(metadata, null, 2));
console.log("keyPath:", metadata?.sshKeyPath);
