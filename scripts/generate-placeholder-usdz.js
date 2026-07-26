// generate-placeholder-usdz.js
//
// Builds real .usdz files for iOS Quick Look AR, from raw bytes -- no
// Apple Reality Converter, no Xcode, no network access required. This
// closes the gap flagged repeatedly across earlier milestones: iosSrc
// was null because no valid usdz asset existed.
//
// USDZ is just a ZIP file with two hard requirements Quick Look enforces:
//   1. Every entry must be STORED (uncompressed), not DEFLATEd.
//   2. Every entry's file *data* must start at a byte offset that's a
//      multiple of 64, achieved via a padding "extra field" in the ZIP
//      local file header (this is exactly what Apple's own `usdzip`
//      tool does under the hood).
//
// The archive contains one file: a plain-text USD (.usda) stage
// describing a cube with a flat display color -- the same shape/colors
// as the .glb placeholders, so Android and iOS show a consistent object.
// Swap in real per-dish .usdz assets later without touching app code --
// ARPreview.js only ever references dish.model.iosSrc as a path.

import { writeFileSync, mkdirSync } from 'fs';

// ---------- CRC32 (needed for the ZIP local/central headers) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------- USDA (ASCII USD) content for a colored cube ----------
function buildCubeUSDA(hexColor) {
  const r = ((hexColor >> 16) & 0xff) / 255;
  const g = ((hexColor >> 8) & 0xff) / 255;
  const b = (hexColor & 0xff) / 255;

  // Same 24-vertex flat-shaded cube layout as the glb generator, scaled
  // to real-world meters (USD/Quick Look treats units as meters by default).
  const s = 0.08;
  const faces = [
    { n: [0, 0, 1],  v: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
    { n: [0, 0,-1],  v: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
    { n: [0, 1, 0],  v: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
    { n: [0,-1, 0],  v: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
    { n: [1, 0, 0],  v: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
    { n: [-1,0, 0],  v: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
  ];

  const points = [];
  const normals = [];
  faces.forEach(f => f.v.forEach(v => {
    points.push(`(${(v[0]*s).toFixed(4)}, ${(v[1]*s+s).toFixed(4)}, ${(v[2]*s).toFixed(4)})`);
    normals.push(`(${f.n[0]}, ${f.n[1]}, ${f.n[2]})`);
  }));

  const faceVertexCounts = faces.map(() => 4).join(', ');
  const faceVertexIndices = Array.from({ length: 24 }, (_, i) => i).join(', ');

  return `#usda 1.0
(
    defaultPrim = "Dish"
    upAxis = "Y"
    metersPerUnit = 1
)

def Xform "Dish"
{
    def Mesh "Cube"
    {
        int[] faceVertexCounts = [${faceVertexCounts}]
        int[] faceVertexIndices = [${faceVertexIndices}]
        point3f[] points = [${points.join(', ')}]
        normal3f[] normals = [${normals.join(', ')}] (
            interpolation = "faceVarying"
        )
        color3f[] primvars:displayColor = [(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})] (
            interpolation = "constant"
        )
        uniform token subdivisionScheme = "none"
    }
}
`;
}

// ---------- Minimal, correctly-padded, single-entry STORED zip (usdz) ----------
function buildUSDZ(usdaText, entryName) {
  const data = Buffer.from(usdaText, 'utf8');
  const crc = crc32(data);
  const nameBuf = Buffer.from(entryName, 'ascii');

  // DOS date/time: fixed value (Jan 1 1980), contents don't depend on it.
  const dosTime = 0x0000;
  const dosDate = 0x0021;

  // Compute padding needed so the file DATA (not the header) starts at a
  // 64-byte boundary. Local header is 30 fixed bytes + filename + extra field.
  const baseLen = 30 + nameBuf.length;
  let needed = (64 - (baseLen % 64)) % 64;
  if (needed > 0 && needed < 4) needed += 64; // extra field needs >=4 bytes if present
  const extraLen = needed;

  const extraField = Buffer.alloc(extraLen);
  if (extraLen > 0) {
    extraField.writeUInt16LE(0x1986, 0);          // "padding" extra field id (Apple usdzip convention)
    extraField.writeUInt16LE(extraLen - 4, 2);     // remaining data length
    // remaining bytes already zero-filled by Buffer.alloc
  }

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);   // local file header signature
  localHeader.writeUInt16LE(20, 4);           // version needed
  localHeader.writeUInt16LE(0, 6);            // flags
  localHeader.writeUInt16LE(0, 8);            // compression = stored
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18); // compressed size == uncompressed (stored)
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(extraField.length, 28);

  const localEntry = Buffer.concat([localHeader, nameBuf, extraField, data]);

  // Sanity: confirm data actually lands on a 64-byte boundary within the file.
  const dataOffset = localHeader.length + nameBuf.length + extraField.length;
  if (dataOffset % 64 !== 0) {
    throw new Error(`Alignment failed for ${entryName}: data offset ${dataOffset} is not 64-byte aligned`);
  }

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
  centralHeader.writeUInt16LE(20, 4);         // version made by
  centralHeader.writeUInt16LE(20, 6);         // version needed
  centralHeader.writeUInt16LE(0, 8);          // flags
  centralHeader.writeUInt16LE(0, 10);         // compression = stored
  centralHeader.writeUInt16LE(dosTime, 12);
  centralHeader.writeUInt16LE(dosDate, 14);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(nameBuf.length, 28);
  centralHeader.writeUInt16LE(0, 30);         // extra field length (central) -- none needed
  centralHeader.writeUInt16LE(0, 32);         // comment length
  centralHeader.writeUInt16LE(0, 34);         // disk number start
  centralHeader.writeUInt16LE(0, 36);         // internal attrs
  centralHeader.writeUInt32LE(0, 38);         // external attrs
  centralHeader.writeUInt32LE(0, 42);         // relative offset of local header (it's entry 0)

  const centralEntry = Buffer.concat([centralHeader, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);                          // entries on this disk
  eocd.writeUInt16LE(1, 10);                         // total entries
  eocd.writeUInt32LE(centralEntry.length, 12);       // size of central directory
  eocd.writeUInt32LE(localEntry.length, 16);         // offset of central directory
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localEntry, centralEntry, eocd]);
}

const DISHES = {
  pizza: 0xc97a3d,
  pasta: 0xe8d9a0,
  tiramisu: 0x6b4a2e,
};

mkdirSync('public/models', { recursive: true });
for (const [slug, color] of Object.entries(DISHES)) {
  const usda = buildCubeUSDA(color);
  // The first (only) entry's name matters to Quick Look only insofar as it
  // must end in .usdc or .usda -- using the dish slug keeps it debuggable.
  const usdz = buildUSDZ(usda, `${slug}.usda`);
  writeFileSync(`public/models/${slug}.usdz`, usdz);
  console.log(`Wrote public/models/${slug}.usdz (${usdz.length} bytes)`);
}
