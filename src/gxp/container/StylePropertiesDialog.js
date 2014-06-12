Ext.define('gxp.container.StylePropertiesDialog', {
    extend: 'Ext.container.Container',
    alias: 'widget.gxp_stylepropertiesdialog',
    titleText: "General",
    nameFieldText: "Name",
    titleFieldText: "Title",
    abstractFieldText: "Abstract",
    userStyle: null,
    initComponent: function() {
        var listeners = {
            "change": function(field, value) {
                this.userStyle[field.name] = value;
                this.fireEvent("change", this, this.userStyle);
            },
            scope: this
        };
        var defConfig = {
            layout: "form",
            items: [{
                xtype: "fieldset",
                title: this.titleText,
                labelWidth: 75,
                defaults: {
                    xtype: "textfield",
                    anchor: "100%",
                    listeners: listeners
                },
                items: [{
                    xtype: this.initialConfig.nameEditable ? "textfield" : "displayfield",
                    fieldLabel: this.nameFieldText,
                    name: "name",
                    value: this.userStyle.name,
                    maskRe: /[A-Za-z0-9_]/
                }, {
                    fieldLabel: this.titleFieldText,
                    name: "title",
                    value: this.userStyle.title
                }, {
                    xtype: "textarea",
                    fieldLabel: this.abstractFieldText,
                    name: "description",
                    value: this.userStyle.description
                }]
            }]
        };
        Ext.applyIf(this, defConfig);
        this.addEvents(
            "change"
        );
        this.callParent(arguments);
    }
});
