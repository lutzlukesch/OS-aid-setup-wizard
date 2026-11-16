// Validates data/flow.json against data/flow.schema.json (npm run validate).

import { readFileSync } from 'node:fs';
import Ajv from 'ajv';

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const validate = new Ajv({ allErrors: true }).compile(readJson('data/flow.schema.json'));

if (validate(readJson('data/flow.json'))) {
  console.log('data/flow.json is valid');
} else {
  for (const error of validate.errors) console.error(`${error.instancePath || '/'} ${error.message}`);
  process.exit(1);
}
