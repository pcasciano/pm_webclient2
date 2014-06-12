/**
 * @requires form/field/Color.js
 * @requires GeoExt/slider/Tip.js
 */

Ext.define('gxp.form.StrokeSymbolizer', {
    extend: 'Ext.form.FormPanel',
    alias: 'widget.gxp_strokesymbolizer',
    requires: ['GeoExt.slider.Tip', 'gxp.form.field.Color'],
    symbolizer: null,
    solidStrokeName: "solid",
    dashStrokeName: "dash",
    dotStrokeName: "dot",
    titleText: "Stroke",
    styleText: "Style",
    colorText: "Color",
    widthText: "Width",
    opacityText: "Opacity",
    colorManager: null,
    checkboxToggle: true,
    defaultColor: null,
    dashStyles: null,
    border: false,
    initComponent: function() {

        this.dashStyles = this.dashStyles || [["solid", this.solidStrokeName], ["4 4", this.dashStrokeName], ["2 4", this.dotStrokeName]];

        if(!this.symbolizer) {
            this.symbolizer = {};
        }

        var colorFieldPlugins;
        if (this.colorManager) {
            colorFieldPlugins = [new this.colorManager];
        }

        this.items = [{
            xtype: "fieldset",
            title: this.titleText,
            autoHeight: true,
            checkboxToggle: this.checkboxToggle,
            collapsed: this.checkboxToggle === true &&
                this.symbolizer.stroke === false,
            hideMode: "offsets",
            defaults: {
                width: 200 // TODO: move to css
            },
            items: [{
                xtype: "combo",
                name: "style",
                fieldLabel: this.styleText,
                store: Ext.create('Ext.data.SimpleStore', {
                    data: this.dashStyles,
                    fields: ["value", "display"]
                }),
                displayField: "display",
                valueField: "value",
                value: this.getDashArray(this.symbolizer.strokeDashstyle) || OpenLayers.Renderer.defaultSymbolizer.strokeDashstyle,
                mode: "local",
                allowBlank: true,
                triggerAction: "all",
                editable: false,
                listeners: {
                    select: function(combo, records) {
                        var record = records[0];
                        this.symbolizer.strokeDashstyle = record.get("value");
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                }
            }, {
                xtype: "gxp_colorfield",
                name: "color",
                fieldLabel: this.colorText,
                emptyText: OpenLayers.Renderer.defaultSymbolizer.strokeColor,
                value: this.symbolizer.strokeColor,
                defaultBackground: this.defaultColor ||
                    OpenLayers.Renderer.defaultSymbolizer.strokeColor,
                plugins: colorFieldPlugins,
                listeners: {
                    change: function(field) {
                        var newValue = field.getValue();
                        var modified = this.symbolizer.strokeColor != newValue;
                        this.symbolizer.strokeColor = newValue;
                        modified && this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                }
            }, {
                xtype: "numberfield",
                hideTrigger: true,
                keyNavEnabled: false,
                mouseWheelEnabled: false,
                name: "width",
                fieldLabel: this.widthText,
                minValue: 0,
                emptyText: OpenLayers.Renderer.defaultSymbolizer.strokeWidth,
                value: this.symbolizer.strokeWidth,
                listeners: {
                    change: function(field, value) {
                        value = parseFloat(value);
                        if (isNaN(value)) {
                            delete this.symbolizer.strokeWidth;
                        } else {
                            this.symbolizer.strokeWidth = value;
                        }
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                }
            }, {
                xtype: "slider",
                name: "opacity",
                fieldLabel: this.opacityText,
                values: [(("strokeOpacity" in this.symbolizer) ? this.symbolizer.strokeOpacity : OpenLayers.Renderer.defaultSymbolizer.strokeOpacity) * 100],
                isFormField: true,
                listeners: {
                    changecomplete: function(slider, value) {
                        this.symbolizer.strokeOpacity = value / 100;
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
                    if (this.symbolizer.stroke !== false) {
                        this.symbolizer.stroke = false;
                        this.fireEvent("change", this.symbolizer);
                    }
                },
                "expand": function() {
                    this.symbolizer.stroke = true;
                    this.fireEvent("change", this.symbolizer);
                },
                scope: this
            }
        }];
        this.addEvents(
            "change"
        );
        this.callParent(arguments);
    },
    getDashArray: function(style) {
        var array;
        if (style) {
            var parts = style.split(/\s+/);
            var ratio = parts[0] / parts[1];
            if (!isNaN(ratio)) {
                array = ratio >= 1 ? "4 4" : "2 4";
            }
        }
        return array;
    }
});
