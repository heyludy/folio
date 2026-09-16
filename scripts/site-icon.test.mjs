import test from 'node:test';
import assert from 'node:assert/strict';
import {exportSite} from '../.test-build/export.js';
import {newSite} from '../src/model.js';
import {siteIconSvg,siteIconSource} from '../src/siteIcon.js';
import {publishBundle} from '../src/publishing.js';
import {packAssets,unpackAssets} from '../src/cloudAssets.js';

test('professor pages share one default mark, colored by their theme',()=>{
 const heo=newSite(),other=newSite();heo.sections[0].text.en.title='Eunnyeong Heo';other.sections[0].text.en.title='Geoffrey Hinton';
 assert.equal(siteIconSvg(heo),siteIconSvg(other));
 heo.icon={text:'EH'};assert.equal(siteIconSvg(heo),siteIconSvg(other),'old initials do not override the shared mark');
 heo.theme='plum';assert.match(siteIconSvg(heo),/#4e2a84/);assert.notEqual(siteIconSvg(heo),siteIconSvg(other));
 const html=exportSite(heo),icon=html.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)"/);
 assert.ok(icon);assert.equal(decodeURIComponent(icon[1]),'data:image/svg+xml,'+siteIconSvg(heo));assert.doesNotMatch(siteIconSvg(heo),/<text/);
});

test('uploaded project logos survive cloud packing and become deployable icon files',async()=>{
 const site=newSite(),image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8i8AAAAASUVORK5CYII=';
 site.icon={image};const files=new Map();
 const packed=await packAssets(site,async(hash,bytes)=>files.set(hash,bytes));
 const restored=await unpackAssets(packed,async hash=>files.get(hash));assert.equal(restored.icon.image,image);
 assert.match(exportSite(restored),/<link rel="icon" type="image\/png"/);
 const bundle=await publishBundle(exportSite(restored)),html=Buffer.from(bundle.files[0].content,'base64').toString();
 const path=html.match(/<link rel="icon"[^>]+href="\/([^"]+)"/)[1];assert.ok(bundle.files.some(file=>file.path===path));
 assert.doesNotMatch(html,/data:image\/png;base64/);
});

test('untrusted icon metadata cannot inject markup or load arbitrary URLs',()=>{
 const site=newSite();site.icon={text:'"><script>alert(1)</script>',image:'javascript:alert(1)'};
 assert.match(siteIconSource(site),/^data:image\/svg\+xml,/);assert.doesNotMatch(exportSite(site),/javascript:alert|<script>alert/);
 site.icon.image='data:image/svg+xml,<svg onload="alert(1)"/>';assert.doesNotMatch(exportSite(site),/onload/);
 site.icon.image='https://untrusted.example/tracker.png';assert.doesNotMatch(exportSite(site),/untrusted.example/);
});
