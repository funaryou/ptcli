#!/usr/bin/env node
import { main } from '../src/cli.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(`\n✗ ${error.message}`);
  if (process.env.PTCLI_DEBUG) console.error(error.stack);
  process.exit(1);
});
