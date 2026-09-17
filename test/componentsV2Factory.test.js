const test = require('node:test');
const assert = require('node:assert/strict');
const ComponentsV2Factory = require('../src/modules/componentsV2Factory');

test('audit scan card does not create a section without an accessory', () => {
    const payload = ComponentsV2Factory.buildAuditScanV2({
        toplamMesaj: 1, tekilKullanici: 1, sunucudaMevcut: 1,
        zatenRoluOlan: 1, yeniRolVerilen: 0, gruptaOlan: 1, kanalId: '123',
    });
    const components = payload.components[0].components;

    assert.equal(components.some(component => component.type === 9 && !component.accessory), false);
});
