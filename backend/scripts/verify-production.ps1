$ErrorActionPreference = 'Stop'
npm run prisma:generate
npm run typecheck
npm run build
npm test
