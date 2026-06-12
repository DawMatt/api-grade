# Repository Goal

## Purpose

Create a consistent way to grade API quality and share diagnostics to help with improving quality.

## Features

Feature 1 - Base CLI

- Setup a CLI that grades API quality, and shares diagnostics about highest value areas to focus on improving
- Demonstrate the capability using OpenAPI and AsyncAPI specifications, including both low and high quality samples
- Allow for the CLI to be used in CI/CD pipelines. Support the ability for a minimum grade level to be defined, and trigger the pipeline to fail if that minimum grade level is not met
- Support both local and containerised execution of the CLI.
- Allow users to supply a custom spectral ruleset to use as the basis for assessing grades

Feature 2 - Backstage API page

- Enable the same API quality grading and diagnostic information to be exposed on a Backstage API page. Default to showing this in the Info column below the About entry. 
- Allow users to supply a custom spectral ruleset to use as the basis for assessing grades. This may be located in a secured location such as a private GitHub Enterprise repository.
- By default all API quality feaures (e.g. Spectral and API grading) will be visible only to the API owner. Additional groups can be granted visibility as well, or visibility can be made allow all.

## Constitution

- API grading will provide functionality similar to the API grading and diagnostics capabilities found in OpenAPI Doctor: https://github.com/pb33f/doctor
- All API grading and diagnostics functionality will support multiple API specification formats. This includes OpenAPI and AsyncAPI.
- All features will share a single, consistent implementation of the core grades and diagnostics functionality. The features will then use this core functionality in the way most appropriate for that feature.
- Users will be able to supply a custom spectral ruleset to use as the basis for grades and diagnostics.
- Maintain and use a test suite to ensure the specification has been delivered.
- Support current Windows and MacOS environments, at a minimum.
- Expect to deploy both containerised and local versions of functionality.
- Identify all pre-requisites necessary for the functionality to run correctly, and how to source them.
- The cost for all pre-requisites must be $0. Do not require any pre-requisites that have a cost associated with them. 
- Ultimately API grading is about teaching users good API development practices. To help reinforce this the project will use modern, well designed API examples such as Redocly's Museum API ( https://github.com/Redocly/museum-openapi-example ) or the Train Travel API ( https://github.com/bump-sh-examples/train-travel-api ).
