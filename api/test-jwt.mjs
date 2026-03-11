import { importJWK, jwtVerify, decodeProtectedHeader } from "jose";

const token = process.env.TOKEN;
const res = await fetch("https://login.microsoftonline.com/common/discovery/v2.0/keys");
const data = await res.json();
const header = decodeProtectedHeader(token);
console.log("Token header kid:", header.kid, "alg:", header.alg);
const match = data.keys.find(k => k.kid === header.kid);
if (!match) { console.error("No matching key"); process.exit(1); }
console.log("Matched key kty:", match.kty, "alg:", match.alg);
const key = await importJWK({ ...match, alg: "RS256" }, "RS256");
const { payload } = await jwtVerify(token, key, { audience: "https://management.azure.com" });
console.log("SUCCESS - tid:", payload.tid, "name:", payload.name);
