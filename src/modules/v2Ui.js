const { ComponentType, MessageFlags } = require('discord.js');

const type = {
    container: ComponentType.Container || 17,
    text: ComponentType.TextDisplay || 10,
    separator: ComponentType.Separator || 14,
    row: ComponentType.ActionRow || 1,
    button: ComponentType.Button || 2,
};

function panel({ title, body, details, actions = [] }) {
    const components = [{ type: type.text, content: `## ${title}` }];
    if (body) components.push({ type: type.text, content: body });
    if (details) components.push({ type: type.separator, divider: true }, { type: type.text, content: details });
    if (actions.length) components.push({ type: type.separator, divider: false }, {
        type: type.row,
        components: actions.map(action => ({ type: type.button, ...action })),
    });
    return { flags: MessageFlags.IsComponentsV2 || (1 << 13), components: [{ type: type.container, components }] };
}

module.exports = { panel };
