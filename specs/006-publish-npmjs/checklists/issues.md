# Issues

## Run 1 2026/06/18

- [x] The publish GitHub Action failed due to the following errors. Everything else in the action appeared to execute correctly.

```
> @dawmatt/backstage-plugin-api-grade@0.1.3 typecheck
> tsc --noEmit

Error: src/api/ApiGradeClient.ts(1,45): error TS2307: Cannot find module '@dawmatt/backstage-plugin-api-grade-backend' or its corresponding type declarations.
Error: src/components/ApiGradeCard/GradingDetailSection.tsx(2,52): error TS2307: Cannot find module '@dawmatt/api-grade-core' or its corresponding type declarations.
Error: src/components/ApiGradeCard/GradingDetailSection.tsx(24,43): error TS7006: Parameter 'rec' implicitly has an 'any' type.
Error: src/components/ApiGradeCard/GradingDetailSection.tsx(24,48): error TS7006: Parameter 'i' implicitly has an 'any' type.
Error: src/components/ApiGradeCard/OverallGradeSection.tsx(2,46): error TS2307: Cannot find module '@dawmatt/api-grade-core' or its corresponding type declarations.
Error: src/hooks/useApiGrade.ts(2,34): error TS2307: Cannot find module '@dawmatt/api-grade-core' or its corresponding type declarations.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /home/runner/work/api-grade/api-grade/packages/backstage-plugin-api-grade
npm error workspace @dawmatt/backstage-plugin-api-grade@0.1.3
npm error location /home/runner/work/api-grade/api-grade/packages/backstage-plugin-api-grade
npm error command failed
npm error command sh -c tsc --noEmit


> @dawmatt/backstage-plugin-api-grade-backend@0.1.3 typecheck
> tsc --noEmit

Error: src/router.ts(2,29): error TS2307: Cannot find module '@dawmatt/api-grade-core' or its corresponding type declarations.
Error: src/router.ts(3,34): error TS2307: Cannot find module '@dawmatt/api-grade-core' or its corresponding type declarations.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /home/runner/work/api-grade/api-grade/packages/backstage-plugin-api-grade-backend
npm error workspace @dawmatt/backstage-plugin-api-grade-backend@0.1.3
npm error location /home/runner/work/api-grade/api-grade/packages/backstage-plugin-api-grade-backend
npm error command failed
npm error command sh -c tsc --noEmit
Error: Process completed with exit code 2.

```

## Run 2 2026/06/18

- [x] The publish GitHub Action failed due to the following errors. Everything else in the action appeared to execute correctly.

```
> @dawmatt/api-grade@0.1.4 test:coverage
> vitest run --coverage
 RUN  v1.6.1 /home/runner/work/api-grade/api-grade
      Coverage enabled with v8
 ❯ tests/integration/verbose-errors.test.ts  (4 tests | 2 failed) 151ms
   ❯ tests/integration/verbose-errors.test.ts > --verbose flag (US4 / FR-015 / FR-016) > default mode: shows prompt, numbered header with source location, and no call chain
     → expected 'node:internal/modules/cjs/loader:1433…' to contain 'Error running api-grade! Use --verbos…'
   ❯ tests/integration/verbose-errors.test.ts > --verbose flag (US4 / FR-015 / FR-016) > --verbose mode: shows numbered header with source location, call chain, and no prompt
     → expected 'node:internal/modules/cjs/loader:1433…' to match /Error #1: .+missingfunction\.yaml:\d+…/
 ❯ tests/integration/min-grade.test.ts  (5 tests | 5 failed) 223ms
   ❯ tests/integration/min-grade.test.ts > --min-grade flag > exits 1 when achieved grade is below the required minimum
     → expected 'node:internal/modules/cjs/loader:1433…' to contain 'A'
   ❯ tests/integration/min-grade.test.ts > --min-grade flag > stderr message includes both the achieved grade and required grade
     → expected 'node:internal/modules/cjs/loader:1433…' to contain 'A'
   ❯ tests/integration/min-grade.test.ts > --min-grade flag > exits 0 when achieved grade meets the minimum (museum-api with --min-grade F)
     → expected 1 to be +0 // Object.is equality
   ❯ tests/integration/min-grade.test.ts > --min-grade flag > exits 0 when no --min-grade is set
     → expected 1 to be +0 // Object.is equality
   ❯ tests/integration/min-grade.test.ts > --min-grade flag > exits 1 with error message for invalid grade letter
     → expected 'node:internal/modules/cjs/loader:1433…' to match /invalid|must be one of/i
 ✓ tests/unit/config-loader.test.ts  (5 tests) 8ms
 ❯ tests/integration/custom-ruleset.test.ts  (4 tests | 2 failed) 501ms
   ❯ tests/integration/custom-ruleset.test.ts > --ruleset flag > exits 1 with descriptive error when ruleset file does not exist
     → expected 'node:internal/modules/cjs/loader:1433…' to match /ruleset.*not found|not found.*ruleset/i
   ❯ tests/integration/custom-ruleset.test.ts > --ruleset flag > exits 1 with message naming the URL when ruleset references an unreachable external URL
     → expected 'node:internal/modules/cjs/loader:1433…' to contain 'unreachable.example.invalid'
 ✓ tests/integration/openapi-grading.test.ts  (5 tests) 813ms
 ✓ tests/integration/asyncapi-grading.test.ts  (3 tests) 867ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 9 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/integration/custom-ruleset.test.ts > --ruleset flag > exits 1 with descriptive error when ruleset file does not exist
AssertionError: expected 'node:internal/modules/cjs/loader:1433…' to match /ruleset.*not found|not found.*ruleset/i
- Expected: 
/ruleset.*not found|not found.*ruleset/i
+ Received: 
"node:internal/modules/cjs/loader:1433
  throw err;
  ^
Error: Cannot find module '/home/runner/work/api-grade/api-grade/dist/cli/index.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)

Node.js v22.22.3
"

 ❯ tests/integration/verbose-errors.test.ts:52:20


     32| 
     33|     // Prompt MUST be present in default mode
     34|     expect(stderr).toContain('Error running api-grade! Use --verbose f…
       |                    ^
     35| 
     36|     // Error #1 header MUST include source location prefix: "Error #1:…
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/9]⎯
 FAIL  tests/integration/verbose-errors.test.ts > --verbose flag (US4 / FR-015 / FR-016) > --verbose mode: shows numbered header with source location, call chain, and no prompt
AssertionError: expected 'node:internal/modules/cjs/loader:1433…' to match /Error #1: .+missingfunction\.yaml:\d+…/
- Expected: 
/Error #1: .+missingfunction\.yaml:\d+:\d+ — /
+ Received: 
"node:internal/modules/cjs/loader:1433
  throw err;
  ^
Error: Cannot find module '/home/runner/work/api-grade/api-grade/dist/cli/index.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
Node.js v22.22.3
"
 ❯ tests/integration/verbose-errors.test.ts:52:20
     50| 
     51|     // Error #1 header MUST include source location prefix (same forma…
     52|     expect(stderr).toMatch(/Error #1: .+missingfunction\.yaml:\d+:\d+ …
       |                    ^
     53| 
     54|     // Call chain (indented "at " frames) MUST be present below the he…
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/9]⎯
 Test Files  3 failed | 3 passed (6)
      Tests  9 failed | 17 passed (26)
   Start at  01:09:57
   Duration  3.22s (transform 200ms, setup 1ms, collect 1.87s, tests 2.56s, environment 2ms, prepare 945ms)
Error: Process completed with exit code 1.
```

