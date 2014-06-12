/**
 * @requires GeoExt/slider/LayerOpacity.js
 * @include OpenLayers/Format/CQL.js
 * @requires container/FilterBuilder.js
 */

Ext.define('gxp.tab.WMSLayerPanel', {
    extend: 'Ext.tab.Panel',
    requires: ['GeoExt.slider.LayerOpacity', 'gxp.container.FilterBuilder'],
    alias: 'widget.gxp_wmslayerpanel',
    layerRecord: null,
    source: null,
    styling: true,
    sameOriginStyling: true,
    rasterStyling: false,
    transparent: null,
    editableStyles: false,
    activeTab: 0,
    border: false,
    imageFormats: /png|gif|jpe?g/i,
    aboutText: "About",
    titleText: "Title",
    attributionText: "Attribution",
    nameText: "Name",
    descriptionText: "Description",
    displayText: "Display",
    opacityText: "Opacity",
    formatText: "Tile format",
    infoFormatText: "Info format",
    infoFormatEmptyText: "Select a format",
    transparentText: "Transparent",
    cacheText: "Caching",
    cacheFieldText: "Use cached tiles",
    stylesText: "Available Styles",
    displayOptionsText: "Display options",
    queryText: "Limit with filters",
    scaleText: "Limit by scale",
    minScaleText: "Min scale",
    maxScaleText: "Max scale",
    switchToFilterBuilderText: "Switch back to filter builder",
    cqlPrefixText: "or ",
    cqlText: "use CQL filter instead",
    singleTileText: "Single tile",
    singleTileFieldText: "Use a single tile",
    initComponent: function() {
        this.cqlFormat = new OpenLayers.Format.CQL();
        if (this.source) {
            this.source.getSchema(this.layerRecord, function(attributeStore) {
                if (attributeStore !== false) {
                    var filter = this.layerRecord.getLayer().params.CQL_FILTER;
                    this.filterBuilder = Ext.create('gxp.container.FilterBuilder', {
                        filter: filter && this.cqlFormat.read(filter),
                        allowGroups: false,
                        listeners: {
                            afterrender: function() {
                                this.filterBuilder.cascade(function(item) {
                                    if (item.getXType() === "toolbar") {
                                        item.add({text: this.cqlPrefixText});
                                        item.add({
                                            xtype: 'button',
                                            text: this.cqlText,
                                            handler: this.switchToCQL,
                                            scope: this
                                        });
                                    }
                                }, this);
                            },
                            change: function(builder) {
                                var filter = builder.getFilter();
                                var cql = null;
                                if (filter !== false) {
                                    cql = this.cqlFormat.write(filter);
                                }
                                this.layerRecord.getLayer().mergeNewParams({
                                    CQL_FILTER: cql
                                });
                            },
                            scope: this
                        },
                        attributes: attributeStore
                    });
                    var filterFieldset = this.down('*[ref=filterFieldset]');
                    filterFieldset.add(this.filterBuilder);
                    filterFieldset.doLayout();
                }
            }, this);
        }
        this.addEvents(
            "change"
        );
        this.items = [
            this.createAboutPanel(),
            this.createDisplayPanel()
        ];

        // only add the Styles panel if we know for sure that we have styles
        if (this.styling && gxp.container.WMSStylesDialog && this.layerRecord.get("styles")) {
            // TODO: revisit this
            var url = this.layerRecord.get("restUrl");
            if (!url) {
                url = (this.source || this.layerRecord.getLayer()).url.split(
                    "?").shift().replace(/\/(wms|ows)\/?$/, "/rest");
            }
            if (this.sameOriginStyling) {
                // this could be made more robust
                // for now, only style for sources with relative url
                this.editableStyles = url.charAt(0) === "/";
            } else {
                this.editableStyles = true;
            }
            this.items.push(this.createStylesPanel(url));
        }
        this.callParent(arguments);
    },
    switchToCQL: function() {
        var filter = this.filterBuilder.getFilter();
        var CQL = "";
        if (filter !== false) {
            CQL = this.cqlFormat.write(filter);
        }
        this.filterBuilder.hide();
        var cqlField = this.down('*[ref=cqlField]');
        cqlField.setValue(CQL);
        cqlField.show();
        this.down('*[ref=cqlToolbar]').show();
    },
    switchToFilterBuilder: function() {
        var filter = null;
        var cqlField = this.down('*[ref=cqlField]');
        // when parsing fails, we keep the previous filter in the filter builder
        try {
            filter = this.cqlFormat.read(cqlField.getValue());
        } catch(e) {
        }
        cqlField.hide();
        this.down('*[ref=cqlToolbar]').hide();
        this.filterBuilder.show();
        if (filter !== null) {
            this.filterBuilder.setFilter(filter);
        }
    },
    createStylesPanel: function(url) {
        var config = gxp.container.WMSStylesDialog.createGeoServerStylerConfig(
            this.layerRecord, url
        );
        if (this.rasterStyling === true) {
            config.plugins.push({
                ptype: "gxp_wmsrasterstylesdialog"
            });
        }
        /*var ownerCt = this.ownerCt;
        if (!(ownerCt.ownerCt instanceof Ext.Window)) {
            config.dialogCls = Ext.Panel;
            config.showDlg = function(dlg) {
                dlg.layout = "fit";
                dlg.autoHeight = false;
                ownerCt.add(dlg);
            };
        }*/
        return Ext.apply(config, {
            title: this.stylesText,
            style: "padding: 10px",
            editable: false
        });
    },
    createAboutPanel: function() {
        return {
            title: this.aboutText,
            bodyStyle: {"padding": "10px"},
            defaults: {
                border: false
            },
            items: [{
                layout: "form",
                labelWidth: 70,
                items: [{
                    xtype: "textfield",
                    fieldLabel: this.titleText,
                    anchor: "99%",
                    value: this.layerRecord.get("title"),
                    listeners: {
                        change: function(field) {
                            this.layerRecord.set("title", field.getValue());
                            //TODO revisit when discussion on
                            // http://trac.geoext.org/ticket/110 is complete
                            this.layerRecord.commit();
                            this.fireEvent("change");
                        },
                        scope: this
                    }
                }, {
                    xtype: "textfield",
                    fieldLabel: this.nameText,
                    anchor: "99%",
                    value: this.layerRecord.get("name"),
                    readOnly: true
                }, {
                    xtype: "textfield",
                    fieldLabel: this.attributionText,
                    anchor: "99%",
                    listeners: {
                        change: function(field) {
                            var layer = this.layerRecord.getLayer();
                            layer.attribution = field.getValue();
                            layer.map.events.triggerEvent("changelayer", {
                                layer: layer, property: "attribution"
                            });
                            this.fireEvent("change");
                        },
                        scope: this
                    },
                    value: this.layerRecord.getLayer().attribution
                }]
            }, {
                layout: "form",
                labelAlign: "top",
                items: [{
                    xtype: "textarea",
                    fieldLabel: this.descriptionText,
                    grow: true,
                    growMax: 150,
                    anchor: "99%",
                    value: this.layerRecord.get("abstract"),
                    readOnly: true
                }]
            }]
        };
    },
    onFormatChange: function(combo) {
        var layer = this.layerRecord.getLayer();
        var format = combo.getValue();
        layer.mergeNewParams({
            format: format
        });
        var cb = this.down('*[ref=transparentCb]');
        if (format == "image/jpeg") {
            this.transparent = cb.getValue();
            cb.setValue(false);
        } else if (this.transparent !== null) {
            cb.setValue(this.transparent);
            this.transparent = null;
        }
        cb.setDisabled(format == "image/jpeg");
        this.fireEvent("change");
    },
    addScaleOptions: function(layer, options) {
        // work around for https://github.com/openlayers/openlayers/issues/407
        layer.alwaysInRange = null;
        layer.addOptions(options);
        layer.display();
        layer.redraw();
    },
    createDisplayPanel: function() {
        var record = this.layerRecord;
        var layer = record.getLayer();
        var opacity = layer.opacity;
        if(opacity == null) {
            opacity = 1;
        }
        var formats = [];
        var currentFormat = layer.params["FORMAT"].toLowerCase();
        Ext.each(record.get("formats"), function(format) {
            if(this.imageFormats.test(format)) {
                formats.push(format.toLowerCase());
            }
        }, this);
        if(formats.indexOf(currentFormat) === -1) {
            formats.push(currentFormat);
        }
        var transparent = layer.params["TRANSPARENT"];
        transparent = (transparent === "true" || transparent === true);

        return {
            title: this.displayText,
            layout: 'form',
            bodyStyle: {"padding": "10px"},
            defaults: {
                labelWidth: 70
            },
            items: [{
                xtype: "fieldcontainer",
                layout: "vbox",
                title: this.displayOptionsText,
                items: [{
                    xtype: "gx_opacityslider",
                    name: "opacity",
                    anchor: "99%",
                    width: "100%",
                    isFormField: true,
                    fieldLabel: this.opacityText,
                    listeners: {
                        change: function() {
                            this.fireEvent("change");
                        },
                        scope: this
                    },
                    layer: this.layerRecord
                }, {
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    fieldLabel: this.formatText,
                    anchor: "99%",
                    items: [{
                        xtype: "combo",
                        width: 90,
                        listWidth: 150,
                        store: formats,
                        value: currentFormat,
                        mode: "local",
                        triggerAction: "all",
                        editable: false,
                        listeners: {
                            select: this.onFormatChange,
                            scope: this
                        }
                    }, {
                        xtype: "checkbox",
                        ref: 'transparentCb',
                        checked: transparent,
                        listeners: {
                            check: function(checkbox, checked) {
                                layer.mergeNewParams({
                                    transparent: checked ? "true" : "false"
                                });
                                this.fireEvent("change");
                            },
                            scope: this
                        }
                    }, {
                        xtype: "label",
                        cls: "gxp-layerproperties-label",
                        text: this.transparentText
                    }]
                }, {
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    fieldLabel: this.singleTileText,
                    anchor: "99%",
                    items: [{
                        xtype: "checkbox",
                        checked: this.layerRecord.getLayer().singleTile,
                        listeners: {
                            check: function(checkbox, checked) {
                                layer.addOptions({singleTile: checked});
                                this.fireEvent("change");
                            },
                            scope: this
                        }
                    }, {
                        xtype: "label",
                        cls: "gxp-layerproperties-label",
                        text: this.singleTileFieldText
                    }]
                }, {
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    anchor: "99%",
                    hidden: this.layerRecord.getLayer().params.TILED == null,
                    fieldLabel: this.cacheText,
                    items: [{
                        xtype: "checkbox",
                        checked: (this.layerRecord.getLayer().params.TILED === true),
                        listeners: {
                            check: function(checkbox, checked) {
                                var layer = this.layerRecord.getLayer();
                                layer.mergeNewParams({
                                    TILED: checked
                                });
                                this.fireEvent("change");
                            },
                            scope: this
                        }
                    }, {
                        xtype: "label",
                        cls: "gxp-layerproperties-label",
                        text: this.cacheFieldText
                    }]
                }, {
                    xtype: "combo",
                    fieldLabel: this.infoFormatText,
                    emptyText: this.infoFormatEmptyText,
                    store: record.get("infoFormats"),
                    value: record.get("infoFormat"),
                    hidden: (record.get("infoFormats") === undefined),
                    mode: 'local',
                    listWidth: 150,
                    triggerAction: "all",
                    editable: false,
                    anchor: "99%",
                    listeners: {
                        select: function(combo) {
                            var infoFormat = combo.getValue();
                            record.set("infoFormat", infoFormat);
                            this.fireEvent("change");
                        }
                    },
                    scope: this
                }]
            }, {
                xtype: "fieldset",
                title: this.queryText,
                hideLabels: true,
                ref: "filterFieldset",
                listeners: {
                    expand: function() {
                        this.layerRecord.getLayer().mergeNewParams({CQL_FILTER: this.cqlFilter});
                    },
                    collapse: function() {
                        this.cqlFilter = this.layerRecord.getLayer().params.CQL_FILTER;
                        this.layerRecord.getLayer().mergeNewParams({CQL_FILTER: null});
                    },
                    scope: this
                },
                hidden: this.source === null,
                checkboxToggle: true,
                collapsed: !this.layerRecord.getLayer().params.CQL_FILTER,
                items: [{
                    xtype: "textarea",
                    value: this.layerRecord.getLayer().params.CQL_FILTER,
                    grow: true,
                    anchor: '99%',
                    width: '100%',
                    growMax: 100,
                    ref: "cqlField",
                    hidden: true
                }, {
                    xtype: 'button',
                    ref: "cqlToolbar",
                    hidden: true,
                    text: this.switchToFilterBuilderText,
                    handler: this.switchToFilterBuilder,
                    scope: this
                }]
            }, {
                xtype: "fieldset",
                title: this.scaleText,
                listeners: {
                    expand: function() {
                        var layer = this.layerRecord.getLayer();
                        if (this.minScale !== undefined || this.maxScale !== undefined) {
                            this.addScaleOptions(layer, {minScale: this.maxScale, maxScale: this.minScale});
                        }
                    },
                    collapse: function() {
                        var layer = this.layerRecord.getLayer();
                        this.minScale = layer.options.maxScale;
                        this.maxScale = layer.options.minScale;
                        this.addScaleOptions(layer, {minScale: null, maxScale: null});
                    },
                    scope: this
                },
                checkboxToggle: true,
                collapsed: this.layerRecord.getLayer().options.maxScale == null &&
                    this.layerRecord.getLayer().options.minScale == null,
                items: [{
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    fieldLabel: this.minScaleText,
                    items: [{
                        xtype: "label",
                        text: "1:",
                        cls: "gxp-layerproperties-label"
                    }, {
                        xtype: "numberfield",
                        anchor: '99%',
                        width: '85%',
                        listeners: {
                            'change': function(field) {
                                var options = {
                                    maxScale: parseInt(field.getValue())
                                };
                                var layer = this.layerRecord.getLayer();
                                this.addScaleOptions(layer, options);
                            },
                            scope: this
                        },
                        value: this.layerRecord.getLayer().options.maxScale
                    }]
                }, {
                    xtype: "fieldcontainer",
                    layout: "hbox",
                    fieldLabel: this.maxScaleText,
                    items: [{
                        xtype: "label",
                        text: "1:",
                        cls: "gxp-layerproperties-label"
                    }, {
                        xtype: "numberfield",
                        anchor: '99%',
                        width: '85%',
                        listeners: {
                            'change': function(field) {
                                var options = {
                                    minScale: parseInt(field.getValue())
                                };
                                var layer = this.layerRecord.getLayer();
                                this.addScaleOptions(layer, options);
                            },
                            scope: this
                        },
                        value: this.layerRecord.getLayer().options.minScale
                    }]
                }]
            }]
        };
    }
});
