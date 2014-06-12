Ext.define('gxp.form.field.FontComboBox', {
    extend: 'Ext.form.field.ComboBox',
    requires: ['Ext.XTemplate'],
    alias: 'widget.gxp_fontcombo',
    fonts: [
        "Serif",
        "SansSerif",
        "Arial",
        "Courier New",
        "Tahoma",
        "Times New Roman",
        "Verdana"
    ],
    defaultFont: "Serif",
    allowBlank: false,
    queryMode: "local",
    triggerAction: "all",
    editable: false,
    initComponent: function() {
        var fonts = this.fonts || gxp.form.field.FontComboBox.prototype.fonts;
        var defaultFont = this.defaultFont;
        if (fonts.indexOf(this.defaultFont) === -1) {
            defaultFont = fonts[0];
        }
        var defConfig = {
            displayField: "field1",
            valueField: "field1",
            store: fonts,
            value: defaultFont,
            tpl: Ext.create('Ext.XTemplate',
                '<tpl for=".">' +
                    '<div class="x-boundlist-item">' +
                    '<span style="font-family: {field1};">{field1}</span>' +
                '</div></tpl>'
            )
        };
        Ext.applyIf(this, defConfig);
        this.callParent(arguments);
    }
});
