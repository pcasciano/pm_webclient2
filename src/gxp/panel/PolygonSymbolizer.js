/**
 * @requires form/FillSymbolizer.js
 * @requires form/StrokeSymbolizer.js
 */

Ext.define('gxp.panel.PolygonSymbolizer', {
    extend: 'Ext.panel.Panel',
    requires: ['gxp.form.FillSymbolizer', 'gxp.form.StrokeSymbolizer'],
    alias: 'widget.gxp_polygonsymbolizer',
    symbolizer: null,
    initComponent: function() {
        this.items = [{
            xtype: "gxp_fillsymbolizer",
            symbolizer: this.symbolizer,
            listeners: {
                change: function(symbolizer) {
                    this.fireEvent("change", this.symbolizer);
                },
                scope: this
            }
        }, {
            xtype: "gxp_strokesymbolizer",
            symbolizer: this.symbolizer,
            listeners: {
                change: function(symbolizer) {
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
