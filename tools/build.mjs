import { access, cp, lstat, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PUBLIC_FILES = Object.freeze([
  'index.html', 'assets/styles.css', 'src/app.js', 'src/charts.js', 'src/data.js',
  'src/trends.js', 'src/ui-state.js', 'data/observations.json',
  'src/uncertainty.js', 'src/locator.js', 'assets/ne_110m_land.geojson',
  'src/url-state.js', 'src/selection-export.js',
  'assets/map-source.json', 'assets/MAP-SOURCES.md',
  'data/reference-results.json', 'data/provenance.json',
  'downloads/observations.csv', 'downloads/reproduction.zip',
]);

export async function buildSite(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const projectRoot = resolve(root);
  const output = resolve(projectRoot, 'dist');
  if (dirname(output) !== projectRoot || output === projectRoot) throw new Error('Unsafe build output');
  const previous = await lstat(output).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous?.isSymbolicLink()) throw new Error('Build output must not be a symbolic link');
  for (const name of PUBLIC_FILES) await access(join(projectRoot, name));
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const name of PUBLIC_FILES) {
    const destination = join(output, name);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(projectRoot, name), destination);
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Public static build: ${await buildSite()}`);
}
