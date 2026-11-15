import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const advanced = await readFile(new URL('../js/advanced.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const dataset = await readFile(new URL('../data/greekstreamtv.js', import.meta.url), 'utf8');
const sourceM3U = await readFile(new URL('../data/Greekstreamtv.m3u', import.meta.url), 'utf8');

assert.match(html, /<meta name="description"/);
assert.match(html, /js\/advanced\.js/);
assert.match(html, /dash\.js/);
assert.match(html, /data\/greekstreamtv\.js/);
assert.match(advanced, /checkAllStreams/);
assert.match(advanced, /exportFavorites/);
assert.match(advanced, /createPlaylist/);
assert.equal(manifest.name, 'GR TV Live');
assert.match(dataset, /const greekstreamChannels/);
assert.match(sourceM3U, /#EXTM3U/);
console.log('GR TV v3 smoke tests passed');
