import test from 'node:test';
import assert from 'node:assert/strict';
import {emailHref,mapHref,linkedText} from '../src/links.js';
import {newSite} from '../src/model.js';
import {exportSite} from '../.test-build/export.js';

test('email links encode local parts and reject extra recipients, headers, and line breaks',()=>{
 assert.equal(emailHref(' heoe@snu.ac.kr '),'mailto:heoe@snu.ac.kr');
 assert.equal(emailHref('prof+research@example.edu'),'mailto:prof%2Bresearch@example.edu');
 assert.equal(emailHref('name@example.edu?bcc=other@example.edu'),null);assert.equal(emailHref('name@example.edu\r\nBcc:other@example.edu'),null);
});
test('URL and email linking preserves punctuation, balanced parentheses, and safe protocols',()=>{
 const text='Read https://example.edu/paper_(2026). Email prof@example.edu, or www.example.edu.';
 const parts=linkedText(text);assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href),['https://example.edu/paper_(2026)','mailto:prof@example.edu','https://www.example.edu/']);
 assert.deepEqual(linkedText('javascript:alert(1)'),[{text:'javascript:alert(1)'}]);
});
test('exported contacts and links are usable anchors and user text remains escaped',()=>{
 const site=newSite();site.sections[0].text.en.body='Paper: https://example.edu/?x=1&y=2 <script>alert(1)</script>';
 site.sections.at(-1).text.en.email='heoe@snu.ac.kr';site.sections.at(-1).text.en.office='Building 38, Seoul';
 const html=exportSite(site);assert.match(html,/href="mailto:heoe@snu.ac.kr"/);assert.match(html,/href="https:\/\/example.edu\/\?x=1&amp;y=2"/);
 assert.match(html,/maps\/search\/\?api=1&amp;query=Building%2038%2C%20Seoul/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);assert.equal(mapHref(''),null);
});
