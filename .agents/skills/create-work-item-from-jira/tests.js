// Tests for compose.js. Run: node <skill-dir>/tests.js, where <skill-dir> is this file's directory.
'use strict';
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const compose = path.join(__dirname, 'compose.js');
let failures = 0;

function sandbox(localPrefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wi-'));
  const workItems = path.join(root, 'work-items');
  fs.mkdirSync(workItems);
  const settings = path.join(root, 'settings.json');
  fs.writeFileSync(settings, JSON.stringify({ prefix: localPrefix || 'LOC' }));
  return { workItems, settings };
}

function run(input, b) {
  return execFileSync('node', [compose, '--work-items', b.workItems, '--settings', b.settings],
    { input: JSON.stringify(input), encoding: 'utf8' }).trim();
}

function runExpectingFailure(input, b) {
  try {
    run(input, b);
    return null;
  } catch (e) {
    return String(e.stderr || '');
  }
}

function test(name, fn) {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (e) {
    failures += 1;
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

const base = {
  key: 'PROJ-1061',
  summary: 'RC: name inverted in the menu ',
  parent: 'Apollo 2 - Support',
  description: 'description text',
  url: 'https://example.atlassian.net/browse/PROJ-1061'
};

test('number padded to four digits', () => {
  const b = sandbox();
  const filePath = run(Object.assign({}, base, { key: 'PROJ-558', url: 'https://x/PROJ-558' }), b);
  assert.strictEqual(path.basename(filePath).startsWith('PROJ-0558-'), true, filePath);
  assert.match(fs.readFileSync(filePath, 'utf8'), /^id: PROJ-0558$/m);
  assert.match(fs.readFileSync(filePath, 'utf8'), /^jira: PROJ-558$/m);
});

test('number already four digits left unchanged', () => {
  const b = sandbox();
  const filePath = run(base, b);
  assert.strictEqual(path.basename(filePath).startsWith('PROJ-1061-'), true, filePath);
  assert.match(fs.readFileSync(filePath, 'utf8'), /^jira: PROJ-1061$/m);
});

test('title joined with the epic, edge spaces trimmed', () => {
  const b = sandbox();
  const content = fs.readFileSync(run(base, b), 'utf8');
  assert.match(content, /^title: "RC: name inverted in the menu \[Apollo 2 - Support\]"$/m);
});

test('no parent, no empty brackets', () => {
  const b = sandbox();
  const content = fs.readFileSync(run(Object.assign({}, base, { parent: null }), b), 'utf8');
  assert.match(content, /^title: "RC: name inverted in the menu"$/m);
});

test('double quote and backslash escaped', () => {
  const b = sandbox();
  const input = Object.assign({}, base, { summary: 'the "x" and the \\ ', parent: null });
  const content = fs.readFileSync(run(input, b), 'utf8');
  assert.match(content, /^title: "the \\"x\\" and the \\\\"$/m);
});

test('slug computed from the summary only', () => {
  const b = sandbox();
  const filePath = run(Object.assign({}, base, { summary: 'Simple bug' }), b);
  assert.strictEqual(path.basename(filePath), 'PROJ-1061-simple-bug.md');
});

test('slug capped at 60 characters, cut on a dash', () => {
  const b = sandbox();
  const long = 'aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee ffffffffff gggg';
  const filePath = run(Object.assign({}, base, { summary: long }), b);
  const slug = path.basename(filePath).replace(/^PROJ-1061-/, '').replace(/\.md$/, '');
  assert.ok(slug.length <= 60, 'slug of ' + slug.length + ' characters');
  assert.strictEqual(slug.endsWith('-'), false, slug);
  assert.strictEqual(slug, 'aaaaaaaaaa-bbbbbbbbbb-cccccccccc-dddddddddd-eeeeeeeeee');
});

test('accents stripped from the slug', () => {
  const b = sandbox();
  const filePath = run(Object.assign({}, base, { summary: 'Naïve résumé parsing' }), b);
  assert.strictEqual(path.basename(filePath), 'PROJ-1061-naive-resume-parsing.md');
});

test('link at the top of the body', () => {
  const b = sandbox();
  const content = fs.readFileSync(run(base, b), 'utf8');
  assert.ok(content.includes('\n[PROJ-1061](https://example.atlassian.net/browse/PROJ-1061)\n'), content);
});

test('image replaced by a mention', () => {
  const b = sandbox();
  const input = Object.assign({}, base, { description: 'before\n\n![](blob:https://media/x?a=1&b=2)\n\nafter' });
  const content = fs.readFileSync(run(input, b), 'utf8');
  assert.strictEqual(content.includes('blob:'), false, content);
  assert.ok(content.includes('_[image — see the Jira issue]_'), content);
  assert.ok(content.includes('before') && content.includes('after'), content);
});

test('empty description: the body is just the link', () => {
  const b = sandbox();
  const content = fs.readFileSync(run(Object.assign({}, base, { description: null }), b), 'utf8');
  const body = content.split('---\n')[2];
  assert.strictEqual(body.trim(), '[PROJ-1061](https://example.atlassian.net/browse/PROJ-1061)');
});

test('tags and status at creation', () => {
  const b = sandbox();
  const content = fs.readFileSync(run(base, b), 'utf8');
  assert.match(content, /^status: new$/m);
  assert.match(content, /^tags: \[Jira\]$/m);
  assert.match(content, /^superpowers-class: $/m);
});

test('duplicate refused even under another slug', () => {
  const b = sandbox();
  run(base, b);
  const error = runExpectingFailure(Object.assign({}, base, { summary: 'entirely different title' }), b);
  assert.ok(error && error.includes('PROJ-1061'), error);
  assert.strictEqual(fs.readdirSync(b.workItems).length, 1);
});

test('local prefix refused', () => {
  const b = sandbox('LOC');
  const error = runExpectingFailure(Object.assign({}, base, { key: 'LOC-0001' }), b);
  assert.ok(error && error.includes('LOC'), error);
  assert.strictEqual(fs.readdirSync(b.workItems).length, 0);
});

test('malformed key refused', () => {
  const b = sandbox();
  for (const key of ['', 'PROJ', '1061', 'PROJ-', '-1061', 'PROJ 1061', 'proj-10a1']) {
    const error = runExpectingFailure(Object.assign({}, base, { key }), b);
    assert.ok(error !== null, 'wrongly accepted: ' + JSON.stringify(key));
    assert.ok(error.includes('malformed key'), error);
  }
  assert.strictEqual(fs.readdirSync(b.workItems).length, 0);
});

test('lowercase key normalized', () => {
  const b = sandbox();
  const filePath = run(Object.assign({}, base, { key: 'proj-1061' }), b);
  assert.strictEqual(path.basename(filePath).startsWith('PROJ-1061-'), true, filePath);
});

test('summary that cannot be reduced to a slug refused', () => {
  const b = sandbox();
  const error = runExpectingFailure(Object.assign({}, base, { summary: '??? — :' }), b);
  assert.ok(error !== null, 'wrongly accepted');
  assert.ok(error.includes('slug'), error);
  assert.strictEqual(fs.readdirSync(b.workItems).length, 0);
});

test('missing url refused', () => {
  const b = sandbox();
  const error = runExpectingFailure(Object.assign({}, base, { url: '' }), b);
  assert.ok(error !== null, 'wrongly accepted');
  assert.ok(error.includes('URL'), error);
  assert.strictEqual(fs.readdirSync(b.workItems).length, 0);
});

test('the diacritics range is escaped, not written in clear', () => {
  const source = fs.readFileSync(compose, 'utf8');
  assert.ok(source.includes('[\\u0300-\\u036f]'), 'escape missing or altered');
});

console.log(failures === 0 ? 'ALL TESTS PASS' : failures + ' TESTS FAILED');
process.exit(failures === 0 ? 0 : 1);
