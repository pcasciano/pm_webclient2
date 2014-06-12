/**
 * @include util.js
 * @requires plugins/LayerSource.js
 * @include OpenLayers/Layer/WMS.js
 * @include OpenLayers/Format/WMSCapabilities/v1_1_0.js
 * @include OpenLayers/Format/WMSCapabilities/v1_1_1.js
 * @include OpenLayers/Format/WMSCapabilities/v1_3_0.js
 * @include OpenLayers/Format/WMSDescribeLayer/v1_1.js
 * @include OpenLayers/Protocol/WFS/v1_1_0.js
 * @requires GeoExt/data/WmsCapabilitiesLayerStore.js
 * @requires GeoExt/data/WmsDescribeLayerStore.js
 * @include GeoExt/data/AttributeStore.js
 * @requires GeoExt/data/WmsCapabilitiesLayerModel.js
 */

Ext.define('gxp.plugins.WMSSource', {
    extend: 'gxp.plugins.LayerSource',
    requires: ['GeoExt.data.WmsDescribeLayerStore', 'GeoExt.data.AttributeStore', 'GeoExt.data.WmsCapabilitiesLayerStore', 'GeoExt.data.WmsCapabilitiesLayerModel'],
    alias: 'plugin.gxp_wmssource',
    requiredProperties: ["title", "bbox"],
    constructor: function(config) {
        this.callParent(arguments);
        if (!this.format) {
            this.format = new OpenLayers.Format.WMSCapabilities({keepData: true});
        }
    },
    isLazy: function() {
        var lazy = true;
        var mapConfig = this.target.initialConfig.map;
        if (mapConfig && mapConfig.layers) {
            var layerConfig;
            for (var i=0, ii=mapConfig.layers.length; i<ii; ++i) {
                layerConfig = mapConfig.layers[i];
                if (layerConfig.source === this.id) {
                    lazy = this.layerConfigComplete(layerConfig);
                    if (lazy === false) {
                        break;
                    }
                }
            }
        }
        return lazy;
    },
    layerConfigComplete: function(config) {
        var lazy = true;
        if (!Ext.isObject(config.capability)) {
            var props = this.requiredProperties;
            for (var i=props.length-1; i>=0; --i) {
                lazy = !!config[props[i]];
                if (lazy === false) {
                    break;
                }
            }
        }
        return lazy;
    },
    createStore: function() {
        var baseParams = this.baseParams || {
            SERVICE: "WMS",
            REQUEST: "GetCapabilities"
        };
        if (this.version) {
            baseParams.VERSION = this.version;
        }

        var lazy = this.isLazy();

        this.store = Ext.create('GeoExt.data.WMSCapabilitiesStore', {
            // Since we want our parameters (e.g. VERSION) to override any in the
            // given URL, we need to remove corresponding paramters from the
            // provided URL.  Simply setting baseParams on the store is also not
            // enough because Ext just tacks these parameters on to the URL - so
            // we get requests like ?Request=GetCapabilities&REQUEST=GetCapabilities
            // (assuming the user provides a URL with a Request parameter in it).
            url: this.trimUrl(this.url, baseParams),
            baseParams: baseParams,
            format: this.format,
            autoLoad: !lazy,
            proxy: {
                type: 'ajax',
                reader: {
                    type: 'gx_wmscapabilities',
                    keepRaw: true
                }
            },
            layerParams: {exceptions: null},
            listeners: {
                load: function() {
                    // The load event is fired even if a bogus capabilities doc
                    // is read (http://trac.geoext.org/ticket/295).
                    // Until this changes, we duck type a bad capabilities
                    // object and fire failure if found.
                    if (!this.store.proxy.reader.raw || !this.store.proxy.reader.raw.service) {
                        this.fireEvent("failure", this, "Invalid capabilities document.");
                    } else {
                        if (!this.title) {
                            this.title = this.store.proxy.reader.raw.service.title;
                        }
                        if (!this.ready) {
                            this.ready = true;
                            this.fireEvent("ready", this);
                        } else {
                            this.lazy = false;
                            //TODO Here we could update all records from this
                            // source on the map that were added when the
                            // source was lazy.
                        }
                    }
                    // clean up data stored on format after parsing is complete
                    delete this.format.data;
                },
                exception: function(proxy, type, action, options, response, error) {
                    delete this.store;
                    var msg, details = "";
                    if (type === "response") {
                        if (typeof error == "string") {
                            msg = error;
                        } else {
                            msg = "Invalid response from server.";
                            // special error handling in IE
                            var data = this.format && this.format.data;
                            if (data && data.parseError) {
                                msg += "  " + data.parseError.reason + " - line: " + data.parseError.line;
                            }
                            var status = response.status;
                            if (status >= 200 && status < 300) {
                                // TODO: consider pushing this into GeoExt
                                var report = error && error.arg && error.arg.exceptionReport;
                                details = gxp.util.getOGCExceptionText(report);
                            } else {
                                details = "Status: " + status;
                            }
                        }
                    } else {
                        msg = "Trouble creating layer store from response.";
                        details = "Unable to handle response.";
                    }
                    // TODO: decide on signature for failure listeners
                    this.fireEvent("failure", this, msg, details);
                    // clean up data stored on format after parsing is complete
                    delete this.format.data;
                },
                scope: this
            }
        });
        if (lazy) {
            this.lazy = lazy;
            this.ready = true;
            this.fireEvent("ready", this);
        }
    },
    trimUrl: function(url, params, respectCase) {
        var urlParams = OpenLayers.Util.getParameters(url);
        params = OpenLayers.Util.upperCaseObject(params);
        var keys = 0;
        for (var key in urlParams) {
            ++keys;
            if (key.toUpperCase() in params) {
                --keys;
                delete urlParams[key];
            }
        }
        return url.split("?").shift() + (keys ?
            "?" + OpenLayers.Util.getParameterString(urlParams) :
            ""
        );
    },
    createLazyLayerRecord: function(config) {
        config = Ext.apply({}, config);

        var srs = config.srs || this.target.map.projection;
        config.srs = {};
        config.srs[srs] = true;

        var bbox = config.bbox || this.target.map.maxExtent || OpenLayers.Projection.defaults[srs].maxExtent;
        config.bbox = {};
        config.bbox[srs] = {bbox: bbox};

        var record;
        var layer = new OpenLayers.Layer.WMS(
            config.title || config.name,
            config.url || this.url, {
                layers: config.name,
                transparent: "transparent" in config ? config.transparent : true,
                cql_filter: config.cql_filter,
                format: config.format
            }, {
                metadata: config,
                projection: srs,
                eventListeners: {
                  tileloaded: this.countAlive,
                  tileerror: this.countAlive,
                  scope: this
                }
            }
        );
        return GeoExt.data.WmsCapabilitiesLayerModel.createFromLayer(layer);
    },
    countAlive: function(evt) {
        if (!('_alive' in evt.object.metadata)) {
            evt.object.metadata._alive = 0;
            evt.object.events.register('loadend', this, this.removeDeadLayer);
        }
        evt.object.metadata._alive += (evt.type == 'tileerror' ? -1 : 1);
    },

    removeDeadLayer: function(evt) {
        evt.object.events.un({
            'tileloaded': this.countAlive,
            'tileerror': this.countAlive,
            'loadend': this.removeDeadLayer,
            scope: this
        });
        if (evt.object.metadata._alive === 0) {
            this.target.mapPanel.map.removeLayer(evt.object);
            if (window.console) {
              console.debug('Unavailable layer ' + evt.object.name + ' removed.');
            }
        }
        delete evt.object.metadata._alive;
    },
    createLayerRecord: function(config) {
        var record, original;
        var index = this.store.findExact("name", config.name);
        if (index > -1) {
            original = this.store.getAt(index);
        } else if (Ext.isObject(config.capability)) {
            original = this.store.proxy.reader.readRecords({capability: {
                request: {getmap: {href: this.trimUrl(this.url, this.baseParams)}},
                layers: [config.capability]}
            }).records[0];
        } else if (this.layerConfigComplete(config)) {
            original = this.createLazyLayerRecord(config);
        }
        if (original) {

            var layer = original.getLayer().clone();

            /**
             * TODO: The WMSCapabilitiesReader should allow for creation
             * of layers in different SRS.
             */
            var projection = this.getMapProjection();

            // If the layer is not available in the map projection, find a
            // compatible projection that equals the map projection. This helps
            // us in dealing with the different EPSG codes for web mercator.
            var layerProjection = this.getProjection(original);
            if (layerProjection) {
                layer.addOptions({projection: layerProjection});
            }

            var projCode = (layerProjection || projection).getCode(),
                bbox = original.get("bbox"), maxExtent;

            // determine maxExtent in map projection
            if (bbox && bbox[projCode]){
                maxExtent = OpenLayers.Bounds.fromArray(bbox[projCode].bbox, layer.reverseAxisOrder());
            } else {
                var llbbox = original.get("llbbox");
                if (llbbox) {
                    llbbox[0] = Math.max(llbbox[0], -180);
                    llbbox[1] = Math.max(llbbox[1], -90);
                    llbbox[2] = Math.min(llbbox[2], 180);
                    llbbox[3] = Math.min(llbbox[3], 90);
                    maxExtent = OpenLayers.Bounds.fromArray(llbbox).transform("EPSG:4326", projection);
                }
            }
            // update params from config
            layer.mergeNewParams({
                STYLES: config.styles,
                FORMAT: config.format,
                TRANSPARENT: config.transparent,
                CQL_FILTER: config.cql_filter
            });

            var singleTile = false;
            if ("tiled" in config) {
                singleTile = !config.tiled;
            } else {
                // for now, if layer has a time dimension, use single tile
                if (original.data.dimensions && original.data.dimensions.time) {
                    singleTile = true;
                }
            }

            layer.setName(config.title || layer.name);
            layer.addOptions({
                attribution: layer.attribution || config.attribution,
                maxExtent: maxExtent,
                restrictedExtent: maxExtent,
                singleTile: singleTile,
                ratio: config.ratio || 1,
                visibility: ("visibility" in config) ? config.visibility : true,
                opacity: ("opacity" in config) ? config.opacity : 1,
                buffer: ("buffer" in config) ? config.buffer : 1,
                dimensions: original.data.dimensions,
                transitionEffect: singleTile ? 'resize' : null,
                minScale: config.minscale,
                maxScale: config.maxscale
            });
            Ext.define('gxp.data.WMSLayerModel',{
                extend: 'GeoExt.data.WmsCapabilitiesLayerModel',
                fields: [
                    {name: "metadataURLs", mapping: "metadata.metadataURLs"}, // array
                    {name: "source", type: "string", mapping: 'metadata.source'},
                    {name: "group", type: "string", mapping: 'metadata.group'},
                    {name: "fixed", type: "boolean", mapping: 'metadata.fixed'},
                    {name: "selected", type: "boolean", mapping: 'metadata.selected'},
                    {name: "properties", type: "string", mapping: 'metadata.properties'},
                    {name: "restUrl", type: "string", mapping: 'metadata.restUrl'},
                    {name: "infoFormat", type: "string", mapping: 'metadata.infoFormat'},
                    {name: "getFeatureInfo", mapping: 'metadata.getFeatureInfo'},
                    {name: "queryable", type: "boolean", mapping: 'metadata.queryable'}
               ]
            });
            Ext.applyIf(layer.metadata, {
                title: layer.name,
                group: config.group,
                infoFormat: config.infoFormat,
                getFeatureInfo:  config.getFeatureInfo,
                source: config.source,
                properties: "gxp_wmslayerpanel",
                fixed: config.fixed,
                queryable: config.queryable,
                selected: "selected" in config ? config.selected : false,
                restUrl: this.restUrl,
                layer: layer
            });
            record = gxp.data.WMSLayerModel.createFromLayer(layer);
        } else {
            if (window.console && this.store.getCount() > 0 && config.name !== undefined) {
                console.warn("Could not create layer record for layer '" + config.name + "'. Check if the layer is found in the WMS GetCapabilities response.");
            }
        }
        return record;
    },
    getProjection: function(layerRecord) {
        var projection = this.getMapProjection();
        var compatibleProjection = projection;
        var availableSRS = layerRecord.get("srs");
        if (!availableSRS[projection.getCode()]) {
            compatibleProjection = null;
            var p, srs;
            for (srs in availableSRS) {
                if ((p=new OpenLayers.Projection(srs)).equals(projection)) {
                    compatibleProjection = p;
                    break;
                }
            }
        }
        return compatibleProjection;
    },
    initDescribeLayerStore: function() {
        var raw = this.store.proxy.reader.raw;
        if (this.lazy) {
            // When lazy, we assume that the server supports a DescribeLayer
            // request at the layer's url.
            raw = {
                capability: {
                    request: {
                        describelayer: {href: this.url}
                    }
                },
                version: this.version || "1.1.1"
            };
        }
        var req = raw.capability.request.describelayer;
        if (req) {
            var version = raw.version;
            if (parseFloat(version) > 1.1) {
                //TODO don't force 1.1.1, fall back instead
                version = "1.1.1";
            }
            var params = {
                SERVICE: "WMS",
                VERSION: version,
                REQUEST: "DescribeLayer"
            };
            this.describeLayerStore = Ext.create('GeoExt.data.WMSDescribeLayerStore', {
                url: this.trimUrl(req.href, params),
                baseParams: params
            });
        }
    },
    describeLayer: function(rec, callback, scope) {
        if (!this.describeLayerStore) {
            this.initDescribeLayerStore();
        }
        function delayedCallback(arg) {
            window.setTimeout(function() {
                callback.call(scope, arg);
            }, 0);
        }
        if (!this.describeLayerStore) {
            delayedCallback(false);
            return;
        }
        if (!this.describedLayers) {
            this.describedLayers = {};
        }
        var layerName = rec.getLayer().params.LAYERS;
        var cb = function() {
            var recs = Ext.isArray(arguments[1]) ? arguments[1] : arguments[0];
            var rec, name;
            for (var i=recs.length-1; i>=0; i--) {
                rec = recs[i];
                name = rec.get("layerName");
                if (name == layerName) {
                    this.describeLayerStore.un("load", arguments.callee, this);
                    this.describedLayers[name] = true;
                    callback.call(scope, rec);
                    return;
                } else if (typeof this.describedLayers[name] == "function") {
                    var fn = this.describedLayers[name];
                    this.describeLayerStore.un("load", fn, this);
                    fn.apply(this, arguments);
                }
            }
            // something went wrong (e.g. GeoServer does not return a valid
            // DescribeFeatureType document for group layers)
            delete describedLayers[layerName];
            callback.call(scope, false);
        };
        var describedLayers = this.describedLayers;
        var index;
        if (!describedLayers[layerName]) {
            describedLayers[layerName] = cb;
            this.describeLayerStore.load({
                params: {LAYERS: layerName},
                add: true,
                callback: cb,
                scope: this
            });
        } else if ((index = this.describeLayerStore.findExact("layerName", layerName)) == -1) {
            this.describeLayerStore.on("load", cb, this);
        } else {
            delayedCallback(this.describeLayerStore.getAt(index));
        }
    },
    fetchSchema: function(url, typeName, callback, scope) {
        var schema = this.schemaCache[typeName];
        if (schema) {
            if (schema.getCount() == 0) {
                schema.on("load", function() {
                    callback.call(scope, schema);
                }, this, {single: true});
            } else {
                callback.call(scope, schema);
            }
        } else {
            schema = Ext.create('GeoExt.data.AttributeStore', {
                url: this.url, /* TODO use correct url (local var) but requires proxy */
                baseParams: {
                    SERVICE: "WFS",
                    //TODO should get version from WFS GetCapabilities
                    VERSION: "1.1.0",
                    REQUEST: "DescribeFeatureType",
                    TYPENAME: typeName
                },
                proxy: {
                    type: 'ajax',
                    reader: {
                        type: 'gx_attribute',
                        keepRaw: true
                    }
                },
                autoLoad: true,
                listeners: {
                    "load": function() {
                        callback.call(scope, schema);
                    },
                    scope: this
                }
            });
            this.schemaCache[typeName] = schema;
        }
    },
    getSchema: function(rec, callback, scope) {
        if (!this.schemaCache) {
            this.schemaCache = {};
        }
        this.describeLayer(rec, function(r) {
            if (r && r.get("owsType") == "WFS") {
                var typeName = r.get("typeName");
                var url = r.get("owsURL");
                this.fetchSchema(url, typeName, callback, scope);
            } else if (!r) {
                // When DescribeLayer is not supported, we make the following
                // assumptions:
                // 1. URL of the WFS is the same as the URL of the WMS
                // 2. typeName is the same as the WMS Layer name
                this.fetchSchema(this.url, rec.get('name'), callback, scope);
            } else {
                callback.call(scope, false);
            }
        }, this);
    },
    getWFSProtocol: function(record, callback, scope) {
        this.getSchema(record, function(schema) {
            var protocol = false;
            if (schema) {
                var geometryName;
                var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
                schema.each(function(r) {
                    var match = geomRegex.exec(r.get("type"));
                    if (match) {
                        geometryName = r.get("name");
                    }
                }, this);
                protocol = new OpenLayers.Protocol.WFS({
                    version: "1.1.0",
                    srsName: record.getLayer().projection.getCode(),
                    url: schema.url,
                    featureType: schema.proxy.reader.raw.featureTypes[0].typeName,
                    featureNS: schema.proxy.reader.raw.targetNamespace,
                    geometryName: geometryName
                });
            }
            callback.call(scope, protocol, schema, record);
        }, this);
    },
    getConfigForRecord: function(record) {
        var config = Ext.applyIf(
                gxp.plugins.WMSSource.superclass.getConfigForRecord.apply(this, arguments),
                record.json
            ),
            layer = record.getLayer(),
            params = layer.params,
            options = layer.options;
        var name = config.name,
            raw = this.store.proxy.reader.raw;
        if (raw) {
            var capLayers = raw.capability.layers;
            for (var i=capLayers.length-1; i>=0; --i) {
                if (capLayers[i].name === name) {
                    config.capability = Ext.apply({}, capLayers[i]);
                    var srs = {};
                    srs[layer.projection.getCode()] = true;
                    // only store the map srs, because this list can be huge
                    config.capability.srs = srs;
                    break;
                }
            }
        }
        if (!config.capability) {
            if (layer.maxExtent) {
                config.bbox = layer.maxExtent.toArray();
            }
            config.srs = layer.projection.getCode();
        }
        return Ext.apply(config, {
            format: params.FORMAT,
            styles: params.STYLES,
            tiled: !options.singleTile,
            transparent: params.TRANSPARENT,
            cql_filter: params.CQL_FILTER,
            minscale: options.minScale,
            maxscale: options.maxScale,
            infoFormat: record.get("infoFormat"),
            attribution: layer.attribution
        });
    },
    getState: function() {
        var state = gxp.plugins.WMSSource.superclass.getState.apply(this, arguments);
        return Ext.applyIf(state, {title: this.title});
    }
});
