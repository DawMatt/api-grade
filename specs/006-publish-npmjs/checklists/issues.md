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