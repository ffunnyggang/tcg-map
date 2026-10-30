const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../admin-main-banners.js','utf8');
const safeCode=source.match(/const safe=value=>\{[\s\S]*?\};/)[0];
const localCode=source.match(/const local=value=>[^\n]+/)[0];
const isoCode=source.match(/const iso=value=>[^\n]+/)[0];
const scope={URL,Date};vm.createContext(scope);vm.runInContext(safeCode+'\n'+localCode+'\n'+isoCode+'\nthis.test={safe,local,iso}',scope);
assert.equal(scope.test.local('2026-10-31T00:00:00Z'),'2026-10-31T09:00');assert.equal(scope.test.iso('2026-10-31T09:00'),'2026-10-31T00:00:00.000Z');assert.equal(scope.test.iso(''),null);
assert.equal(scope.test.safe('/shops.html'),'https://funypin.kr/shops.html');assert.equal(scope.test.safe('javascript:alert(1)'),null);assert.equal(scope.test.safe('https://user:password@example.com'),null);
console.log('PASS: KST reservation conversion, relative URLs, unsafe URL rejection');
