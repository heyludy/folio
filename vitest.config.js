import {defineConfig} from 'vitest/config';
import {cloudflareTest} from '@cloudflare/vitest-plugin';
import {passwordHash} from './server/auth.js';
const testKey='test-key-only-not-a-real-secret-123456789',testHash=await passwordHash('qa-publish-passphrase',testKey);
export default defineConfig({
 plugins:[cloudflareTest({wrangler:{configPath:'./wrangler.jsonc'},miniflare:{bindings:{ADMIN_KEY:testKey,PUBLISH_PASSWORD_HASH:testHash,CLOUDFLARE_API_TOKEN:'test-provider-token',ALLOWED_ORIGINS:'https://heyludy.github.io'}}})],
 test:{include:['server/*.test.js']}
});
