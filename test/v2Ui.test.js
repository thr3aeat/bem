const test = require('node:test');
const assert = require('node:assert/strict');
const { panel } = require('../src/modules/v2Ui');

test('panel creates a colorless Components V2 message with title, body, and actions', () => {
    const payload = panel({ title: 'İşlem tamamlandı', body: 'Detay', actions: [{ custom_id: 'close', label: 'Kapat', style: 2 }] });
    assert.equal(payload.components[0].type, 17);
    assert.equal('accent_color' in payload.components[0], false);
    assert.equal(payload.components[0].components.some(component => component.type === 1), true);
});
