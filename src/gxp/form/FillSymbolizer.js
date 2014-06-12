/**
 * @requires form/field/Color.js
 * @requires GeoExt/slider/Tip.js
 */

Ext.define('gxp.form.FillSymbolizer', {
    extend: 'Ext.form.FormPanel',
    alias: 'widget.gxp_fillsymbolizer',
    requires: ['gxp.form.field.Color', 'GeoExt.slider.Tip'],
    symbolizer: null,
    colorProperty: "fillColor",
    opacityProperty: "fillOpacity",
    colorManager: null,
    checkboxToggle: true,
    defaultColor: null,
    border: false,
    fillText: "Fill",
    colorText: "Color",
    opacityText: "Opacity",
    initComponent: function() {

        if(!this.symbolizer) {
            this.symbolizer = {};
        }

        var colorFieldPlugins;
        if (this.colorManager) {
            colorFieldPlugins = [new this.colorManager()];
        }

        var sliderValue = 100;
        if (this.opacityProperty in this.symbolizer) {
            sliderValue = this.symbolizer[this.opacityProperty]*100;
        }
        else if (OpenLayers.Renderer.defaultSymbolizer[this.opacityProperty]) {
            sliderValue = OpenLayers.Renderer.defaultSymbolizer[this.opacityProperty]*100;
        }

        this.items = [{
            xtype: "fieldset",
            title: this.fillText,
            autoHeight: true,
            checkboxToggle: this.checkboxToggle,
            collapsed: this.checkboxToggle === true &&
                this.symbolizer.fill === false,
            hideMode: "offsets",
            defaults: {
                width: 200
            },
            items: [{
                xtype: "gxp_colorfield",
                fieldLabel: this.colorText,
                name: "color",
                emptyText: OpenLayers.Renderer.defaultSymbolizer[this.colorProperty],
                value: this.symbolizer[this.colorProperty],
                defaultBackground: this.defaultColor ||
                    OpenLayers.Renderer.defaultSymbolizer[this.colorProperty],
                plugins: colorFieldPlugins,
                listeners: {
                    change: function(field) {
                        var newValue = field.getValue();
                        var modified = this.symbolizer[this.colorProperty] != newValue;
                        this.symbolizer[this.colorProperty] = newValue;
                        modified && this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                }
            }, {
                xtype: "slider",
                fieldLabel: this.opacityText,
                name: "opacity",
                values: [sliderValue],
                isFormField: true,
                listeners: {
                    changecomplete: function(slider, value) {
                        this.symbolizer[this.opacityProperty] = value / 100;
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                },
                plugins: [
                    Ext.create('GeoExt.slider.Tip', {
                        getText: function(thumb) {
                            return thumb.value + "%";
                        }
                    })
                ]
            }],
            listeners: {
                "collapse": function() {
                    if (this.symbolizer.fill !== false) {
                        this.symbolizer.fill = false;
                        this.fireEvent("change", this.symbolizer);
                    }
                },
                "expand": function() {
                    this.symbolizer.fill = true;
                    this.fireEvent("change", this.symbolizer);
                },
                scope: this
            }
        }];
        this.addEvents(
            "change"
        );
        this.callParent(arguments);
    }
});
