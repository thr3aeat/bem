const test = require('node:test');
const assert = require('node:assert/strict');

const { AXOLOTL_STATUSES, createPresenceRotator, startPresenceRotation } = require('../src/modules/axolotlPersonality');

test('presence rotator applies a status immediately and then advances through its pool', () => {
    const activities = [];
    let scheduled;
    const rotator = createPresenceRotator(
        { user: { setActivity: (name, options) => activities.push({ name, options }) } },
        callback => { scheduled = callback; return 'timer'; },
    );

    rotator.start();
    scheduled();

    assert.equal(AXOLOTL_STATUSES.length > 1, true);
    assert.deepEqual(activities, [
        { name: AXOLOTL_STATUSES[0], options: { type: 4 } },
        { name: AXOLOTL_STATUSES[1], options: { type: 4 } },
    ]);
});

test('presence rotator does not create a second interval after it starts', () => {
    let intervalCalls = 0;
    const rotator = createPresenceRotator(
        { user: { setActivity: () => {} } },
        () => { intervalCalls += 1; return 'timer'; },
    );

    rotator.start();
    rotator.start();

    assert.equal(intervalCalls, 1);
});

test('startPresenceRotation reuses the existing rotator for the same client', () => {
    let intervalCalls = 0;
    const client = { user: { setActivity: () => {} } };
    const schedule = () => { intervalCalls += 1; return 'timer'; };

    startPresenceRotation(client, schedule);
    startPresenceRotation(client, schedule);

    assert.equal(intervalCalls, 1);
});
