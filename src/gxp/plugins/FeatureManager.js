/**
 * @requires plugins/Tool.js
 * @requires data/WFSFeatureStore.js
 * @requires data/proxy/WFSProtocol.js
 * @include OpenLayers/StyleMap.js
 * @include OpenLayers/Rule.js
 * @include OpenLayers/Layer/Vector.js
 * @include OpenLayers/Renderer/SVG.js
 * @include OpenLayers/Renderer/VML.js
 * @include OpenLayers/Renderer/Canvas.js
 */

Ext.define('gxp.plugins.FeatureManager', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_featuremanager',
    requires: ['gxp.data.WFSFeatureStore', 'gxp.data.proxy.WFSProtocol'],
    maxFeatures: 100,
    paging: true,
    pagingType: null,
    autoZoomPage: false,
    autoSetLayer: true,
    autoLoadFeatures: false,
    layerRecord: null,
    featureStore: null,
    hitCountProtocol: null,
    featureLayer: null,
    schema: null,
    geometryType: null,
    toolsShowingLayer: null,
    selectStyle: null,
    style: null,
    pages: null,
    page: null,
    numberOfFeatures: null,
    numPages: null,
    pageIndex: null,
    statics: {
        QUADTREE_PAGING: 0,
        WFS_PAGING: 1
    },
    constructor: function(config) {
        this.addEvents(
            "beforequery",
            "query",
            "beforelayerchange",
            "layerchange",
            "beforesetpage",
            "setpage",
            "beforeclearfeatures",
            "clearfeatures",
            "beforesave",
            "exception"
        );
        if (config && !config.pagingType) {
            this.pagingType = gxp.plugins.FeatureManager.QUADTREE_PAGING;
        }

        // change autoSetLayer default if passed a layer config
        if (config && config.layer) {
            this.autoSetLayer = false;
        }
        this.callParent(arguments);
    },
    init: function(target) {
        this.callParent(arguments);
        this.toolsShowingLayer = {};

        this.style = {
            "all": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({
                    symbolizer: this.initialConfig.symbolizer || {
                        "Point": {
                            pointRadius: 4,
                            graphicName: "square",
                            fillColor: "white",
                            fillOpacity: 1,
                            strokeWidth: 1,
                            strokeOpacity: 1,
                            strokeColor: "#333333"
                        },
                        "Line": {
                            strokeWidth: 4,
                            strokeOpacity: 1,
                            strokeColor: "#ff9933"
                        },
                        "Polygon": {
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#ff6633",
                            fillColor: "white",
                            fillOpacity: 0.3
                        }
                    }
                })]
            }),
            "selected": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({symbolizer: {display: "none"}})]
            })
        };
        this.featureLayer = new OpenLayers.Layer.Vector(this.id, {
            displayInLayerSwitcher: false,
            visibility: false,
            styleMap: new OpenLayers.StyleMap({
                "select": Ext.applyIf(Ext.apply({display: ""}, this.selectStyle),
                    OpenLayers.Feature.Vector.style["select"]),
                "vertex": this.style["all"]
            }, {extendDefault: false})
        });

        this.target.on({
            ready: function() {
                this.target.mapPanel.map.addLayer(this.featureLayer);
            },
            //TODO add featureedit listener; update the store
            scope: this
        });
        this.on({
            //TODO add a beforedestroy event to the tool
            beforedestroy: function() {
                this.target.mapPanel.map.removeLayer(this.featureLayer);
            },
            scope: this
        });
    },
    activate: function() {
        if (this.callParent(arguments)) {
            if (this.autoSetLayer) {
                this.target.on("beforelayerselectionchange", this.setLayer, this);
            }
            if (this.layer) {
                var config = Ext.apply({}, this.layer);
                this.target.createLayerRecord(config, this.setLayer, this);
            }
            this.on("layerchange", this.setSchema, this);
            return true;
        }
    },
    deactivate: function() {
        if (this.callParent(arguments)) {
            if (this.autoSetLayer) {
                this.target.un("beforelayerselectionchange", this.setLayer, this);
            }
            this.un("layerchange", this.setSchema, this);
            this.setLayer();
            return true;
        }
    },
    getPageExtent: function() {
        if (this.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING) {
            return this.page.extent;
        } else {
            return this.featureStore.layer.getDataExtent();
        }
    },
    setLayer: function(layerRecord) {
        var change = this.fireEvent("beforelayerchange", this, layerRecord);
        if (change !== false) {
            if (layerRecord) {
                // do not use getProjection here since we never want to use the
                // map's projection on the feature layer
                this.featureLayer.projection = layerRecord.getLayer().projection;
            }
            if (layerRecord !== this.layerRecord) {
                this.clearFeatureStore();
                this.layerRecord = layerRecord;
                if (layerRecord) {
                    this.autoLoadFeatures === true ?
                        this.loadFeatures() :
                        this.setFeatureStore();
                } else {
                    this.fireEvent("layerchange", this, null);
                }
            }
        }
        return change;
    },
    setSchema: function(mgr, layer, schema) {
        this.schema = schema;
    },
    showLayer: function(id, display) {
        this.toolsShowingLayer[id] = display || "all";
        this.setLayerDisplay();
    },
    hideLayer: function(id) {
        delete this.toolsShowingLayer[id];
        this.setLayerDisplay();
    },
    setLayerDisplay: function() {
        var show = this.visible();
        var map = this.target.mapPanel.map;
        if (show) {
            var style = this.style[show]; // "all" or "selected"
            if (style !== this.featureLayer.styleMap.styles["default"]) {
                this.featureLayer.styleMap.styles["default"] = style;
                this.featureLayer.redraw();
            }
            this.featureLayer.setVisibility(true);
            map.events.on({
                addlayer: this.raiseLayer,
                scope: this
            });
        } else if (this.featureLayer.map) {
            this.featureLayer.setVisibility(false);
            map.events.un({
                addlayer: this.raiseLayer,
                scope: this
            });
        }
    },
    visible: function() {
        var show = false;
        for (var i in this.toolsShowingLayer) {
            if (show != "all") {
                show = this.toolsShowingLayer[i];
            }
        }
        return show;
    },
    raiseLayer: function() {
        var map = this.featureLayer && this.featureLayer.map;
        if (map) {
            map.setLayerIndex(this.featureLayer, map.layers.length);
        }
    },
    loadFeatures: function(filter, callback, scope) {
        if (this.fireEvent("beforequery", this, filter, callback, scope) !== false) {
            this.filter = filter;
            this.pages = null;
            if (callback) {
                var me = this;
                // unregister previous listener, if any
                me._activeQuery && me.un("query", me._activeQuery);
                this.on("query", me._activeQuery = function(tool, store) {
                    delete me._activeQuery;
                    this.un("query", arguments.callee, this);
                    var len = store.getCount();
                    if (store.getCount() == 0) {
                        callback.call(scope, []);
                    } else {
                        // wait until the features are added to the layer,
                        // so it is easier for listeners that e.g. want to
                        // select features, which requires them to be on
                        // a layer.
                        this.featureLayer.events.register("featuresadded", this, function(evt) {
                            this.featureLayer.events.unregister("featuresadded", this, arguments.callee);
                            callback.call(scope, evt.features);
                        });
                    }
                }, this, {single: true});
            }
            if (!this.featureStore) {
                this.paging && this.on("layerchange", function(tool, rec, schema) {
                    if (schema) {
                        this.un("layerchange", arguments.callee, this);
                        this.setPage();
                    }
                }, this);
                this.setFeatureStore(filter, !this.paging);
            } else {
                this.featureStore.setOgcFilter(filter);
                if (this.paging) {
                    this.setPage();
                } else {
                    this.featureStore.load();
                }
            }
        }
    },
    clearFeatures: function() {
        var store = this.featureStore;
        if (store) {
            if (this.fireEvent("beforeclearfeatures", this) !== false) {
                store.removeAll();
                this.fireEvent("clearfeatures", this);
                // TODO: make abort really work in OpenLayers
                var proxy = store.proxy;
                proxy.abortRequest();
                if (proxy.protocol.response) {
                    proxy.protocol.response.abort();
                }
            }
        }
    },
    getProjection: function(record) {
        var projection = this.target.mapPanel.map.getProjectionObject();
        var layerProj = record.getLayer().projection;
        if (layerProj && layerProj.equals(projection)) {
            projection = layerProj;
        }
        return projection;
    },
    setFeatureStore: function(filter, autoLoad) {
        var record = this.layerRecord;
        var source = this.target.getSource(record);
        if (source && source instanceof gxp.plugins.WMSSource) {
            source.getSchema(record, function(schema) {
                if (schema === false) {
                    this.clearFeatureStore();
                } else {
                    var fields = [], geometryName;
                    var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
                    var types = {
                        "xsd:boolean": "boolean",
                        "xsd:int": "int",
                        "xsd:integer": "int",
                        "xsd:short": "int",
                        "xsd:long": "int",
                        "xsd:date": "date",
                        "xsd:string": "string",
                        "xsd:float": "float",
                        "xsd:double": "float"
                    };
                    schema.each(function(r) {
                        var match = geomRegex.exec(r.get("type"));
                        if (match) {
                            geometryName = r.get("name");
                            this.geometryType = match[1];
                        } else {
                            // TODO: use (and improve if needed) GeoExt.form.recordToField
                            var type = types[r.get("type")];
                            var field = {
                                name: r.get("name"),
                                type: types[type]
                            };
                            //TODO consider date type handling in OpenLayers.Format
                            if (type == "date") {
                                field.dateFormat = "Y-m-d\\Z";
                            }
                            fields.push(field);
                        }
                    }, this);

                    var protocolOptions = {
                        srsName: this.getProjection(record).getCode(),
                        url: schema.url,
                        featureType: schema.proxy.reader.raw.featureTypes[0].typeName,
                        featureNS: schema.proxy.reader.raw.targetNamespace,
                        geometryName: geometryName
                    };
                    this.hitCountProtocol = new OpenLayers.Protocol.WFS(Ext.apply({
                        version: "1.1.0",
                        readOptions: {output: "object"},
                        resultType: "hits",
                        filter: filter
                    }, protocolOptions));
                    this.featureStore = Ext.create('gxp.data.WFSFeatureStore', Ext.apply({
                        fields: fields,
                        proxy: {
                            type: 'gxp_wfsprotocol',
                            outputFormat: this.format,
                            multi: this.multi,
                            setParamsAsOptions: true,
                            limitParam: 'maxFeatures'
                        },
                        pageSize: this.maxFeatures,
                        layer: this.featureLayer,
                        ogcFilter: filter,
                        autoLoad: autoLoad,
                        autoSave: false,
                        listeners: {
                            "beforewrite": function(store, action, rs, options) {
                                this.fireEvent("beforesave", this, store, options.params);
                            },
                            "write": function(store, action, result, res, rs) {
                                this.redrawMatchingLayers(record);
                            },
                            "load": function(store, rs, options) {
                                this.fireEvent("query", this, store, this.filter);
                            },
                            scope: this
                        }
                    }, protocolOptions));
                }
                this.fireEvent("layerchange", this, record, schema);
            }, this);
        } else {
            this.clearFeatureStore();
            this.fireEvent("layerchange", this, record, false);
        }
    },
    redrawMatchingLayers: function(record) {
        var name = record.get("name");
        var source = record.get("source");
        this.target.mapPanel.layers.each(function(candidate) {
            if (candidate.get("source") === source && candidate.get("name") === name) {
                candidate.getLayer().redraw(true);
            }
        });
    },
    clearFeatureStore: function() {
        if (this.featureStore) {
            //TODO remove when http://trac.geoext.org/ticket/367 is resolved
            this.featureStore.removeAll();
            this.featureStore.unbind();
            // end remove
            this.featureStore.destroy();
            this.numberOfFeatures = null;
            this.featureStore = null;
            this.geometryType = null;
        }
    },
    processPage: function (page, condition, callback, scope) {
        condition = condition || {};
        var index = condition.lonLat ? null : condition.index;
        var next = condition.next;
        var pages = this.pages;
        var i = this.pages.indexOf(page);
        this.setPageFilter(page);
        var nextOk = next ?
            i == (pages.indexOf(next) || pages.length) - 1 : true;
        var lonLatOk = condition.lonLat ?
            page.extent.containsLonLat(condition.lonLat) : true;
        if (lonLatOk && page.numFeatures && page.numFeatures <= this.maxFeatures) {
            // nothing to do, leaf is a valid page
            callback.call(this, page);
        } else if (lonLatOk && (i == index || nextOk)) {
            // get the hit count if the page is relevant for the requested index
            this.hitCountProtocol.read({
                callback: function(response) {
                    var i = index, lonLat = condition.lonLat;
                    if (next) {
                        i = (pages.indexOf(next) || pages.length) - 1;
                    }
                    if (!i && lonLat && page.extent.containsLonLat(lonLat)) {
                        i = pages.indexOf(page);
                    }
                    page.numFeatures = response.numberOfFeatures;
                    if (this.page) {
                        return;
                    }
                    if (page.numFeatures > this.maxFeatures) {
                        this.createLeaf(page, Ext.applyIf({
                            index: i,
                            next: next
                        }, condition), callback, scope);
                    } else if (page.numFeatures == 0 && pages.length > 1) {
                        // remove page, unless it's the only one (which means
                        // that loadFeatures returned no features)
                        pages.remove(page);
                        // move to the next page if the removed page would have
                        // been the one for our location
                        condition.allowEmpty === false && this.setPage({
                            index: index % this.pages.length,
                            allowEmpty: false
                        });
                    } else if (this.pages.indexOf(page) == i) {
                        callback.call(this, page);
                    }
                },
                scope: this
            });
        }
    },
    createLeaf: function(page, condition, callback, scope) {
        condition = condition || {};
        var layer = this.layerRecord.getLayer();
        var pageIndex = this.pages.indexOf(page);
        // replace the page with its 4 subpages, so we remove it first.
        this.pages.remove(page);
        var extent = page.extent;
        var center = extent.getCenterLonLat();
        var l = [extent.left, center.lon, extent.left, center.lon];
        var b = [center.lat, center.lat, extent.bottom, extent.bottom];
        var r = [center.lon, extent.right, center.lon, extent.right];
        var t = [extent.top, extent.top, center.lat, center.lat];
        var i, leaf;
        for (i=3; i>=0; --i) {
            leaf = {extent: new OpenLayers.Bounds(l[i], b[i], r[i], t[i])};
            this.pages.splice(pageIndex, 0, leaf);
            this.processPage(leaf, condition, callback, scope);
        }
    },
    getPagingExtent: function(meth) {
        var layer = this.layerRecord.getLayer();
        var filter = this.getSpatialFilter();
        var extent = filter ? filter.value : this.target.mapPanel.map[meth]();
        if (extent && layer.maxExtent) {
            if (extent.containsBounds(layer.maxExtent)) {
                // take the smaller one of the two
                extent = layer.maxExtent;
            }
        }
        return extent;
    },
    getSpatialFilter: function() {
        var filter;
        if (this.filter instanceof OpenLayers.Filter.Spatial && this.filter.type === OpenLayers.Filter.Spatial.BBOX) {
            filter = this.filter;
        } else if (this.filter instanceof OpenLayers.Filter.Logical && this.filter.type === OpenLayers.Filter.Logical.AND) {
            for (var f, i=this.filter.filters.length-1; i>=0; --i) {
                f = this.filter.filters[i];
                if (f instanceof OpenLayers.Filter.Spatial && f.type === OpenLayers.Filter.Spatial.BBOX) {
                    filter = f;
                    break;
                }
            }
        }
        return filter;
    },
    setPageFilter: function(page) {
        var filter;
        if (page.extent) {
            var bboxFilter = new OpenLayers.Filter.Spatial({
                type: OpenLayers.Filter.Spatial.BBOX,
                property: this.featureStore.geometryName,
                value: page.extent
            });
            filter = this.filter ?
                new OpenLayers.Filter.Logical({
                    type: OpenLayers.Filter.Logical.AND,
                    filters: [this.filter, bboxFilter]
                }) : bboxFilter;
        } else {
            filter = this.filter;
        }
        this.featureStore.setOgcFilter(filter);
        //TODO the protocol could use a setFilter method
        // http://trac.osgeo.org/openlayers/ticket/3201
        this.hitCountProtocol.filter = filter;
        this.hitCountProtocol.options.filter = filter;
        return filter;
    },
    nextPage: function(callback, scope) {
        var index;
        if (this.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING) {
            var page = this.page;
            this.page = null;
            index = (this.pages.indexOf(page) + 1) % this.pages.length;
        } else {
            index = this.pageIndex+1 % this.numPages;
        }
        this.setPage({index: index, allowEmpty: false}, callback, scope);
    },
    previousPage: function(callback, scope) {
        var index;
        if (this.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING) {
            index = this.pages.indexOf(this.page) - 1;
            if (index < 0) {
                index = this.pages.length - 1;
            }
        } else {
            index = this.pageIndex-1;
            if (index < 0) {
                index = this.numPages - 1;
            }
        }
        this.setPage({index: index, allowEmpty: false, next: this.page}, callback);
    },
    setPage: function(condition, callback, scope) {
        if (this.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING) {
            if (this.filter instanceof OpenLayers.Filter.FeatureId) {
                // no paging for FeatureId filters - these cannot be combined with
                // BBOX filters
                this.featureStore.load({callback: function() {
                    callback && callback.call(scope);
                }});
                return;
            }
            if (this.fireEvent("beforesetpage", this, condition, callback, scope) !== false) {
                if (!condition) {
                    // choose a page on the top left
                    var extent = this.getPagingExtent("getExtent");
                    var lonLat = new OpenLayers.LonLat(extent.left, extent.top);
                    // detect corner coordinate outside maxExtent and fall back
                    // to maxExtent
                    var maxExtent = this.target.mapPanel.map.getMaxExtent();
                    if (!maxExtent.containsLonLat(lonLat, true)) {
                        lonLat = new OpenLayers.LonLat(maxExtent.left, maxExtent.top);
                    }
                    condition = {
                        lonLat: lonLat,
                        allowEmpty: false
                    };
                }
                condition.index = condition.index || 0;
                if (condition.index == "last") {
                    condition.index = this.pages.length - 1;
                    condition.next = this.pages[0];
                }
                this.page = null;
                if (!this.pages) {
                    var layer = this.layerRecord.getLayer();
                    var queryExtent = this.getPagingExtent("getMaxExtent");
                    this.pages = [{extent: queryExtent}];
                    condition.index = 0;
                } else if (condition.lonLat) {
                    for (var i=this.pages.length-1; i>=0; --i) {
                        if (this.pages[i].extent.containsLonLat(condition.lonLat)) {
                            condition.index = i;
                            break;
                        }
                    }
                }
                this.processPage(this.pages[condition.index], condition,
                    function(page) {
                        var map = this.target.mapPanel.map;
                        this.page = page;
                        this.setPageFilter(page);
                        if (this.autoZoomPage && !map.getExtent().containsLonLat(page.extent.getCenterLonLat())) {
                            map.zoomToExtent(page.extent);
                        }
                        var pageIndex = this.pages.indexOf(this.page);
                        this.fireEvent("setpage", this, condition, callback, scope, pageIndex, this.pages.length);
                        this.featureStore.load({callback: function() {
                            callback && callback.call(scope, page);
                        }});
                    }, this
                );
            }
        } else {
            if (this.fireEvent("beforesetpage", this, condition, callback, scope) !== false) {
                if (!condition) {
                    this.hitCountProtocol.read({
                        filter: this.filter,
                        callback: function(response) {
                            this.numberOfFeatures = response.numberOfFeatures;
                            this.numPages = Math.ceil(this.numberOfFeatures/this.maxFeatures);
                            this.pageIndex = 0;
                            this.fireEvent("setpage", this, condition, callback, scope, this.pageIndex, this.numPages);
                            this.featureStore.load({output: "object", callback: function() {
                                callback && callback.call(scope);
                            }});
                        },
                        scope: this
                    });
                } else {
                    if (condition.index != null) {
                        if (condition.index === "last") {
                            this.pageIndex = this.numPages-1;
                        } else if (condition.index === "first") {
                            this.pageIndex = 0;
                        } else {
                            this.pageIndex = condition.index;
                        }
                        var startIndex = this.pageIndex*this.maxFeatures;
                        this.fireEvent("setpage", this, condition, callback, scope, this.pageIndex, this.numPages);
                        this.featureStore.load({params: {startIndex: startIndex}, callback: function() {
                            callback && callback.call(scope);
                        }});
                    }
                }
            }
        }
    }

});
