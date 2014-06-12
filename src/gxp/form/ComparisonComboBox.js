/**
 * @requires OpenLayers/Filter/Comparison.js
 */

Ext.define('gxp.form.ComparisonComboBox', {
    extend: 'Ext.form.ComboBox',
    allowedTypes: [
        [OpenLayers.Filter.Comparison.EQUAL_TO, "="],
        [OpenLayers.Filter.Comparison.NOT_EQUAL_TO, "<>"],
        [OpenLayers.Filter.Comparison.LESS_THAN, "<"],
        [OpenLayers.Filter.Comparison.GREATER_THAN, ">"],
        [OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO, "<="],
        [OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO, ">="],
        [OpenLayers.Filter.Comparison.LIKE, "like"],
        [OpenLayers.Filter.Comparison.BETWEEN, "between"]
    ],
    alias: 'widget.gxp_comparisoncombo',
    allowBlank: false,
    queryMode: "local",
    typeAhead: true,
    forceSelection: true,
    triggerAction: "all",
    width: 50,
    editable: true,
    initComponent: function() {
        var defConfig = {
            store: Ext.create('Ext.data.ArrayStore', {
                data: this.allowedTypes,
                fields: ["value", "text"]
            }),
            value: (this.value === undefined) ? this.allowedTypes[0][0] : this.value,
            listeners: {
                // workaround for select event not being fired when tab is hit
                // after field was autocompleted with forceSelection
                "blur": function() {
                    var index = this.store.findExact("value", this.getValue());
                    if (index != -1) {
                        this.fireEvent("select", this, this.store.getAt(index));
                    } else if (this.startValue != null) {
                        this.setValue(this.startValue);
                    }
                }
            }
        };
        Ext.applyIf(this, defConfig);
        this.callParent(arguments);
    }
});
