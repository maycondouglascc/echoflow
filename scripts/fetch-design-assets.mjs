// Exact Figma exports, not redraws. Export URLs expire; committed assets are the source thereafter.
import { mkdir, writeFile } from "node:fs/promises";
const exports = {
  "playback.png": "170c2e5c-e35e-422b-a634-dca4682dfd02.png",
  "star.png": "0a5ee1ee-6f53-43e8-8756-fd37b156ae9d.png",
  "kitten.png": "ef59db7e-61b6-4061-bea8-576c86f1060c.png",
  "shadow.svg": "0082079d-759b-4907-9fe2-7ac3a22c17fb.svg",
  "logo.svg": "e641c745-ade3-4d1e-ae70-44e700d86b29.svg",
  "google.svg": "a576c4f2-1507-4596-86d4-99fe129ee738.svg",
  "close.svg": "35dd5456-82ba-4d00-bf02-0966ca679185.svg",
  "search.svg": "e200d5ea-f8fb-472d-9d82-1d9c449ea30a.svg",
  "filter.svg": "d82160dc-f12a-49b2-ae92-7c4d0c9668e0.svg",
  "check.svg": "786c2f7a-79c1-4327-912c-7e49934bd7d0.svg",
  "user.svg": "094202d4-566e-4778-92d5-f2c8641b8324.svg",
  "play.svg": "dc8f967d-b314-4ad8-aee3-e01902c46c04.svg",
  "speech.svg": "f55ff3dd-f522-41c5-8c9c-3124abb61221.svg",
  "ear.svg": "e8f05e80-0d5e-45b6-a414-bf7cb502521e.svg",
  "forward.svg": "0ed8a334-c02c-4e10-b877-26f261d76cff.svg",
  "back.svg": "abcd001c-509f-4c98-9a13-d52c039d517a.svg",
};
await mkdir("public/design", { recursive: true });
await Promise.all(Object.entries(exports).map(async ([name, id]) => {
  const response = await fetch(`https://www.figma.com/api/mcp/asset/${id}`);
  if (!response.ok) throw new Error(`Asset unavailable: ${name}`);
  await writeFile(`public/design/${name}`, Buffer.from(await response.arrayBuffer()));
}));
console.log(`Downloaded ${Object.keys(exports).length} exact Figma exports.`);
