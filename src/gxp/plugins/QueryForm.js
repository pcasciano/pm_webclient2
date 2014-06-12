/**
 * @requires plugins/Tool.js
 * @include container/FilterBuilder.js
 */

Ext.define('gxp.plugins.QueryForm', {
    extend: 'gxp.plugins.Tool',
    requires: ['Ext.window.MessageBox', 'Ext.layout.container.Form', 'Ext.form.FieldSet', 'gxp.container.FilterBuilder'],
    alias: 'plugin.gxp_queryform',
    featureManager: null,
    autoHide: false,
    schema: null,
    queryActionText: "Query",
    cancelButtonText: "Cancel",
    queryMenuText: "Query layer",
    queryActionTip: "Query the selected layer",
    queryByLocationText: "Query by current map extent",
    queryByAttributesText: "Query by attributes",
    queryMsg: "Querying...",
    noFeaturesTitle: "No Match",
    noFeaturesMessage: "Your query did not return any results.",
    outputAction: 0,
    autoExpand: null,
    addActions: function(actions) {
        if (!this.initialConfig.actions && !actions) {
            actions = [{
                text: this.queryActionText,
                menuText: this.queryMenuText,
                iconCls: "gxp-icon-find",
                tooltip: this.queryActionTip,
                disabled: true,
                toggleGroup: this.toggleGroup,
                enableToggle: true,
                allowDepress: true,
                toggleHandler: function(button, pressed) {
                    if (this.autoExpand && this.output.length > 0) {
                        var expandContainer = Ext.getCmp(this.autoExpand);
                        expandContainer[pressed ? 'expand' : 'collapse']();
                        if (pressed) {
                            expandContainer.expand();
                            if (expandContainer.ownerCt && expandContainer.ownerCt instanceof Ext.Panel) {
                                expandContainer.ownerCt.expand();
                            }
                        } else {
                            this.target.tools[this.featureManager].loadFeatures();
                        }
                    }
                },
                scope: this
            }];
        }
        this.actions = gxp.plugins.QueryForm.superclass.addActions.apply(this, actions);
        // support custom actions
        if (this.actionTarget !== null && this.actions) {
            this.target.tools[this.featureManager].on("layerchange", function(mgr, rec, schema) {
                for (var i=this.actions.length-1; i>=0; --i) {
                    this.actions[i].setDisabled(!schema);
                }
            }, this);
        }
    },
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];

        config = Ext.apply({
            border: false,
            bodyStyle: "padding: 10px",
            layout: "form",
            width: 320,
            autoScroll: true,
            items: [{
                xtype: "fieldset",
                ref: "spatialFieldset",
                title: this.queryByLocationText,
                anchor: "97%",
                // This fieldset never expands
                style: "margin-bottom:0; border-left-color:transparent; border-right-color:transparent; border-width:1px 1px 0 1px; padding-bottom:0",
                checkboxToggle: true
            }, {
                xtype: "fieldset",
                ref: "attributeFieldset",
                title: this.queryByAttributesText,
                anchor: "97%",
                style: "margin-bottom:0",
                checkboxToggle: true
            }],
            bbar: ["->", {
                text: this.cancelButtonText,
                iconCls: "cancel",
                handler: function() {
                    var ownerCt = this.outputTarget ? queryForm.ownerCt :
                        queryForm.ownerCt.ownerCt;
                    if (ownerCt && ownerCt instanceof Ext.Window) {
                        ownerCt.hide();
                    }
                    addFilterBuilder(
                        featureManager, featureManager.layerRecord,
                        featureManager.schema
                    );
                    featureManager.loadFeatures();
                }
            }, {
                text: this.queryActionText,
                iconCls: "gxp-icon-find",
                handler: function() {
                    var filters = [];
                    var attributeFieldset = queryForm.child('*[ref=attributeFieldset]');
                    var spatialFieldset = queryForm.child('*[ref=spatialFieldset]');
                    if (spatialFieldset.collapsed !== true) {
                        filters.push(new OpenLayers.Filter.Spatial({
                            type: OpenLayers.Filter.Spatial.BBOX,
                            property: featureManager.featureStore.geometryName,
                            value: this.target.mapPanel.map.getExtent()
                        }));
                    }
                    if (attributeFieldset.collapsed !== true) {
                        var attributeFilter = attributeFieldset.child('*[ref=filterBuilder]').getFilter();
                        attributeFilter && filters.push(attributeFilter);
                    }
                    featureManager.loadFeatures(filters.length > 1 ?
                        new OpenLayers.Filter.Logical({
                            type: OpenLayers.Filter.Logical.AND,
                            filters: filters
                        }) :
                        filters[0]
                    );
                },
                scope: this
            }]
        }, config || {});
        var queryForm = gxp.plugins.QueryForm.superclass.addOutput.call(this, config);

        var expandContainer = null, userExpand = true;
        if (this.autoExpand) {
            expandContainer = Ext.getCmp(this.autoExpand);
            function stopAutoExpand() {
                if (userExpand) {
                    expandContainer.un('expand', stopAutoExpand);
                    expandContainer.un('collapse', stopAutoExpand);
                    expandContainer = null;
                }
                userExpand = true;
            }
            expandContainer.on({
                'expand': stopAutoExpand,
                'collapse': stopAutoExpand
            });
        }
        var addFilterBuilder = function(mgr, rec, schema) {
            var attributeFieldset = queryForm.child('*[ref=attributeFieldset]');
            var spatialFieldset = queryForm.child('*[ref=spatialFieldset]');
            attributeFieldset.removeAll();
            queryForm.setDisabled(!schema);
            if (expandContainer) {
                userExpand = false;
                expandContainer[schema ? 'expand' : 'collapse']();
                // if we're wrapped in another collapsed container, expand it
                if (schema && expandContainer && expandContainer.ownerCt && expandContainer.ownerCt instanceof Ext.Panel) {
                    expandContainer.ownerCt.expand();
                }
            }
            if (schema) {
                attributeFieldset.add({
                    xtype: "gxp_filterbuilder",
                    ref: "filterBuilder",
                    attributes: schema,
                    allowBlank: true,
                    allowGroups: false
                });
                spatialFieldset.expand();
                attributeFieldset.expand();
            } else {
                attributeFieldset.rendered && attributeFieldset.collapse();
                spatialFieldset.rendered && spatialFieldset.collapse();
            }
            attributeFieldset.doLayout();
        };
        featureManager.on("layerchange", addFilterBuilder);
        addFilterBuilder(featureManager,
            featureManager.layerRecord, featureManager.schema
        );

        featureManager.on({
            "beforequery": function() {
                queryForm.getEl().mask(this.queryMsg);
            },
            "query": function(tool, store) {
                if (store) {
                    if (this.target.tools[this.featureManager].featureStore !== null) {
                        store.getCount() || Ext.Msg.show({
                            title: this.noFeaturesTitle,
                            msg: this.noFeaturesMessage,
                            buttons: Ext.Msg.OK,
                            icon: Ext.Msg.INFO
                        });
                        if (this.autoHide) {
                            var ownerCt = this.outputTarget ? queryForm.ownerCt :
                                queryForm.ownerCt.ownerCt;
                            ownerCt instanceof Ext.Window && ownerCt.hide();
                        }
                        queryForm.getEl().unmask();
                    }
                }
            },
            scope: this
        });

        return queryForm;
    }

});
