function subscriberAllowedMentions() {
    return {
        parse: ['users'],
        roles: [],
        repliedUser: false,
    };
}

function subscriberPayload(payload) {
    return {
        ...payload,
        allowedMentions: subscriberAllowedMentions(),
    };
}

module.exports = { subscriberAllowedMentions, subscriberPayload };
