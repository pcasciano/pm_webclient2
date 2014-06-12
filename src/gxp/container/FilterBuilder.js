/**
 * @requires form/FilterField.js
 * @include OpenLayers/Filter/Logical.js
 * @include OpenLayers/Filter/Comparison.js
 */

Ext.define('gxp.container.FilterBuilder', {
    extend: 'Ext.container.Container',
    alias: 'widget.gxp_filterbuilder',
    requires: ['Ext.form.Label', 'Ext.layout.container.Column', 'gxp.form.FilterField'],
    builderTypeNames: ["any", "all", "none", "not all"],
    allowedBuilderTypes: null,
    allowBlank: false,
    caseInsensitiveMatch: false,
    preComboText: "Match",
    postComboText: "of the following:",
    cls: "gxp-filterbuilder",
    builderType: null,
    childFilterContainer: null,
    customizeFilterOnInit: true,
    addConditionText: "add condition",
    addGroupText: "add group",
    removeConditionText: "remove condition",
    allowGroups: true,
    statics: {
        ANY_OF: 0,
        ALL_OF: 1,
        NONE_OF: 2,
        NOT_ALL_OF: 3
    },
    initComponent: function() {
        var defConfig = {
            defaultBuilderType: gxp.container.FilterBuilder.ANY_OF
        };
        Ext.applyIf(this, defConfig);

        if(this.customizeFilterOnInit) {
            this.filter = this.customizeFilter(this.filter);
        }

        this.builderType = this.getBuilderType();

        this.items = [{
            xtype: "container",
            layout: "form",
            ref: "form",
            defaults: {anchor: "100%"},
            hideLabels: true,
            items: [{
                xtype: "fieldcontainer",
                layout: 'hbox',
                style: "padding-left: 2px",
                items: [{
                    xtype: "label",
                    style: "padding-top: 0.3em",
                    text: this.preComboText
                }, this.createBuilderTypeCombo(), {
                    xtype: "label",
                    style: "padding-top: 0.3em",
                    text: this.postComboText
                }]
            }, this.createChildFiltersPanel(), {
                xtype: "toolbar",
                items: this.createToolBar()
            }]

        }];
        this.addEvents(
            "change"
        );

        this.callParent(arguments);
    },
    createToolBar: function() {
        var bar = [{
            text: this.addConditionText,
            iconCls: "add",
            handler: function() {
                this.addCondition();
            },
            scope: this
        }];
        if(this.allowGroups) {
            bar.push({
                text: this.addGroupText,
                iconCls: "add",
                handler: function() {
                    this.addCondition(true);
                },
                scope: this
            });
        }
        return bar;
    },
    getFilter: function() {
        var filter;
        if(this.filter) {
            filter = this.filter.clone();
            if(filter instanceof OpenLayers.Filter.Logical) {
                filter = this.cleanFilter(filter);
            }
        }
        return filter;
    },
    cleanFilter: function(filter) {
        if(filter instanceof OpenLayers.Filter.Logical) {
            if(filter.type !== OpenLayers.Filter.Logical.NOT &&
               filter.filters.length === 1) {
                filter = this.cleanFilter(filter.filters[0]);
            } else {
                var child;
                for(var i=0, len=filter.filters.length; i<len; ++i) {
                    child = filter.filters[i];
                    if(child instanceof OpenLayers.Filter.Logical) {
                        child = this.cleanFilter(child);
                        if(child) {
                            filter.filters[i] = child;
                        } else {
                            filter = child;
                            break;
                        }
                    } else if(!child || child.type === null ||
                              child.property === null || child[filter.type === OpenLayers.Filter.Comparison.BETWEEN ? "lowerBoundary" : "value"] === null) {
                        filter = false;
                        break;
                    }
                }
            }
        } else {
            if(!filter || filter.type === null || filter.property === null ||
               filter[filter.type === OpenLayers.Filter.Comparison.BETWEEN ? "lowerBoundary" : "value"] === null) {
                filter = false;
            }
        }
        return filter;
    },
    customizeFilter: function(filter) {
        if(!filter) {
            filter = this.wrapFilter(this.createDefaultFilter());
        } else {
            filter = this.cleanFilter(filter);
            var child, i, len;
            switch(filter.type) {
                case OpenLayers.Filter.Logical.AND:
                case OpenLayers.Filter.Logical.OR:
                    if(!filter.filters || filter.filters.length === 0) {
                        // give the filter children if it has none
                        filter.filters = [this.createDefaultFilter()];
                    } else {
                        for(i=0, len=filter.filters.length; i<len; ++i) {
                            child = filter.filters[i];
                            if(child instanceof OpenLayers.Filter.Logical) {
                                filter.filters[i] = this.customizeFilter(child);
                            }
                        }
                    }
                    // wrap in a logical OR
                    filter = new OpenLayers.Filter.Logical({
                        type: OpenLayers.Filter.Logical.OR,
                        filters: [filter]
                    });
                    break;
                case OpenLayers.Filter.Logical.NOT:
                    if(!filter.filters || filter.filters.length === 0) {
                        filter.filters = [
                            new OpenLayers.Filter.Logical({
                                type: OpenLayers.Filter.Logical.OR,
                                filters: [this.createDefaultFilter()]
                            })
                        ];
                    } else {
                        // NOT filters should have one child only
                        child = filter.filters[0];
                        if(child instanceof OpenLayers.Filter.Logical) {
                            if(child.type !== OpenLayers.Filter.Logical.NOT) {
                                // check children of AND and OR
                                var grandchild;
                                for(i=0, len=child.filters.length; i<len; ++i) {
                                    grandchild = child.filters[i];
                                    if(grandchild instanceof OpenLayers.Filter.Logical) {
                                        child.filters[i] = this.customizeFilter(grandchild);
                                    }
                                }
                            } else {
                                // silly double negative
                                if(child.filters && child.filters.length > 0) {
                                    filter = this.customizeFilter(child.filters[0]);
                                } else {
                                    filter = this.wrapFilter(this.createDefaultFilter());
                                }
                            }
                        } else {
                            // non-logical child of NOT should be wrapped
                            var type;
                            if(this.defaultBuilderType === gxp.container.FilterBuilder.NOT_ALL_OF) {
                                type = OpenLayers.Filter.Logical.AND;
                            } else {
                                type = OpenLayers.Filter.Logical.OR;
                            }
                            filter.filters = [
                                new OpenLayers.Filter.Logical({
                                    type: type,
                                    filters: [child]
                                })
                            ];
                        }
                    }
                    break;
                default:
                    // non-logical filters get wrapped
                    filter = this.wrapFilter(filter);
                    break;
            }
        }
        return filter;
    },
    createDefaultFilter: function() {
        return new OpenLayers.Filter.Comparison({
                            matchCase: !this.caseInsensitiveMatch});
    },
    wrapFilter: function(filter) {
        var type;
        if(this.defaultBuilderType === gxp.container.FilterBuilder.ALL_OF) {
            type = OpenLayers.Filter.Logical.AND;
        } else {
            type = OpenLayers.Filter.Logical.OR;
        }
        return new OpenLayers.Filter.Logical({
            type: OpenLayers.Filter.Logical.OR,
            filters: [
                new OpenLayers.Filter.Logical({
                    type: type, filters: [filter]
                })
            ]
        });
    },
    addCondition: function(group) {
        var filter, type;
        if(group) {
            type = "gxp_filterbuilder";
            filter = this.wrapFilter(this.createDefaultFilter());
        } else {
            type = "gxp_filterfield";
            filter = this.createDefaultFilter();
        }
        var newChild = this.newRow({
            xtype: type,
            filter: filter,
            columnWidth: 1,
            attributes: this.attributes,
            allowBlank: group ? undefined : this.allowBlank,
            customizeFilterOnInit: group && false,
            caseInsensitiveMatch: this.caseInsensitiveMatch,
            listeners: {
                change: function() {
                    this.fireEvent("change", this);
                },
                scope: this
            }
        });
        this.childFilterContainer.add(newChild);
        this.filter.filters[0].filters.push(filter);
        this.childFilterContainer.doLayout();
    },
    removeCondition: function(item, filter) {
        var parent = this.filter.filters[0].filters;
        if(parent.length > 0) {
            parent.remove(filter);
            this.childFilterContainer.remove(item, true);
        }
        if(parent.length === 0) {
            this.addCondition();
        }
        this.fireEvent("change", this);
    },
    createBuilderTypeCombo: function() {
        var types = this.allowedBuilderTypes || [
            gxp.container.FilterBuilder.ANY_OF, gxp.container.FilterBuilder.ALL_OF,
            gxp.container.FilterBuilder.NONE_OF
        ];
        var numTypes = types.length;
        var data = new Array(numTypes);
        var type;
        for(var i=0; i<numTypes; ++i) {
            type = types[i];
            data[i] = [type, this.builderTypeNames[type]];
        }
        return {
            xtype: "combo",
            store: Ext.create('Ext.data.SimpleStore', {
                data: data,
                fields: ["value", "name"]
            }),
            value: this.builderType,
            ref: "../../builderTypeCombo",
            displayField: "name",
            valueField: "value",
            triggerAction: "all",
            queryMode: "local",
            listeners: {
                select: function(combo, record) {
                    this.changeBuilderType(record.get("value"));
                    this.fireEvent("change", this);
                },
                scope: this
            },
            width: 60 // TODO: move to css
        };
    },
    changeBuilderType: function(type) {
        if(type !== this.builderType) {
            this.builderType = type;
            var child = this.filter.filters[0];
            switch(type) {
                case gxp.container.FilterBuilder.ANY_OF:
                    this.filter.type = OpenLayers.Filter.Logical.OR;
                    child.type = OpenLayers.Filter.Logical.OR;
                    break;
                case gxp.container.FilterBuilder.ALL_OF:
                    this.filter.type = OpenLayers.Filter.Logical.OR;
                    child.type = OpenLayers.Filter.Logical.AND;
                    break;
                case gxp.container.FilterBuilder.NONE_OF:
                    this.filter.type = OpenLayers.Filter.Logical.NOT;
                    child.type = OpenLayers.Filter.Logical.OR;
                    break;
                case gxp.container.FilterBuilder.NOT_ALL_OF:
                    this.filter.type = OpenLayers.Filter.Logical.NOT;
                    child.type = OpenLayers.Filter.Logical.AND;
                    break;
            }
        }
    },
    createChildFiltersPanel: function() {
        this.childFilterContainer = Ext.create('Ext.Container');
        var grandchildren = this.filter.filters[0].filters;
        var grandchild;
        for(var i=0, len=grandchildren.length; i<len; ++i) {
            grandchild = grandchildren[i];
            var fieldCfg = {
                xtype: "gxp_filterfield",
                allowBlank: this.allowBlank,
                columnWidth: 1,
                filter: grandchild,
                attributes: this.attributes,
                listeners: {
                    change: function() {
                        this.fireEvent("change", this);
                    },
                    scope: this
                }
            };
            var containerCfg = Ext.applyIf(
                grandchild instanceof OpenLayers.Filter.Logical ?
                    {
                        xtype: "gxp_filterbuilder"
                    } : {
                        xtype: "container",
                        layout: "form",
                        hideLabels: true,
                        items: fieldCfg
                    }, fieldCfg);

            this.childFilterContainer.add(this.newRow(containerCfg));
        }
        return this.childFilterContainer;
    },
    newRow: function(filterContainer) {
        var ct = Ext.create('Ext.Container', {
            layout: "column",
            items: [{
                xtype: "container",
                width: 28,
                height: 26,
                style: "padding-left: 2px",
                items: {
                    xtype: "button",
                    tooltip: this.removeConditionText,
                    iconCls: "delete",
                    handler: function(btn){
                        this.removeCondition(ct, filterContainer.filter);
                    },
                    scope: this
                }
            }, filterContainer]
        });
        return ct;
    },
    getBuilderType: function() {
        var type = this.defaultBuilderType;
        if(this.filter) {
            var child = this.filter.filters[0];
            if(this.filter.type === OpenLayers.Filter.Logical.NOT) {
                switch(child.type) {
                    case OpenLayers.Filter.Logical.OR:
                        type = gxp.container.FilterBuilder.NONE_OF;
                        break;
                    case OpenLayers.Filter.Logical.AND:
                        type = gxp.container.FilterBuilder.NOT_ALL_OF;
                        break;
                }
            } else {
                switch(child.type) {
                    case OpenLayers.Filter.Logical.OR:
                        type = gxp.container.FilterBuilder.ANY_OF;
                        break;
                    case OpenLayers.Filter.Logical.AND:
                        type = gxp.container.FilterBuilder.ALL_OF;
                        break;
                }
            }
        }
        return type;
    },
    setFilter: function(filter) {
        this.filter = this.customizeFilter(filter);
        this.changeBuilderType(this.getBuilderType());
        this.builderTypeCombo.setValue(this.builderType);
        this.form.remove(this.childFilterContainer);
        this.form.insert(1, this.createChildFiltersPanel());
        this.form.doLayout();
        this.fireEvent("change", this);
    }
});
