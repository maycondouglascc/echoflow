import { mkdir, writeFile } from "node:fs/promises";
await mkdir("public/fonts", { recursive: true });
const fonts = {
  "gochi-hand.ttf": "gochihand/v27/hES06XlsOjtJsgCkx1PkTo4.ttf",
  "nunito-400.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTM.ttf",
  "nunito-500.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhRTM.ttf",
  "nunito-600.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDGUmRTM.ttf",
  "nunito-700.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDFwmRTM.ttf",
  "nunito-800.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDDsmRTM.ttf",
  "nunito-900.ttf": "nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDBImRTM.ttf",
};
for (const [name, path] of Object.entries(fonts)) {
  const response = await fetch(`https://fonts.gstatic.com/s/${path}`);
  if (!response.ok) throw new Error(`Font unavailable: ${name}`);
  await writeFile(`public/fonts/${name}`, Buffer.from(await response.arrayBuffer()));
}
for (const family of ["nunito", "gochihand"]) {
  const response = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
  if (!response.ok) throw new Error("Font license unavailable");
  await writeFile(`public/fonts/${family}-OFL.txt`, await response.text());
}
console.log("Downloaded design fonts and OFL licenses.");
