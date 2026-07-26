// generate-placeholder-glb.js
// Builds a minimal, spec-valid glTF 2.0 binary (.glb) containing a single
// colored cube, entirely from raw bytes — no three.js / gltf-pipeline /
// network access required. This is a stand-in for real per-dish models;
// swap the output files in public/models/ for real assets later without
// touching any app code (ARPreview.js only knows about file paths).

import { writeFileSync, mkdirSync } from 'fs';

function buildCubeGLB(baseColor) {
  // 24 verts (4 per face) so each face gets flat, correct-facing normals.
  const positions = [];
  const normals = [];
  const faces = [
    { n: [0, 0, 1],  v: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
    { n: [0, 0,-1],  v: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
    { n: [0, 1, 0],  v: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
    { n: [0,-1, 0],  v: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
    { n: [1, 0, 0],  v: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
    { n: [-1,0, 0],  v: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
  ];
  const indices = [];
  let vi = 0;
  for (const f of faces) {
    for (const v of f.v) {
      positions.push(v[0] * 0.08, v[1] * 0.08 + 0.08, v[2] * 0.08);
      normals.push(...f.n);
    }
    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    vi += 4;
  }

  const posBuf = Buffer.alloc(positions.length * 4);
  positions.forEach((v, i) => posBuf.writeFloatLE(v, i * 4));
  const normBuf = Buffer.alloc(normals.length * 4);
  normals.forEach((v, i) => normBuf.writeFloatLE(v, i * 4));
  const idxBuf = Buffer.alloc(indices.length * 2);
  indices.forEach((v, i) => idxBuf.writeUInt16LE(v, i * 2));
  const idxPad = idxBuf.length % 4 === 0 ? Buffer.alloc(0) : Buffer.alloc(4 - (idxBuf.length % 4));

  const bin = Buffer.concat([posBuf, normBuf, idxBuf, idxPad]);

  const posMin = [0,1,2].map(a => Math.min(...positions.filter((_, i) => i % 3 === a)));
  const posMax = [0,1,2].map(a => Math.max(...positions.filter((_, i) => i % 3 === a)));

  const gltf = {
    asset: { version: '2.0', generator: 'DishLens placeholder generator' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        material: 0,
      }],
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: baseColor,
        metallicFactor: 0.05,
        roughnessFactor: 0.7,
      },
      name: 'placeholder-material',
    }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length, byteLength: normBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length + normBuf.length, byteLength: idxBuf.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const jsonPad = jsonBuf.length % 4 === 0 ? Buffer.alloc(0) : Buffer.alloc(4 - (jsonBuf.length % 4), 0x20);
  const jsonChunk = Buffer.concat([jsonBuf, jsonPad]);

  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + bin.length;
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonChunkHeader.write('JSON', 4, 'ascii');

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(bin.length, 0);
  binChunkHeader.write('BIN\0', 4, 'ascii');

  return Buffer.concat([header, jsonChunkHeader, jsonChunk, binChunkHeader, bin]);
}

const DISHES = {
  pizza: [0.79, 0.48, 0.24, 1.0],
  pasta: [0.91, 0.83, 0.60, 1.0],
  tiramisu: [0.42, 0.29, 0.18, 1.0],
};

mkdirSync('public/models', { recursive: true });
for (const [slug, color] of Object.entries(DISHES)) {
  const glb = buildCubeGLB(color);
  writeFileSync(`public/models/${slug}.glb`, glb);
  console.log(`Wrote public/models/${slug}.glb (${glb.length} bytes)`);
}
