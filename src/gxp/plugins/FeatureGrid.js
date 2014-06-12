/**
 * @requires plugins/ClickableFeatures.js
 * @requires grid/FeaturePanel.js
 * @requires GeoExt/selection/FeatureModel.js
 */

Ext.define('gxp.plugins.FeatureGrid', {
    extend: 'gxp.plugins.ClickableFeatures',
    alias: 'plugin.gxp_featuregrid',
    requires: ['Ext.toolbar.Spacer', 'Ext.toolbar.TextItem', 'GeoExt.selection.FeatureModel', 'gxp.grid.FeaturePanel'],
    schema: null,
    showTotalResults: false,
    alwaysDisplayOnMap: false,
    displayMode: "all",
    autoExpand: false,
    autoCollapse: false,
    selectOnMap: false,
    displayFeatureText: "Display on map",
    firstPageTip: "First page",
    previousPageTip: "Previous page",
    zoomPageExtentTip: "Zoom to page extent",
    nextPageTip: "Next page",
    lastPageTip: "Last page",
    totalMsg: "Features {1} to {2} of {0}",
    displayTotalResults: function() {
        var featureManager = this.target.tools[this.featureManager];
        if (this.showTotalResults === true) {
            this.displayItem.setText(
                featureManager.numberOfFeatures !== null ? String.format(
                    this.totalMsg,
                    featureManager.numberOfFeatures,
                    featureManager.pageIndex * featureManager.maxFeatures + Math.min(featureManager.numberOfFeatures, 1),
                    Math.min((featureManager.pageIndex + 1) * featureManager.maxFeatures, featureManager.numberOfFeatures)
                ) : ""
            );
        }
    },
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];
        var map = this.target.mapPanel.map, smCfg;
        // a minimal SelectFeature control - used just to provide select and
        // unselect, won't be added to the map unless selectOnMap is true
        this.selectControl = new OpenLayers.Control.SelectFeature(
            featureManager.featureLayer, this.initialConfig.controlOptions
        );
        if (this.selectOnMap) {
             if (this.autoLoadFeature || (featureManager.paging && featureManager.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING)) {
                this.selectControl.events.on({
                    "activate": function() {
                        map.events.register(
                            "click", this, this.noFeatureClick
                        );
                    },
                    "deactivate": function() {
                        map.events.unregister(
                            "click", this, this.noFeatureClick
                        );
                    },
                    scope: this
                });
            }
            map.addControl(this.selectControl);
            smCfg = {
                selectControl: this.selectControl
            };
        } else {
            smCfg = {
                selectControl: this.selectControl,
                singleSelect: false,
                autoActivateControl: false,
                listeners: {
                    "beforerowselect": function() {
                        if((window.event && window.event.type == "contextmenu") ||this.selectControl.active || featureManager.featureStore.getModifiedRecords().length) {
                            return false;
                        }
                    },
                    scope: this
                }
            };
        }
        this.displayItem = Ext.create('Ext.toolbar.TextItem');
        config = Ext.apply({
            xtype: "gxp_featuregrid",
            border: false,
            selModel: Ext.create('GeoExt.selection.FeatureModel', smCfg),
            autoScroll: true,
            columnMenuDisabled: !!featureManager.paging,
            bbar: (featureManager.paging ? [{
                iconCls: "x-tbar-page-first",
                ref: "firstPageButton",
                tooltip: this.firstPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: 0});
                }
            }, {
                iconCls: "x-tbar-page-prev",
                ref: "prevPageButton",
                tooltip: this.previousPageTip,
                disabled: true,
                handler: function() {
                    featureManager.previousPage();
                }
            }, {
                iconCls: "gxp-icon-zoom-to",
                ref: "zoomToPageButton",
                tooltip: this.zoomPageExtentTip,
                disabled: true,
                hidden: (featureManager.pagingType !== gxp.plugins.FeatureManager.QUADTREE_PAGING) ||
                    featureManager.autoZoomPage,
                handler: function() {
                    var extent = featureManager.getPageExtent();
                    if (extent !== null) {
                        map.zoomToExtent(extent);
                    }
                }
            }, {
                iconCls: "x-tbar-page-next",
                ref: "nextPageButton",
                tooltip: this.nextPageTip,
                disabled: true,
                handler: function() {
                    featureManager.nextPage();
                }
            }, {
                iconCls: "x-tbar-page-last",
                ref: "lastPageButton",
                tooltip: this.lastPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: "last"});
                }
            }, {xtype: 'tbspacer', width: 10}, this.displayItem] : []).concat(["->"].concat(!this.alwaysDisplayOnMap ? [{
                text: this.displayFeatureText,
                enableToggle: true,
                toggleHandler: function(btn, pressed) {
                    this.selectOnMap && this.selectControl[pressed ? "activate" : "deactivate"]();
                    featureManager[pressed ? "showLayer" : "hideLayer"](this.id, this.displayMode);
                },
                scope: this
            }] : [])),
            contextMenu: Ext.create('Ext.menu.Menu', {items: []})
        }, config || {});
        config.store = Ext.create('GeoExt.data.FeatureStore');
        var featureGrid = gxp.plugins.FeatureGrid.superclass.addOutput.call(this, config);
        featureGrid.on({
            "added": function(cmp, ownerCt) {
                function onClear() {
                    this.displayTotalResults();
                    this.selectOnMap && this.selectControl.deactivate();
                    this.autoCollapse && typeof ownerCt.collapse == "function" &&
                        ownerCt.collapse();
                }
                function onPopulate() {
                    this.displayTotalResults();
                    this.selectOnMap && this.selectControl.activate();
                    this.autoExpand && typeof ownerCt.expand == "function" &&
                        ownerCt.expand();
                }
                featureManager.on({
                    "query": function(tool, store) {
                        if (store && store.getCount()) {
                            onPopulate.call(this);
                        } else {
                            onClear.call(this);
                        }
                    },
                    "layerchange": onClear,
                    "clearfeatures": onClear,
                    scope: this
                });
            },
            contextmenu: function(event) {
                if (featureGrid.contextMenu.items.getCount() > 0) {
                    var rowIndex = featureGrid.getView().findRowIndex(event.getTarget());
                    if (rowIndex !== false) {
                        featureGrid.getSelectionModel().selectRow(rowIndex);
                        featureGrid.contextMenu.showAt(event.getXY());
                        event.stopEvent();
                    }
                }
            },
            scope: this
        });
        if (this.alwaysDisplayOnMap || (this.selectOnMap === true && this.displayMode === "selected")) {
            featureManager.showLayer(this.id, this.displayMode);
        }

        featureManager.paging && featureManager.on({
            "beforesetpage": function() {
                featureGrid.down('*[ref=zoomToPageButton]').disable();
            },
            "setpage": function(mgr, condition, callback, scope, pageIndex, numPages) {
                var paging = (numPages > 0);
                featureGrid.down('*[ref=zoomToPageButton]').setDisabled(!paging);
                var prev = (paging && (pageIndex !== 0));
                featureGrid.down('*[ref=firstPageButton]').setDisabled(!prev);
                featureGrid.down('*[ref=prevPageButton]').setDisabled(!prev);
                var next = (paging && (pageIndex !== numPages-1));
                featureGrid.down('*[ref=lastPageButton]').setDisabled(!next);
                featureGrid.down('*[ref=nextPageButton]').setDisabled(!next);
            },
            scope: this
        });

        function onLayerChange() {
            var schema = featureManager.schema,
                ignoreFields = ["feature", "state", "fid"];
            //TODO use schema instead of store to configure the fields
            schema && schema.each(function(r) {
                r.get("type").indexOf("gml:") == 0 && ignoreFields.push(r.get("name"));
            });
            featureGrid.ignoreFields = ignoreFields;
            if (featureManager.featureStore) {
                featureGrid.setStore(featureManager.featureStore, schema);
            } else {
                // not a feature layer, reset toolbar
                if (featureManager.paging) {
                    featureGrid.down('*[ref=lastPageButton]').disable();
                    featureGrid.down('*[ref=nextPageButton]').disable();
                    featureGrid.down('*[ref=firstPageButton]').disable();
                    featureGrid.down('*[ref=prevPageButton]').disable();
                    featureGrid.down('*[ref=zoomToPageButton]').disable();
                }
                this.displayTotalResults();
            }
        }

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        }
        featureManager.on("layerchange", onLayerChange, this);

        return featureGrid;
    }

});
