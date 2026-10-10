import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
import { buildProjectAccess } from './build-project-access.mjs';

const passwords = ['First-test-password-100', 'Second-test-password-200', 'Disabled-test-password-300'];
function open(key, data, aad) {
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]);
}
function unlock(config, password) {
  const wrappingKey = pbkdf2Sync(password, Buffer.from(config.salt, 'base64'), config.iterations, 32, 'sha256');
  for (const slot of config.slots) {
    try { return open(wrappingKey, Buffer.from(slot, 'base64'), config.version); } catch {}
  }
  throw new Error('No matching credential');
}

test('multiple passwords, revocation, rotation, private metadata and input validation', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bms-multi-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'private'), output = path.join(dir, 'public');
  await mkdir(source);
  await writeFile(path.join(source, 'public-shell.html'), '__ACCESS_CONFIG__');
  const image = Buffer.from('private image fixture');
  await writeFile(path.join(source, 'image.bin'), image);
  await writeFile(path.join(source, 'content.json'), JSON.stringify({ context: 'private context fixture', chapters: 'private chapters fixture', toc: 'private TOC fixture', assets: [{ id: '0', source: 'image.bin', mime: 'image/png' }] }));
  const entries = passwords.map((password, i) => ({ password, label: `Private recipient ${i}`, enabled: i !== 2 }));
  const save = value => writeFile(path.join(source, 'passwords.json'), JSON.stringify(value));
  const config = async () => JSON.parse(await readFile(path.join(output, 'index.html'), 'utf8'));
  const ciphertext = c => readFile(path.join(output, 'encrypted', c.payload));
  await save(entries);
  await buildProjectAccess(source, { output });
  const before = await config(), oldKey = unlock(before, passwords[0]);
  assert.equal(before.slots.length, 2);
  assert.deepEqual(unlock(before, passwords[1]), oldKey);
  assert.throws(() => unlock(before, passwords[2]));
  assert.throws(() => unlock(before, 'incorrect-password'));
  const body = JSON.parse(open(oldKey, await ciphertext(before)));
  assert.equal(body.chapters, 'private chapters fixture');
  assert.deepEqual(open(oldKey, await readFile(path.join(output, 'encrypted', body.assets[0].file))), image);
  assert(!('source' in body.assets[0]));
  for (const filename of ['index.html', ...(await readdir(path.join(output, 'encrypted'))).map(name => 'encrypted/' + name)]) {
    const bytes = await readFile(path.join(output, filename));
    for (const secret of [...passwords, ...entries.map(e => e.label), 'private context fixture']) assert(!bytes.includes(Buffer.from(secret)));
  }
  // Disabling a password also rotates content keys, invalidating old saved keys.
  entries[0].enabled = false;
  await save(entries); await buildProjectAccess(source, { output });
  const after = await config();
  assert.notEqual(after.version, before.version);
  assert.notEqual(after.salt, before.salt);
  assert.throws(() => unlock(after, passwords[0]));
  const nextBytes = await ciphertext(after);
  assert.throws(() => open(oldKey, nextBytes));
  assert.equal(JSON.parse(open(unlock(after, passwords[1]), nextBytes)).context, 'private context fixture');
  // Removing an entry and enabling another is reflected in the next build.
  entries.splice(0, 1); entries[1].enabled = true;
  await save(entries); await buildProjectAccess(source, { output });
  const third = await config();
  assert.throws(() => unlock(third, passwords[0]));
  assert.deepEqual(unlock(third, passwords[1]), unlock(third, passwords[2]));
  assert.equal((await readdir(path.join(output, 'encrypted'))).length, 2);
  // Add a new password without changing the content or existing active passwords.
  const addedPassword = 'Newly-added-test-password-400';
  entries.push({ password: addedPassword, label: 'New private recipient', enabled: true });
  await save(entries); await buildProjectAccess(source, { output });
  const fourth = await config();
  assert.equal(fourth.slots.length, 3);
  assert.deepEqual(unlock(fourth, addedPassword), unlock(fourth, passwords[1]));
  const published = await readFile(path.join(output, 'index.html'));
  for (const invalid of [[], [{ password: 'short' }], [{ password: passwords[0], enabled: false }], [{ password: passwords[0] }, { password: passwords[0] }], [{ password: passwords[0], enabled: 'false' }]]) {
    await save(invalid);
    await assert.rejects(buildProjectAccess(source, { output }));
    assert.deepEqual(await readFile(path.join(output, 'index.html')), published);
  }
  await writeFile(path.join(source, 'passwords.json'), '[SECRET-MALFORMED-INPUT');
  await assert.rejects(buildProjectAccess(source, { output }), error => !error.message.includes('SECRET-MALFORMED-INPUT'));
});
