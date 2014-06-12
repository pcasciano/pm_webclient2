/**
 * @requires util.js
 */

Ext.define('gxp.container.EmbedMapDialog', {
    extend: 'Ext.container.Container',
    requires: ['Ext.data.SimpleStore', 'Ext.form.ComboBox', 'Ext.form.TextArea', 'Ext.form.NumberField'],
    alias: 'widget.gxp_embedmapdialog',
    url: null,
    publishMessage: "Your map is ready to be published to the web! Simply copy the following HTML to embed the map in your website:",
    heightLabel: 'Height',
    widthLabel: 'Width',
    mapSizeLabel: 'Map Size',
    miniSizeLabel: 'Mini',
    smallSizeLabel: 'Small',
    premiumSizeLabel: 'Premium',
    largeSizeLabel: 'Large',
    snippetArea: null,
    heightField: null,
    widthField: null,
    initComponent: function() {
        Ext.apply(this, this.getConfig());
        this.callParent(arguments);
    },
    getIframeHTML: function() {
        return this.snippetArea.getValue();
    },
    updateSnippet: function() {
        this.snippetArea.setValue(
            '<iframe style="border: none;" height="' + this.heightField.getValue() +
            '" width="' + this.widthField.getValue() +'" src="' +
            gxp.util.getAbsoluteUrl(this.url) + '"></iframe>');
        if (this.snippetArea.isVisible() === true) {
            this.snippetArea.focus(true, 100);
        }
    },
    getConfig: function() {
        this.snippetArea = Ext.create('Ext.form.TextArea', {
            height: 70,
            selectOnFocus: true,
            readOnly: true
        });

        var numFieldListeners = {
            "change": this.updateSnippet,
            "specialkey": function(f, e) {
                e.getKey() == e.ENTER && this.updateSnippet();
            },
            scope: this
        };

        this.heightField = Ext.create('Ext.form.NumberField', {
            width: 50,
            value: 400,
            listeners: numFieldListeners
        });
        this.widthField = Ext.create('Ext.form.NumberField', {
            width: 50,
            value: 600,
            listeners: numFieldListeners
        });

        var adjustments = Ext.create('Ext.container.Container', {
            layout: "column",
            defaults: {
                border: false,
                xtype: "box"
            },
            items: [
                {autoEl: {cls: "gxp-field-label", html: this.mapSizeLabel}},
                Ext.create('Ext.form.ComboBox', {
                    editable: false,
                    width: 75,
                    store: Ext.create('Ext.data.SimpleStore', {
                        fields: ["name", "height", "width"],
                        data: [
                            [this.miniSizeLabel, 100, 100],
                            [this.smallSizeLabel, 200, 300],
                            [this.largeSizeLabel, 400, 600],
                            [this.premiumSizeLabel, 600, 800]
                        ]
                    }),
                    triggerAction: 'all',
                    displayField: 'name',
                    value: this.largeSizeLabel,
                    queryMode: 'local',
                    listeners: {
                        "select": function(combo, record, index) {
                            this.widthField.setValue(record.get("width"));
                            this.heightField.setValue(record.get("height"));
                            this.updateSnippet();
                        },
                        scope: this
                    }
                }),
                {autoEl: {cls: "gxp-field-label", html: this.heightLabel}},
                this.heightField,
                {autoEl: {cls: "gxp-field-label", html: this.widthLabel}},
                this.widthField
            ]
        });

        return {
            border: false,
            defaults: {
                border: false,
                cls: "gxp-export-section",
                xtype: "container",
                layout: "fit"
            },
            items: [{
                items: [adjustments]
            }, {
                xtype: "box",
                autoEl: {
                    tag: "p",
                    html: this.publishMessage
                }
            }, {
                items: [this.snippetArea]
            }],
            listeners: {
                "afterrender": this.updateSnippet,
                scope: this
            }
        };
    }
});
