#!/usr/bin/env sh
set -eu
npm run prisma:generate
npm run typecheck
npm run build
npm test
