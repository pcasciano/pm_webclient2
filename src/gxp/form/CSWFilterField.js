/**
 * @requires OpenLayers/Filter/Comparison.js
 */

Ext.define('gxp.form.CSWFilterField', {
    extend: 'Ext.form.FieldContainer',
    alias: 'widget.gxp_cswfilterfield',
    clearTooltip: "Clear the filter for this category",
    emptyText: 'Select filter',
    property: null,
    map: null,
    type: OpenLayers.Filter.Comparison.EQUAL_TO,
    name: null,
    comboFieldLabel: null,
    comboStoreData: null,
    target: null,
    getFilter: function() {
        if (this.property === 'BoundingBox') {
            return new OpenLayers.Filter.Spatial({
                type: OpenLayers.Filter.Spatial.BBOX,
                property: this.property,
                projection: "EPSG:4326",
                value: this.map.getExtent().transform(
                    this.map.getProjectionObject(),
                    new OpenLayers.Projection("EPSG:4326")
                )
            });
        } else {
            return new OpenLayers.Filter.Comparison({
                type: this.type,
                property: this.property,
                value: this.combo.getValue()
            });
        }
    },
    initComponent: function() {
        this.items = [{
            ref: 'combo',
            xtype: "combo",
            fieldLabel: this.comboFieldLabel,
            store: Ext.create('Ext.data.ArrayStore', {
                fields: ['id', 'value'],
                data: this.comboStoreData
            }),
            displayField: 'value',
            valueField: 'id',
            mode: 'local',
            listeners: {
                'select': function(cmb, record) {
                    if (this.filter) {
                        this.target.removeFilter(this.filter);
                    }
                    this.filter = this.getFilter();
                    this.target.addFilter(this.filter);
                    return false;
                },
                scope: this
            },
            emptyText: this.emptyText,
            triggerAction: 'all'
        }, {
            xtype: 'button',
            iconCls: 'gxp-icon-removelayers',
            tooltip: this.clearTooltip,
            handler: function(btn) {
                this.target.removeFilter(this.filter);
                this.hide();
            },
            scope: this
        }];
        this.hidden = true;
        this.callParent(arguments);
    },
    destroy: function() {
        this.filter = null;
        this.target = null;
        this.map = null;
        this.callParent(arguments);
    }
});
