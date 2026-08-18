#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const zlib = require('zlib');
const https = require('https');

const buildId = process.argv[2];
const args = buildId
  ? `build:view ${buildId} --json`
  : 'build:list --platform android --limit 1 --json';

const raw = execSync(`npx eas-cli ${args}`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const jsonStart = raw.indexOf(buildId ? '{' : '[');
if (jsonStart < 0) {
  console.error('Could not parse EAS JSON output');
  process.exit(1);
}

const payload = JSON.parse(raw.slice(jsonStart));
const build = buildId ? payload : payload[0];
const url = build?.logFiles?.[0];

if (!url) {
  console.error('No log URL on build', build?.id, build?.status);
  process.exit(1);
}

https
  .get(url, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      let buf = Buffer.concat(chunks);
      const encoding = res.headers['content-encoding'];
      if (encoding === 'br') {
        buf = zlib.brotliDecompressSync(buf);
      } else if (encoding === 'gzip' || (buf[0] === 0x1f && buf[1] === 0x8b)) {
        buf = zlib.gunzipSync(buf);
      }
      const text = buf.toString('utf8');
      const out = `eas-build-${build.id}.log`;
      fs.writeFileSync(out, text);
      console.log(`Saved ${out} (${text.length} chars)`);
      const hits = text
        .split('\n')
        .filter((line) => /error|ERR!|failed|npm/i.test(line))
        .slice(0, 40);
      if (hits.length) {
        console.log('\n--- relevant lines ---');
        hits.forEach((line) => console.log(line));
      } else {
        console.log('\n--- tail ---');
        console.log(text.split('\n').slice(-40).join('\n'));
      }
    });
  })
  .on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  });
