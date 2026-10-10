#!/usr/bin/env node
// Credentials stay in the private source directory, never in public output or logs.
import { readFile, writeFile, mkdir, readdir, unlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(root, 'project-preview/business-module-system');

function seal(key, bytes, additionalData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (additionalData) cipher.setAAD(Buffer.from(additionalData));
  return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}

export async function buildProjectAccess(source, { output = defaultOutput } = {}) {
  const privateDir = await realpath(source);
  if (privateDir === root || privateDir.startsWith(root + path.sep)) throw new Error('Private source must be outside the website.');
  const credentialsPath = await realpath(path.join(privateDir, 'passwords.json'));
  if (!credentialsPath.startsWith(privateDir + path.sep)) throw new Error('Password list must be inside the private source directory.');
  let credentials;
  try { credentials = JSON.parse(await readFile(credentialsPath, 'utf8')); }
  catch { throw new Error('Could not read passwords.json as valid JSON.'); }
  if (!Array.isArray(credentials) || !credentials.length) throw new Error('passwords.json must contain a non-empty array.');
  const seen = new Set();
  for (const item of credentials) {
    if (!item || typeof item.password !== 'string' || item.password.length < 12 || !item.password.trim()) {
      throw new Error('Every password must contain at least 12 characters and cannot be blank.');
    }
    if (item.enabled !== undefined && typeof item.enabled !== 'boolean') throw new Error('enabled must be true or false.');
    if (item.label !== undefined && typeof item.label !== 'string') throw new Error('label must be text.');
    if (seen.has(item.password)) throw new Error('Duplicate passwords are not allowed.');
    seen.add(item.password);
  }
  const active = credentials.filter(item => item.enabled !== false);
  if (!active.length) throw new Error('Keep at least one enabled password. No output was changed.');

  // Validate all source files before writing output.
  let shell = await readFile(path.join(privateDir, 'public-shell.html'), 'utf8');
  if (!shell.includes('__ACCESS_CONFIG__')) throw new Error('Public shell must contain __ACCESS_CONFIG__.');
  const content = JSON.parse(await readFile(path.join(privateDir, 'content.json'), 'utf8'));
  const assets = [];
  for (const asset of content.assets) {
    const localPath = await realpath(path.join(privateDir, asset.source));
    if (!localPath.startsWith(privateDir + path.sep)) throw new Error('Asset must be inside private source directory.');
    assets.push(await readFile(localPath));
  }

  const salt = randomBytes(16), iterations = 600000;
  const key = randomBytes(32), version = randomBytes(16).toString('hex');
  // A build-local salt allows a single password derivation per attempt. Each envelope has its own IV.
  const slots = active.map(({ password }) => {
    const wrappingKey = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const wrappedKey = seal(wrappingKey, key, version).toString('base64');
    wrappingKey.fill(0);
    return wrappedKey;
  });
  const encryptedDir = path.join(output, 'encrypted');
  const written = new Set();
  await mkdir(encryptedDir, { recursive: true });
  async function encrypt(bytes) {
    const name = randomBytes(16).toString('hex') + '.bin';
    await writeFile(path.join(encryptedDir, name), seal(key, bytes));
    written.add(name);
    return name;
  }
  try {
    for (let i = 0; i < content.assets.length; i++) {
      content.assets[i].file = await encrypt(assets[i]);
      delete content.assets[i].source;
    }
    const payload = await encrypt(Buffer.from(JSON.stringify(content)));
    const config = { format: 2, version, salt: salt.toString('base64'), iterations, slots, payload };
    shell = shell.replace('__ACCESS_CONFIG__', JSON.stringify(config));
    await writeFile(path.join(output, 'index.html'), shell);
    // Only obsolete ciphertext owned by this builder is removed after the new page is ready.
    for (const name of await readdir(encryptedDir)) {
      if (/^[a-f0-9]{32}\.bin$/.test(name) && !written.has(name)) await unlink(path.join(encryptedDir, name));
    }
    return { passwords: active.length, images: content.assets.length, version };
  } finally { key.fill(0); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/build-project-access.mjs /absolute/private-source-directory');
    const result = await buildProjectAccess(process.argv[2]);
    console.log(`Built BMS preview: ${result.passwords} active passwords, ${result.images} encrypted images and encrypted text.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
