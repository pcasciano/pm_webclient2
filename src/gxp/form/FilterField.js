/**
 * @requires form/ComparisonComboBox.js
 * @requires GeoExt/data/AttributeStore.js
 */

Ext.define('gxp.form.FilterField', {
    extend: 'Ext.form.FieldContainer',
    alias: 'widget.gxp_filterfield',
    requires: ['gxp.form.ComparisonComboBox', 'GeoExt.data.AttributeStore'],
    lowerBoundaryTip: "lower boundary",
    upperBoundaryTip: "upper boundary",
    caseInsensitiveMatch: false,
    filter: null,
    attributes: null,
    attributesComboConfig: null,
    layout: 'hbox',
    initComponent: function() {

        if(!this.filter) {
            this.filter = this.createDefaultFilter();
        }
        // Maintain compatibility with QueryPanel, which relies on "remote"
        // mode and the filterBy filter applied in it's attributeStore's load
        // listener *after* the initial combo filtering.
        //TODO Assume that the AttributeStore is already loaded and always
        // create a new one without geometry fields.
        var mode = "remote", attributes = Ext.create('GeoExt.data.AttributeStore');
        if (this.attributes) {
            if (this.attributes.getCount() != 0) {
                mode = "local";
                this.attributes.each(function(r) {
                    var match = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/.exec(r.get("type"));
                    match || attributes.add([r]);
                });
            } else {
                attributes = this.attributes;
            }
        }
        var defAttributesComboConfig = {
            xtype: "combo",
            store: attributes,
            editable: mode == "local",
            typeAhead: true,
            forceSelection: true,
            queryMode: mode,
            triggerAction: "all",
            ref: "property",
            allowBlank: this.allowBlank,
            displayField: "name",
            valueField: "name",
            value: this.filter.property,
            listeners: {
                select: function(combo, records) {
                    record = records[0];
                    this.items.get(1).enable();
                    this.filter.property = record.get("name");
                    this.fireEvent("change", this.filter, this);
                },
                // workaround for select event not being fired when tab is hit
                // after field was autocompleted with forceSelection
                "blur": function(combo) {
                    var index = combo.store.findExact("name", combo.getValue());
                    if (index != -1) {
                        combo.fireEvent("select", combo, [combo.store.getAt(index)]);
                    } else if (combo.startValue != null) {
                        combo.setValue(combo.startValue);
                    }
                },
                scope: this
            },
            width: 120
        };
        this.attributesComboConfig = this.attributesComboConfig || {};
        Ext.applyIf(this.attributesComboConfig, defAttributesComboConfig);

        this.items = this.createFilterItems();

        this.addEvents(
            /**
             * Event: change
             * Fires when the filter changes.
             *
             * Listener arguments:
             * filter - {OpenLayers.Filter} This filter.
             * this - {gxp.form.FilterField} (TODO change sequence of event parameters)
             */
            "change"
        );

        this.callParent(arguments);
    },
    validateValue: function(value, preventMark) {
        if (this.filter.type === OpenLayers.Filter.Comparison.BETWEEN) {
            return (this.filter.property !== null && this.filter.upperBoundary !== null &&
                this.filter.lowerBoundary !== null);
        } else {
            return (this.filter.property !== null &&
                this.filter.value !== null && this.filter.type !== null);
        }
    },
    createDefaultFilter: function() {
        return new OpenLayers.Filter.Comparison({matchCase: !this.caseInsensitiveMatch});
    },
    createFilterItems: function() {
        var isBetween = this.filter.type === OpenLayers.Filter.Comparison.BETWEEN;
        return [
            this.attributesComboConfig, Ext.applyIf({
                xtype: "gxp_comparisoncombo",
                ref: "type",
                disabled: this.filter.property == null,
                allowBlank: this.allowBlank,
                value: this.filter.type,
                listeners: {
                    select: function(combo, records) {
                        var record = records[0];
                        this.items.get(2).enable();
                        this.items.get(3).enable();
                        this.items.get(4).enable();
                        this.setFilterType(record.get("value"));
                        this.fireEvent("change", this.filter, this);
                    },
                    scope: this
                }
            }, this.comparisonComboConfig), {
                xtype: "textfield",
                disabled: this.filter.type == null,
                hidden: isBetween,
                ref: "value",
                value: this.filter.value,
                width: 50,
                grow: true,
                growMin: 50,
                anchor: "100%",
                allowBlank: this.allowBlank,
                listeners: {
                    "change": function(field, value) {
                        this.filter.value = value;
                        this.fireEvent("change", this.filter, this);
                    },
                    scope: this
                }
            }, {
                xtype: "textfield",
                disabled: this.filter.type == null,
                hidden: !isBetween,
                value: this.filter.lowerBoundary,
                tooltip: this.lowerBoundaryTip,
                grow: true,
                growMin: 30,
                ref: "lowerBoundary",
                anchor: "100%",
                allowBlank: this.allowBlank,
                listeners: {
                    "change": function(field, value) {
                        this.filter.lowerBoundary = value;
                        this.fireEvent("change", this.filter, this);
                    },
                    "render": function(c) {
                        Ext.QuickTips.register({
                            target: c.getEl(),
                            text: this.lowerBoundaryTip
                        });
                    },
                    "autosize": function(field, width) {
                        field.setWidth(width);
                        field.ownerCt.doLayout();
                    },
                    scope: this
                }
            }, {
                xtype: "textfield",
                disabled: this.filter.type == null,
                hidden: !isBetween,
                grow: true,
                growMin: 30,
                ref: "upperBoundary",
                value: this.filter.upperBoundary,
                allowBlank: this.allowBlank,
                listeners: {
                    "change": function(field, value) {
                        this.filter.upperBoundary = value;
                        this.fireEvent("change", this.filter, this);
                    },
                    "render": function(c) {
                        Ext.QuickTips.register({
                            target: c.getEl(),
                            text: this.upperBoundaryTip
                        });
                    },
                    scope: this
                }
            }
        ];
    },
    setFilterType: function(type) {
        this.filter.type = type;
        if (type === OpenLayers.Filter.Comparison.BETWEEN) {
            this.items.get(2).hide();
            this.items.get(3).show();
            this.items.get(4).show();
        } else {
            this.items.get(2).show();
            this.items.get(3).hide();
            this.items.get(4).hide();
        }
        this.doLayout();
    },
    setFilter: function(filter) {
        var previousType = this.filter.type;
        this.filter = filter;
        if (previousType !== filter.type) {
            this.setFilterType(filter.type);
        }
        this['property'].setValue(filter.property);
        this['type'].setValue(filter.type);
        if (filter.type === OpenLayers.Filter.Comparison.BETWEEN) {
            this['lowerBoundary'].setValue(filter.lowerBoundary);
            this['upperBoundary'].setValue(filter.upperBoundary);
        } else {
            this['value'].setValue(filter.value);
        }
        this.fireEvent("change", this.filter, this);
    }
});
