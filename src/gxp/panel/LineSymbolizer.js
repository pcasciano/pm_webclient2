/**
 * @requires form/StrokeSymbolizer.js
 */

Ext.define('gxp.panel.LineSymbolizer', {
    extend: 'Ext.panel.Panel',
    requires: ['gxp.form.StrokeSymbolizer'],
    alias: 'widget.gxp_linesymbolizer',
    symbolizer: null,
    initComponent: function() {
        this.items = [{
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