## Run 3 2026/06/18

- [ ] The publish GitHub Action failed due to the following errors. Everything else in the action appeared to execute correctly.

```
npm warn publish npm auto-corrected some errors in your package.json when publishing.  Please run "npm pkg fix" to address these errors.
npm warn publish errors corrected:
npm warn publish "repository.url" was normalized to "git+https://github.com/DawMatt/api-grade.git"
npm notice
npm notice 📦  @dawmatt/api-grade-core@0.1.5
npm notice Tarball Contents
npm notice 2.4kB README.md
npm notice 217B dist/formats/asyncapi.d.ts
npm notice 257B dist/formats/asyncapi.d.ts.map
npm notice 458B dist/formats/asyncapi.js
npm notice 516B dist/formats/asyncapi.js.map
npm notice 215B dist/formats/openapi.d.ts
npm notice 255B dist/formats/openapi.d.ts.map
npm notice 456B dist/formats/openapi.js
npm notice 514B dist/formats/openapi.js.map
npm notice 245B dist/formatter.d.ts
npm notice 316B dist/formatter.d.ts.map
npm notice 3.8kB dist/formatter.js
npm notice 4.2kB dist/formatter.js.map
npm notice 281B dist/grader.d.ts
npm notice 313B dist/grader.d.ts.map
npm notice 4.7kB dist/grader.js
npm notice 4.3kB dist/grader.js.map
npm notice 501B dist/index.d.ts
npm notice 476B dist/index.d.ts.map
npm notice 259B dist/index.js
npm notice 298B dist/index.js.map
npm notice 497B dist/rulesets/loader.d.ts
npm notice 546B dist/rulesets/loader.d.ts.map
npm notice 3.8kB dist/rulesets/loader.js
npm notice 3.7kB dist/rulesets/loader.js.map
npm notice 452B dist/scorer.d.ts
npm notice 466B dist/scorer.d.ts.map
npm notice 1.2kB dist/scorer.js
npm notice 1.4kB dist/scorer.js.map
npm notice 256B dist/spec-loader.d.ts
npm notice 307B dist/spec-loader.d.ts.map
npm notice 1.5kB dist/spec-loader.js
npm notice 1.5kB dist/spec-loader.js.map
npm notice 248B dist/summariser.d.ts
npm notice 287B dist/summariser.d.ts.map
npm notice 7.8kB dist/summariser.js
npm notice 7.6kB dist/summariser.js.map
npm notice 1.9kB dist/types.d.ts
npm notice 2.0kB dist/types.d.ts.map
npm notice 160B dist/types.js
npm notice 275B dist/types.js.map
npm notice 1.5kB package.json
npm notice Tarball Details
npm notice name: @dawmatt/api-grade-core
npm notice version: 0.1.5
npm notice filename: dawmatt-api-grade-core-0.1.5.tgz
npm notice package size: 15.4 kB
npm notice unpacked size: 62.2 kB
npm notice shasum: 19f2c8d5650855e1a3e3eb593e69e2c544c6987b
npm notice integrity: sha512-JGl9HDcnV16z4[...]GOnbPFbn+fKxw==
npm notice total files: 42
npm notice
npm notice Publishing to https://registry.npmjs.org with tag latest and public access
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/@dawmatt%2fapi-grade-core - Not found
npm error 404
npm error 404  '@dawmatt/api-grade-core@0.1.5' is not in this registry.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-06-18T01_26_08_707Z-debug-0.log
Error: Process completed with exit code 1.
```