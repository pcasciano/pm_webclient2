// see http://www.sencha.com/forum/showthread.php?282933-common-action-for-button-and-menu-item&p=1034815#post1034815
Ext.define('gxp.button.IconButton', {
    extend: 'Ext.button.Button',
    renderTpl: [
        '<span id="{id}-btnWrap" class="{baseCls}-wrap',
            '<tpl if="splitCls"> {splitCls}</tpl>',
            '{childElCls}" unselectable="on">',
            '<span id="{id}-btnEl" class="{baseCls}-button">',
                '<span id="{id}-btnInnerEl" class="{baseCls}-inner {innerCls}',
                    '{childElCls}" unselectable="on">',
                    '&nbsp;',
                '</span>',
                '<span role="img" id="{id}-btnIconEl" class="{baseCls}-icon-el {iconCls}',
                    '{childElCls} {glyphCls}" unselectable="on" style="',
                    '<tpl if="iconUrl">background-image:url({iconUrl});</tpl>',
                    '<tpl if="glyph && glyphFontFamily">font-family:{glyphFontFamily};</tpl>">',
                    '<tpl if="glyph">&#{glyph};</tpl><tpl if="iconCls || iconUrl">&#160;</tpl>',
                '</span>',
            '</span>',
        '</span>',
        // if "closable" (tab) add a close element icon
        '<tpl if="closable">',
            '<span id="{id}-closeEl" class="{baseCls}-close-btn" title="{closeText}" tabIndex="0"></span>',
        '</tpl>'
    ],
    getComponentCls: function() {
        var me = this,
            cls;

        // Check whether the button has an icon or not, and if it has an icon, what is the alignment
        if (me.iconCls || me.icon || me.glyph) {
            cls = ['icon'];
        } else if (me.text) {
            cls = ['noicon'];
        } else {
            cls = [];
        }

        if (me.pressed) {
            cls[cls.length] = me.pressedCls;
        }
        return cls;
    }
});
