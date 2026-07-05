import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: 'axios',
  input: 'http://localhost:8080/v3/api-docs',
  output: 'src/api/generated',
});
