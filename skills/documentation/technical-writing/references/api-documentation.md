# API Documentation Reference

Document each public endpoint, command, function, event, or schema through the
interface its consumer uses.

Include the applicable fields:

- Purpose and supported use.
- Method and path, command syntax, or function signature.
- Authentication and authorization requirements.
- Parameters, request body, and validation constraints.
- Response schema, output, and status or exit codes.
- Error cases and recovery behavior.
- Side effects, idempotency, pagination, retries, and rate limits.
- Compatibility, versioning, and migration notes.
- One minimal valid example.

Use exact names and values from current code or generated specifications. Do not
invent fields or normalize observed behavior into an undocumented promise.
Separate stable public guarantees from current implementation details.
