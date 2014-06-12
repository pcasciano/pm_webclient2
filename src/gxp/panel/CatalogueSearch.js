/**
 * @requires form/CSWFilterField.js
 */

Ext.define('gxp.panel.CatalogueSearch', {
    extend: 'Ext.panel.Panel',
    requires: ['Ext.grid.column.Action', 'Ext.grid.TemplateColumn', 'Ext.form.Panel', 'Ext.form.FieldContainer', 'gxp.form.CSWFilterField'],
    alias: 'widget.gxp_cataloguesearchpanel',
    border: false,
    maxRecords: 10,
    map: null,
    selectedSource: null,
    sources: null,
    searchFieldEmptyText: "Search",
    searchButtonText: "Search",
    addTooltip: "Create filter",
    addMapTooltip: "Add to map",
    advancedTitle: "Advanced",
    datatypeLabel: "Data type",
    extentLabel: "Spatial extent",
    categoryLabel: "Category",
    datasourceLabel: "Data source",
    filterLabel: "Filter search by",
    removeSourceTooltip: "Switch back to original source",
    initComponent: function() {
        var me = this;
        this.addEvents(
            /** api: event[addlayer]
             *  Fires when a layer needs to be added to the map.
             *
             *  Listener arguments:
             *
             *  * :class:`gxp.CatalogueSearchPanel` this component
             *  * ``String`` the key of the catalogue source to use
             *  * ``Object`` config object for the WMS layer to create.
             */
            "addlayer"
        );
        this.filters = [];
        var sourceComboData = [];
        for (var key in this.sources) {
            sourceComboData.push([key, this.sources[key].title]);
        }
        if (sourceComboData.length >= 1) {
            this.selectedSource = sourceComboData[0][0];
        }
        var filterOptions = [['datatype', 'data type'], ['extent', 'spatial extent'], ['category', 'category']];
        if (sourceComboData.length > 1) {
            filterOptions.push(['csw', 'data source']);
        }
        this.sources[this.selectedSource].store.on('loadexception', function(proxy, o, response, e) {
            if (response.success()) {
                Ext.Msg.show({
                    title: e.message,
                    msg: gxp.util.getOGCExceptionText(e.arg.exceptionReport),
                    icon: Ext.MessageBox.ERROR,
                    buttons: Ext.MessageBox.OK
                });
            }
        });
        this.items = [{
            xtype: 'form',
            border: false,
            ref: 'form',
            hideLabels: true,
            autoHeight: true,
            style: "margin-left: 5px; margin-right: 5px; margin-bottom: 5px; margin-top: 5px",
            items: [{
                xtype: "fieldcontainer",
                layout: "hbox",
                items: [{
                    xtype: "textfield",
                    emptyText: this.searchFieldEmptyText,
                    ref: "search",
                    name: "search",
                    listeners: {
                         specialkey: function(field, e) {
                             if (e.getKey() == e.ENTER) {
                                 this.performQuery();
                             }
                         },
                         scope: this
                    },
                    width: 250
                }, {
                    xtype: "button",
                    text: this.searchButtonText,
                    handler: this.performQuery,
                    scope: this
                }]
            }, {
                xtype: "fieldset",
                collapsible: true,
                collapsed: true,
                hideLabels: false,
                hidden: true,
                title: this.advancedTitle,
                items: [{
                    xtype: 'gxp_cswfilterfield',
                    name: 'datatype',
                    property: 'apiso:Type',
                    comboFieldLabel: this.datatypeLabel,
                    comboStoreData: [
                        ['dataset', 'Dataset'],
                        ['datasetcollection', 'Dataset collection'],
                        ['application', 'Application'],
                        ['service', 'Service']
                    ],
                    target: this
                }, {
                    xtype: 'gxp_cswfilterfield',
                    name: 'extent',
                    property: 'BoundingBox',
                    map: this.map,
                    comboFieldLabel: this.extentLabel,
                    comboStoreData: [
                        ['map', 'spatial extent of the map']
                    ],
                    target: this
                }, {
                    xtype: 'gxp_cswfilterfield',
                    name: 'category',
                    property: 'apiso:TopicCategory',
                    comboFieldLabel: this.categoryLabel,
                    comboStoreData: [
                        ['farming', 'Farming'],
                        ['biota', 'Biota'],
                        ['boundaries', 'Boundaries'],
                        ['climatologyMeteorologyAtmosphere', 'Climatology/Meteorology/Atmosphere'],
                        ['economy', 'Economy'],
                        ['elevation', 'Elevation'],
                        ['environment', 'Environment'],
                        ['geoscientificinformation', 'Geoscientific Information'],
                        ['health', 'Health'],
                        ['imageryBaseMapsEarthCover', 'Imagery/Base Maps/Earth Cover'],
                        ['intelligenceMilitary', 'Intelligence/Military'],
                        ['inlandWaters', 'Inland Waters'],
                        ['location', 'Location'],
                        ['oceans', 'Oceans'],
                        ['planningCadastre', 'Planning Cadastre'],
                        ['society', 'Society'],
                        ['structure', 'Structure'],
                        ['transportation', 'Transportation'],
                        ['utilitiesCommunications', 'Utilities/Communications']
                    ],
                    target: this
                }, {
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    id: "csw",
                    ref: "../../cswCompositeField",
                    hidden: true,
                    items: [{
                        xtype: "combo",
                        ref: "sourceCombo",
                        fieldLabel: this.datasourceLabel,
                        store: Ext.create('Ext.data.ArrayStore', {
                            fields: ['id', 'value'],
                            data: sourceComboData
                        }),
                        displayField: 'value',
                        valueField: 'id',
                        mode: 'local',
                        listeners: {
                            'select': function(cmb, record) {
                                this.setSource(cmb.getValue());
                            },
                            'render': function() {
                                this.down('*[ref=sourceCombo]').setValue(this.selectedSource);
                            },
                            scope: this
                        },
                        triggerAction: 'all'
                    }, {
                        xtype: 'button',
                        iconCls: 'gxp-icon-removelayers',
                        tooltip: this.removeSourceTooltip,
                        handler: function(btn) {
                            this.setSource(this.initialConfig.selectedSource);
                            this.down('*[ref=sourceCombo]').setValue(this.initialConfig.selectedSource);
                            this.cswCompositeField.hide();
                        },
                        scope: this
                    }]
                }, {
                    xtype: 'fieldcontainer',
                    layout: "hbox",
                    items: [{
                        xtype: "combo",
                        fieldLabel: this.filterLabel,
                        store: Ext.create('Ext.data.ArrayStore', {
                            fields: ['id', 'value'],
                            data: filterOptions
                        }),
                        displayField: 'value',
                        valueField: 'id',
                        mode: 'local',
                        triggerAction: 'all'
                    }, {
                        xtype: 'button',
                        iconCls: 'gxp-icon-addlayers',
                        tooltip: this.addTooltip,
                        handler: function(btn) {
                            btn.ownerCt.items.each(function(item) {
                                if (item.getXType() === "combo") {
                                    var id = item.getValue();
                                    item.clearValue();
                                    var field = this.form.getForm().findField(id);
                                    if (field) {
                                        field.show();
                                    }
                                }
                            }, this);
                        },
                        scope: this
                    }]
                }]
            }, {
                xtype: "grid",
                width: '100%',
                anchor: '99%',
                viewConfig: {
                    scrollOffset: 0,
                    forceFit: true
                },
                border: false,
                ref: "grid",
                bbar: Ext.create('Ext.PagingToolbar', {
                    store: this.sources[this.selectedSource].store
                }),
                loadMask: true,
                hideHeaders: true,
                store: this.sources[this.selectedSource].store,
                columns: [{
                    id: 'title',
                    flex: 1,
                    xtype: "templatecolumn",
                    tpl: Ext.create('Ext.XTemplate', '<b>{title}</b><br/>{abstract}'),
                    sortable: true
                }, {
                    xtype: "actioncolumn",
                    width: 30,
                    items: [{
                        getClass: function(v, meta, rec) {
                            if (this.findWMS(rec.get("URI")) !== false ||
                                this.findWMS(rec.get("references")) !== false) {
                                    return "gxp-icon-addlayers";
                            }
                        },
                        tooltip: this.addMapTooltip,
                        handler: function(grid, rowIndex, colIndex) {
                            var rec = this.down('*[ref=grid]').store.getAt(rowIndex);
                            this.addLayer(rec);
                        },
                        scope: this
                    }]
                }],
                autoHeight: true
            }]
        }];
        this.callParent(arguments);
    },
    destroy: function() {
        this.sources = null;
        this.map = null;
        this.callParent(arguments);
    },
    setSource: function(key) {
        this.selectedSource = key;
        var store = this.sources[key].store;
        var grid = this.down('*[ref=grid]');
        grid.reconfigure(store, grid.getColumnModel());
        grid.getBottomToolbar().bindStore(store);
    },
    performQuery: function() {
        var plugin = this.sources[this.selectedSource];
        plugin.filter({
            queryString: this.down('*[ref=search]').getValue(),
            limit: plugin.store.pageSize,
            filters: this.filters
        });
    },
    addFilter: function(filter) {
        this.filters.push(filter);
    },
    removeFilter: function(filter) {
        this.filters.remove(filter);
    },
    findWMS: function(links) {
        var protocols = [
            'OGC:WMS-1.1.1-HTTP-GET-MAP',
            'OGC:WMS'
        ];
        var url = null, name = null, i, ii, link;
        // search for a protocol that matches WMS
        for (i=0, ii=links.length; i<ii; ++i) {
            link = links[i];
            if (link.protocol && protocols.indexOf(link.protocol.toUpperCase()) !== -1 && link.value && link.name) {
                url = link.value;
                name = link.name;
                break;
            }
        }
        // if not found by protocol, try by inspecting the url
        if (url === null) {
            for (i=0, ii=links.length; i<ii; ++i) {
                link = links[i];
                var value = link.value ? link.value : link;
                if (value.toLowerCase().indexOf('service=wms') > 0) {
                    var obj = OpenLayers.Util.createUrlObject(value);
                    url = obj.protocol + "//" + obj.host + ":" + obj.port + obj.pathname;
                    name = obj.args.layers;
                    break;
                }
            }
        }
        if (url !== null && name !== null) {
            return {
                url: url,
                name: name
            };
        } else {
            return false;
        }
    },
    addLayer: function(record) {
        var uri = record.get("URI");
        var bounds = record.get("bounds");
        var bLeft = bounds.left,
            bRight = bounds.right,
            bBottom = bounds.bottom,
            bTop = bounds.top;
        var left = Math.min(bLeft, bRight),
            right = Math.max(bLeft, bRight),
            bottom = Math.min(bBottom, bTop),
            top = Math.max(bBottom, bTop);
        var wmsInfo = this.findWMS(uri);
        if (wmsInfo === false) {
            // fallback to dct:references
            var references = record.get("references");
            wmsInfo = this.findWMS(references);
        }
        if (wmsInfo !== false) {
            this.fireEvent("addlayer", this, this.selectedSource, Ext.apply({
                title: record.get('title')[0],
                bbox: [left, bottom, right, top],
                srs: "EPSG:4326",
                projection: record.get('projection')
            }, wmsInfo));
        }
    }
});
