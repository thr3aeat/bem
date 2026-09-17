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

function fromEmbed(embed) {
    const data = embed?.data || embed || {};
    const details = [
        data.fields?.map(field => `**${field.name}**\n${field.value}`).join('\n\n'),
        data.footer?.text ? `-# ${data.footer.text}` : null,
    ].filter(Boolean).join('\n\n');
    return panel({ title: data.title || 'Sistem Bildirimi', body: data.description || '', details });
}

module.exports = { panel, fromEmbed };
