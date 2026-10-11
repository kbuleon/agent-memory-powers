// Composes a work item from a Jira issue.
// Input  : JSON on standard input { key, summary, parent, description, url }
// Output : the path of the created file, on standard output.
// Abort  : message on standard error and exit code 1, with nothing written.
'use strict';
const fs = require('fs');
const path = require('path');

function abort(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}

function readOptions(argv) {
  const o = { workItems: 'docs/10-work-items', settings: 'docs/work-items-settings.json' };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--work-items') o.workItems = argv[i + 1];
    else if (argv[i] === '--settings') o.settings = argv[i + 1];
    else abort('unknown option: ' + argv[i]);
  }
  return o;
}

function slugify(text) {
  const raw = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (raw.length <= 60) return raw;
  const cut = raw.slice(0, 60);
  const dash = cut.lastIndexOf('-');
  return (dash > 0 ? cut.slice(0, dash) : cut).replace(/-+$/, '');
}

function escapeYaml(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function composeTitle(summary, parent) {
  const s = String(summary || '').trim();
  const p = String(parent || '').trim();
  return p ? s + ' [' + p + ']' : s;
}

function composeBody(description, key, url) {
  const link = '[' + key + '](' + url + ')';
  const text = String(description || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '_[image — see the Jira issue]_')
    .trim();
  return text ? link + '\n\n' + text + '\n' : link + '\n';
}

function main() {
  const o = readOptions(process.argv.slice(2));

  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (e) {
    abort('unreadable JSON input: ' + e.message);
  }

  const key = String(input.key || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*-[0-9]+$/.test(key)) {
    abort('malformed key: ' + JSON.stringify(input.key || '') + ' - aborting');
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(o.settings, 'utf8'));
  } catch (e) {
    abort('unreadable settings: ' + o.settings + ' - aborting');
  }
  if (!settings.prefix) abort('empty prefix in ' + o.settings + ' - aborting');

  const split = key.lastIndexOf('-');
  const prefix = key.slice(0, split);
  const number = parseInt(key.slice(split + 1), 10);
  if (prefix === settings.prefix) {
    abort('prefix ' + prefix + ' is the same as the local prefix - aborting');
  }

  const id = prefix + '-' + String(number).padStart(4, '0');

  let existing;
  try {
    existing = fs.readdirSync(o.workItems);
  } catch (e) {
    abort('unreadable work items folder: ' + o.workItems + ' - aborting');
  }
  const duplicate = existing.find(f => f.startsWith(id + '-'));
  if (duplicate) abort('a work item already exists for ' + id + ': ' + duplicate + ' - aborting');

  const slug = slugify(input.summary);
  if (!slug) abort('Jira title cannot be reduced to a slug - aborting');

  const url = String(input.url || '').trim();
  if (!url) abort('issue URL missing - aborting');

  const content =
    '---\n' +
    'id: ' + id + '\n' +
    'title: "' + escapeYaml(composeTitle(input.summary, input.parent)) + '"\n' +
    'status: new\n' +
    'superpowers-class: \n' +
    'tags: [Jira]\n' +
    'jira: ' + key + '\n' +
    '---\n\n' +
    composeBody(input.description, key, url);

  const filePath = path.join(o.workItems, id + '-' + slug + '.md');
  fs.writeFileSync(filePath, content);
  process.stdout.write(filePath + '\n');
}

main();
