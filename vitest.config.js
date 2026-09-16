import {defineConfig} from 'vitest/config';
import {cloudflareTest} from '@cloudflare/vitest-plugin';
export default defineConfig({
 plugins:[cloudflareTest({wrangler:{configPath:'./wrangler.jsonc'},miniflare:{bindings:{ADMIN_KEY:'test-key-only-not-a-real-secret-123456789',CLOUDFLARE_API_TOKEN:'test-provider-token',ALLOWED_ORIGINS:'https://heyludy.github.io'}}})],
 test:{include:['server/*.test.js']}
});
