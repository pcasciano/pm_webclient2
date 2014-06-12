/**
 * @requires plugins/Tool.js
 * @requires panel/CatalogueSearch.js
 * @requires form/LayerUploadPanel.js
 */

Ext.define('gxp.plugins.AddLayers', {
    extend: 'gxp.plugins.Tool',
    requires: [
        'Ext.grid.Panel', 'Ext.grid.plugin.RowExpander', 'gxp.panel.CatalogueSearch', 'gxp.form.LayerUploadPanel'
    ],
    alias: 'plugin.gxp_addlayers',
    addActionMenuText: "Add layers",
    findActionMenuText: "Find layers",
    addFeedActionMenuText: "Add feeds",
    addActionTip: "Add layers",
    addServerText: "Add a New Server",
    addButtonText: "Add layers",
    untitledText: "Untitled",
    addLayerSourceErrorText: "Error getting {type} capabilities ({msg}).\nPlease check the url and try again.",
    availableLayersText: "Available Layers",
    searchText: "Search for layers",
    expanderTemplateText: "<p><b>Abstract:</b> {abstract}</p>",
    panelTitleText: "Title",
    layerSelectionText: "View available data from:",
    doneText: "Done",
    uploadRoles: ["ROLE_ADMINISTRATOR"],
    uploadText: "Upload layers",
    relativeUploadOnly: true,
    startSourceId: null,
    catalogSourceKey: null,
    selectedSource: null,
    addServerId: null,
    constructor: function(config) {
        this.addEvents(
            /** api: event[sourceselected]
             *  Fired when a new source is selected.
             *
             *  Listener arguments:
             *
             *  * tool - :class:`gxp.plugins.AddLayers` This tool.
             *  * source - :class:`gxp.plugins.LayerSource` The selected source.
             */
            "sourceselected"
        );
        this.callParent(arguments);
    },
    addActions: function() {
        var commonOptions = {
            tooltip : this.addActionTip,
            text: this.addActionText,
            menuText: this.addActionMenuText,
            disabled: true,
            iconCls: "gxp-icon-addlayers"
        };
        var options, uploadButton;
        if (this.initialConfig.search || (this.uploadSource)) {
            var items = [Ext.create('Ext.menu.Item', {
                iconCls: 'gxp-icon-addlayers',
                text: this.addActionMenuText,
                handler: this.showCapabilitiesGrid,
                scope: this
            })];
            if (this.initialConfig.search && this.initialConfig.search.selectedSource &&
              this.target.sources[this.initialConfig.search.selectedSource]) {
                var search = Ext.create('Ext.menu.Item', {
                    iconCls: 'gxp-icon-addlayers',
                    text: this.findActionMenuText,
                    handler: this.showCatalogueSearch,
                    scope: this
                });
                items.push(search);
                Ext.Ajax.request({
                    method: "GET",
                    url: this.target.sources[this.initialConfig.search.selectedSource].url,
                    callback: function(options, success, response) {
                        if (success === false) {
                            search.hide();
                        }
                    }
                });
            }
            if (this.initialConfig.feeds) {
                items.push(Ext.create('Ext.menu.Item', {
                    iconCls: 'gxp-icon-addlayers',
                    text: this.addFeedActionMenuText,
                    handler: this.showFeedDialog,
                    scope: this
                }));
            }
            if (this.uploadSource) {
                uploadButton = this.createUploadButton(Ext.menu.Item);
                if (uploadButton) {
                    items.push(uploadButton);
                }
            }
            options = Ext.apply(commonOptions, {
                menu: Ext.create('Ext.menu.Menu', {
                    items: items
                })
            });
        } else {
            options = Ext.apply(commonOptions, {
                handler : this.showCapabilitiesGrid,
                scope: this
            });
        }
        var actions = gxp.plugins.AddLayers.superclass.addActions.apply(this, [options]);

        this.target.on("ready", function() {
            if (this.uploadSource) {
                var source = this.target.layerSources[this.uploadSource];
                if (source) {
                    this.setSelectedSource(source);
                } else {
                    delete this.uploadSource;
                    if (uploadButton) {
                        uploadButton.hide();
                    }
                    // TODO: add error logging
                    // throw new Error("Layer source for uploadSource '" + this.uploadSource + "' not found.");
                }
            }
            actions[0].enable();
        }, this);
        return actions;
    },
    showCatalogueSearch: function() {
        var selectedSource = this.initialConfig.search.selectedSource;
        var sources = {};
        var found = false;
        for (var key in this.target.layerSources) {
            var source = this.target.layerSources[key];
            if (source instanceof gxp.plugins.CatalogueSource) {
                var obj = {};
                obj[key] = source;
                Ext.apply(sources, obj);
                found = true;
            }
        }
        if (found === false) {
            if (window.console) {
                window.console.debug('No catalogue source specified');
            }
            return;
        }
        var output = gxp.plugins.AddLayers.superclass.addOutput.apply(this, [{
            sources: sources,
            title: this.searchText,
            height: 300,
            width: 315,
            selectedSource: selectedSource,
            xtype: 'gxp_cataloguesearchpanel',
            map: this.target.mapPanel.map
        }]);
        output.on({
            'addlayer': function(cmp, sourceKey, layerConfig) {
                var source = this.target.layerSources[sourceKey];
                var bounds = OpenLayers.Bounds.fromArray(layerConfig.bbox,
                    (source.yx && source.yx[layerConfig.projection] === true));
                var mapProjection = this.target.mapPanel.map.getProjection();
                var bbox = bounds.transform(layerConfig.srs, mapProjection);
                layerConfig.srs = mapProjection;
                layerConfig.bbox = bbox.toArray();
                layerConfig.source = this.initialConfig.catalogSourceKey !== null ?
                    this.initialConfig.catalogSourceKey : sourceKey;
                var record = source.createLayerRecord(layerConfig);
                this.target.mapPanel.layers.add(record);
                if (bbox) {
                    this.target.mapPanel.map.zoomToExtent(bbox);
                }
            },
            scope: this
        });
        var popup = output.findParentByType('window');
        popup && popup.center();
        return output;
    },
    showCapabilitiesGrid: function() {
        if(!this.capGrid) {
            this.initCapGrid();
        } else if (!(this.capGrid instanceof Ext.Window)) {
            this.addOutput(this.capGrid);
        }
        this.capGrid.show();
    },
    showFeedDialog: function() {
        if(!this.feedDialog) {
            var Cls = this.outputTarget ? Ext.Panel : Ext.Window;
            this.feedDialog = Ext.create(Cls, Ext.apply({
                closeAction: "hide",
                autoScroll: true,
                title: this.addFeedActionMenuText,
                items: [{
                    xtype: "gxp_feedsourcedialog",
                    target: this.target,
                    listeners: {
                        'addfeed':function (ptype, config) {
                            var sourceConfig = {"config":{"ptype":ptype}};
                            if (config.url) {
                                sourceConfig.config["url"] = config.url;
                            }
                            var source = this.target.addLayerSource(sourceConfig);
                            config.source = source.id;
                            var feedRecord = source.createLayerRecord(config);
                            this.target.mapPanel.layers.add([feedRecord]);
                            this.feedDialog.hide();
                        },
                        scope: this
                    }
                }]
            }, this.initialConfig.outputConfig));
            if (Cls === Ext.Panel) {
                this.addOutput(this.feedDialog);
            }
        }
        if (!(this.feedDialog instanceof Ext.Window)) {
            this.addOutput(this.feedDialog);
        }
        this.feedDialog.show();
    },
    initCapGrid: function() {
        var source, data = [], target = this.target;
        for (var id in target.layerSources) {
            source = target.layerSources[id];
            if (source.store && !source.hidden) {
                data.push([id, source.title || id, source.url]);
            }
        }
        var sources = Ext.create('Ext.data.ArrayStore', {
            fields: ["id", "title", "url"],
            data: data
        });

        var expander = this.createExpander();

        function addLayers() {
            var source = this.selectedSource;
            var records = capGridPanel.getSelectionModel().getSelection();
            var recordsToAdd = [],
                numRecords = records.length;
            function collectRecords(record) {
                if (recordsToAdd) {
                    recordsToAdd.push(record);
                }
                numRecords--;
                if (numRecords === 0) {
                    this.addLayers(recordsToAdd);
                }
            }
            for (var i=0, ii=records.length; i<ii; ++i) {
                var record = source.createLayerRecord({
                    name: records[i].get("name"),
                    source: source.id
                }, collectRecords, this);
                if (record) {
                    collectRecords.call(this, record);
                }
            }
        }

        var idx = 0;
        if (this.startSourceId !== null) {
            sources.each(function(record) {
                if (record.get("id") === this.startSourceId) {
                    idx = sources.indexOf(record);
                }
            }, this);
        }

        source = this.target.layerSources[data[idx][0]];

        var capGridPanel = Ext.create('Ext.grid.Panel', {
            store: source.store,
            autoScroll: true,
            plugins: [expander],
            loadMask: true,
            columns: [
                {id: "title", flex: 1, header: this.panelTitleText, dataIndex: "title", sortable: true},
                {header: "Id", dataIndex: "name", width: 120, sortable: true}
            ],
            viewConfig: {
                listeners: {
                    itemdblclick: addLayers,
                    scope: this
                }
            }
        });

        var sourceComboBox = Ext.create('Ext.form.ComboBox', {
            ref: "../../sourceComboBox",
            width: 165,
            store: sources,
            valueField: "id",
            displayField: "title",
            /* TODO update tpl to show title */
            tpl_: '<tpl for="."><div ext:qtip="{url}" class="x-combo-list-item">{title}</div></tpl>',
            triggerAction: "all",
            editable: false,
            allowBlank: false,
            forceSelection: true,
            queryMode: "local",
            value: data[idx][0],
            listeners: {
                select: function(combo, records, index) {
                    var record = records[0];
                    var id = record.get("id");
                    if (id === this.addServerId) {
                        showNewSourceDialog();
                        sourceComboBox.reset();
                        return;
                    }
                    var source = this.target.layerSources[id];
                    capGridPanel.reconfigure(source.store, capGridPanel.initialConfig.columns);
                    this.setSelectedSource(source);
                    // blur the combo box
                    //TODO Investigate if there is a more elegant way to do this.
                    Ext.Function.defer(function() {
                        combo.triggerBlur();
                        combo.el.blur();
                    }, 100);
                },
                focus: function(field) {
                    if (target.proxy) {
                        field.reset();
                    }
                },
                scope: this
            }
        });

        var capGridToolbar = null,
            container;

        if (this.target.proxy || data.length > 1) {
            container = Ext.create('Ext.Container', {
                cls: 'gxp-addlayers-sourceselect',
                items: [
                    Ext.create('Ext.Toolbar.TextItem', {text: this.layerSelectionText}),
                    sourceComboBox
                ]
            });
            capGridToolbar = [container];
        }

        if (this.target.proxy) {
            this.addServerId = Ext.id();
            sources.loadData([[this.addServerId, this.addServerText + "..."]], true);
        }

        var newSourceDialog = {
            xtype: "gxp_newsourcedialog",
            header: false,
            listeners: {
                "hide": function(cmp) {
                    if (!this.outputTarget) {
                        cmp.ownerCt.hide();
                    }
                },
                "urlselected": function(newSourceDialog, url, type) {
                    newSourceDialog.setLoading();
                    var ptype;
                    switch (type) {
                        case 'TMS':
                                ptype = "gxp_tmssource";
                                break;
                        case 'REST':
                                ptype = 'gxp_arcrestsource';
                                break;
                        default:
                                ptype = 'gxp_wmscsource';
                    }
                    this.target.addLayerSource({
                        config: {url: url, ptype: ptype},
                        callback: function(id) {
                            // add to combo and select
                            var record = Ext.create(sources.recordType, {
                                id: id,
                                title: this.target.layerSources[id].title || this.untitledText
                            });
                            sources.insert(0, [record]);
                            sourceComboBox.onSelect(record, 0);
                            newSourceDialog.hide();
                        },
                        fallback: function(source, msg) {
                            newSourceDialog.setError(
                                Ext.create('Ext.Template', this.addLayerSourceErrorText).apply({type: type, msg: msg})
                            );
                        },
                        scope: this
                    });
                },
                scope: this
            }
        };
        var me = this;
        function showNewSourceDialog() {
            if (me.outputTarget) {
                me.addOutput(newSourceDialog);
            } else {
                Ext.create('Ext.Window', {
                    title: gxp.NewSourceDialog.prototype.title,
                    modal: true,
                    hideBorders: true,
                    width: 300,
                    items: newSourceDialog
                }).show();
            }
        }


        var items = {
            xtype: "container",
            region: "center",
            layout: "fit",
            hideBorders: true,
            items: [capGridPanel]
        };
        if (this.instructionsText) {
            items.items.push({
                xtype: "box",
                autoHeight: true,
                autoEl: {
                    tag: "p",
                    cls: "x-form-item",
                    style: "padding-left: 5px; padding-right: 5px"
                },
                html: this.instructionsText
            });
        }

        var bbarItems = [
            "->",
            Ext.create('Ext.Button', {
                text: this.addButtonText,
                iconCls: "gxp-icon-addlayers",
                handler: addLayers,
                scope : this
            }),
            Ext.create('Ext.Button', {
                text: this.doneText,
                handler: function() {
                    this.capGrid.hide();
                },
                scope: this
            })
        ];

        var uploadButton;
        if (!this.uploadSource) {
            uploadButton = this.createUploadButton();
            if (uploadButton) {
                bbarItems.unshift(uploadButton);
            }
        }

        var Cls = this.outputTarget ? Ext.Panel : Ext.Window;
        this.capGrid = Ext.create(Cls, Ext.apply({
            title: this.availableLayersText,
            closeAction: "hide",
            layout: "border",
            height: 300,
            width: 315,
            modal: true,
            items: items,
            tbar: capGridToolbar,
            bbar: bbarItems,
            listeners: {
                hide: function(win) {
                    capGridPanel.getSelectionModel().clearSelections();
                },
                show: function(win) {
                    if (this.selectedSource === null) {
                        this.setSelectedSource(this.target.layerSources[data[idx][0]]);
                    } else {
                        this.setSelectedSource(this.selectedSource);
                    }
                },
                scope: this
            }
        }, this.initialConfig.outputConfig));
        if (Cls === Ext.Panel) {
            this.addOutput(this.capGrid);
        }

    },
    addLayers: function(records, isUpload) {
        var source = this.selectedSource;
        var layerStore = this.target.mapPanel.layers,
            extent, record, layer;
        for (var i=0, ii=records.length; i<ii; ++i) {
            // If the source is lazy, then createLayerRecord will not return
            // a record, and we take the preconfigured record.
            record = source.createLayerRecord({
                name: records[i].get("name"),
                source: source.id
            }) || records[i];
            if (record) {
                layer = record.getLayer();
                if (layer.maxExtent) {
                    if (!extent) {
                        extent = record.getLayer().maxExtent.clone();
                    } else {
                        extent.extend(record.getLayer().maxExtent);
                    }
                }
                if (record.get("group") === "background") {
                    // layer index 0 is the invisible base layer, so we insert
                    // at position 1.
                    layerStore.insert(1, [record]);
                } else {
                    layerStore.add([record]);
                }
            }
        }
        if (extent) {
            this.target.mapPanel.map.zoomToExtent(extent);
        }
        if (records.length === 1 && record) {
            // select the added layer
            this.target.selectLayer(record);
            if (isUpload && this.postUploadAction) {
                // show LayerProperties dialog if just one layer was uploaded
                var outputConfig,
                    actionPlugin = this.postUploadAction;
                if (!Ext.isString(actionPlugin)) {
                    outputConfig = actionPlugin.outputConfig;
                    actionPlugin = actionPlugin.plugin;
                }
                if (this.target.tools[actionPlugin]) {
                    this.target.tools[actionPlugin].addOutput(outputConfig);
                }
            }
        }
    },
    setSelectedSource: function(source, callback) {
        this.selectedSource = source;
        var store = source.store;
        this.fireEvent("sourceselected", this, source);
        if (this.capGrid && source.lazy) {
            var me = this;
            source.store.load({callback: function() {
                var sourceComboBox = me.capGrid.sourceComboBox;
                if (sourceComboBox) {
                    var store = sourceComboBox.store,
                        valueField = sourceComboBox.valueField,
                        index = store.findExact(valueField, sourceComboBox.getValue()),
                        rec = store.getAt(index),
                        source = me.target.layerSources[rec.get("id")];
                    if (source) {
                        if (source.title !== rec.get("title") && !Ext.isEmpty(source.title)) {
                            rec.set("title", source.title);
                            sourceComboBox.setValue(rec.get(valueField));
                        }
                    } else {
                        store.remove(rec);
                    }
                }
            }});
        }
    },
    createUploadButton: function(Cls) {
        Cls = Cls || Ext.Button;
        var button;
        var uploadConfig = this.initialConfig.upload || !!this.initialConfig.uploadSource;
        // the url will be set in the sourceselected sequence
        var url;
        if (uploadConfig) {
            if (typeof uploadConfig === "boolean") {
                uploadConfig = {};
            }
            button = Ext.create(Cls, {
                text: this.uploadText,
                iconCls: "gxp-icon-filebrowse",
                hidden: !this.uploadSource,
                handler: function() {
                    this.target.doAuthorized(this.uploadRoles, function() {
                        var panel = Ext.create('gxp.form.LayerUploadPanel', Ext.apply({
                            title: this.outputTarget ? this.uploadText : undefined,
                            url: url,
                            width: 300,
                            border: false,
                            bodyStyle: "padding: 10px 10px 0 10px;",
                            labelWidth: 65,
                            autoScroll: true,
                            defaults: {
                                anchor: "99%",
                                allowBlank: false,
                                msgTarget: "side"
                            },
                            listeners: {
                                uploadcomplete: function(panel, detail) {
                                    var layers = detail["import"].tasks;
                                    var item, names = {}, resource, layer;
                                    for (var i=0, len=layers.length; i<len; ++i) {
                                        item = layers[i];
                                        if (item.state === "ERROR") {
                                            Ext.Msg.alert(item.layer.originalName, item.errorMessage);
                                            return;
                                        }
                                        var ws;
                                        if (item.target.dataStore) {
                                            ws = item.target.dataStore.workspace.name;
                                        } else if (item.target.coverageStore) {
                                            ws = item.target.coverageStore.workspace.name;
                                        }
                                        names[ws + ":" + item.layer.name] = true;
                                    }
                                    this.selectedSource.store.load({
                                        callback: function(records, options, success) {
                                            var gridPanel, sel;
                                            if (this.capGrid && this.capGrid.isVisible()) {
                                                gridPanel = this.capGrid.get(0).get(0);
                                                sel = gridPanel.getSelectionModel();
                                                sel.clearSelections();
                                            }
                                            // select newly added layers
                                            var newRecords = [];
                                            var last = 0;
                                            this.selectedSource.store.each(function(record, index) {
                                                if (record.get("name") in names) {
                                                    last = index;
                                                    newRecords.push(record);
                                                }
                                            });
                                            if (gridPanel) {
                                                // this needs to be deferred because the
                                                // grid view has not refreshed yet
                                                window.setTimeout(function() {
                                                    sel.selectRecords(newRecords);
                                                    gridPanel.getView().focusRow(last);
                                                }, 100);
                                            } else {
                                                this.addLayers(newRecords, true);
                                            }
                                        },
                                        scope: this
                                    });
                                    if (this.outputTarget) {
                                        panel.hide();
                                    } else {
                                        win.close();
                                    }
                                },
                                scope: this
                            }
                        }, uploadConfig));

                        var win;
                        if (this.outputTarget) {
                            this.addOutput(panel);
                        } else {
                            win = Ext.create('Ext.Window', {
                                title: this.uploadText,
                                modal: true,
                                resizable: false,
                                items: [panel]
                            });
                            win.show();
                        }
                    }, this);
                },
                scope: this
            });

            var urlCache = {};
            function getStatus(url, callback, scope) {
                if (url in urlCache) {
                    // always call callback after returning
                    window.setTimeout(function() {
                        callback.call(scope, urlCache[url]);
                    }, 0);
                } else {
                    Ext.Ajax.request({
                        url: url,
                        disableCaching: false,
                        callback: function(options, success, response) {
                            var status = response.status;
                            urlCache[url] = status;
                            callback.call(scope, status);
                        }
                    });
                }
            }

            this.on({
                sourceselected: function(tool, source) {
                    button[this.uploadSource ? "show" : "hide"]();
                    var show = false;
                    if (this.isEligibleForUpload(source)) {
                        url = this.getGeoServerRestUrl(source.url);
                        if (this.target.isAuthorized()) {
                            // determine availability of upload functionality based
                            // on a 200 for GET /imports
                            getStatus(url + "/imports", function(status) {
                                button.setVisible(status === 200);
                            }, this);
                        }
                    }
                },
                scope: this
            });
        }
        return button;
    },
    getGeoServerRestUrl: function(url) {
        var parts = url.split("/");
        parts.pop();
        parts.push("rest");
        return parts.join("/");
    },
    isEligibleForUpload: function(source) {
        return (
            source.url &&
            (this.relativeUploadOnly ? (source.url.charAt(0) === "/") : true) &&
            (this.nonUploadSources || []).indexOf(source.id) === -1
        );
    },
    createExpander: function() {
        return Ext.create('Ext.grid.plugin.RowExpander', {
            rowBodyTpl: Ext.create('Ext.Template', this.expanderTemplateText)
        });
    }
});
