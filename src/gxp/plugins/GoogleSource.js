/**
 * @requires plugins/LayerSource.js
 * @requires GeoExt/data/LayerModel.js
 * @requires GeoExt/data/LayerStore.js
 * @include OpenLayers/Layer/Google/v3.js
 */

Ext.define('gxp.plugins.GoogleSourceLoader', {
    extend: 'Ext.util.Observable',
    singleton: true,
    ready: !!(window.google && google.maps),
    loading: false,
    constructor: function() {
        this.addEvents(
            /** private: event[ready]
             *  Fires when this plugin type is ready.
             */
             "ready",

             /** private: event[failure]
              *  Fires when script loading fails.
              */
              "failure"
        );
        this.callParent(arguments);
    },
    onScriptLoad: function() {
        // the google loader calls this in the window scope
        var monitor = gxp.plugins.GoogleSourceLoader;
        if (!monitor.ready) {
            monitor.ready = true;
            monitor.loading = false;
            monitor.fireEvent("ready");
        }
    },
    onLoad: function(options) {
        if (this.ready) {
            // call this in the next turn for consistent return before callback
            window.setTimeout(function() {
                options.callback.call(options.scope);
            }, 0);
        } else if (!this.loading) {
            this.loadScript(options);
        } else {
            this.on({
                ready: options.callback,
                failure: options.errback || Ext.emptyFn,
                scope: options.scope
            });
        }
    },
    loadScript: function(options) {

        var params = {
            autoload: Ext.encode({
                modules: [{
                    name: "maps",
                    version: 3.3,
                    nocss: "true",
                    callback: "gxp.plugins.GoogleSourceLoader.onScriptLoad",
                    other_params: options.otherParams
                }]
            })
        };

        var script = document.createElement("script");
        script.src = "http://www.google.com/jsapi?" + Ext.urlEncode(params);

        // cancel loading if monitor is not ready within timeout
        var errback = options.errback || Ext.emptyFn;
        var timeout = options.timeout || gxp.plugins.GoogleSource.prototype.timeout;
        var me = this;
        window.setTimeout((function() {
            if (!gxp.plugins.GoogleSourceLoader.ready) {
                me.loading = false;
                me.ready = false;
                document.getElementsByTagName("head")[0].removeChild(script);
                errback.call(options.scope);
                me.fireEvent("failure");
                me.purgeListeners();
            }
        }), timeout);

        // register callback for ready
        this.on({
            ready: options.callback,
            scope: options.scope
        });

        this.loading = true;

        // The google loader accesses document.body, so we don't add the loader
        // script before the document is ready.
        function append() {
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        if (document.body) {
            append();
        } else {
            Ext.onReady(append);
        }

    }
});

Ext.define('gxp.plugins.GoogleSource', {
    extend: 'gxp.plugins.LayerSource',
    alias: 'plugin.gxp_googlesource',
    timeout: 7000,
    title: "Google Layers",
    roadmapAbstract: "Show street map",
    satelliteAbstract: "Show satellite imagery",
    hybridAbstract: "Show imagery with street names",
    terrainAbstract: "Show street map with terrain",
    otherParams: "sensor=false",
    createStore: function() {
        gxp.plugins.GoogleSourceLoader.onLoad({
            otherParams: this.otherParams,
            timeout: this.timeout,
            callback: this.syncCreateStore,
            errback: function() {
                delete this.store;
                this.fireEvent(
                    "failure",
                    this,
                    "The Google Maps script failed to load within the provided timeout (" + (this.timeout / 1000) + " s)."
                );
            },
            scope: this
        });
    },
    syncCreateStore: function() {
        // TODO: The abstracts ("alt" properties) should be derived from the
        // MapType objects themselves.  It doesn't look like there is currently
        // a way to get the default map types before creating a map object.
        // http://code.google.com/p/gmaps-api-issues/issues/detail?id=2562
        // TODO: We may also be able to determine the MAX_ZOOM_LEVEL for each
        // layer type. If not, consider setting them on the OpenLayers level.
        var mapTypes = {
            "ROADMAP": {"abstract": this.roadmapAbstract, MAX_ZOOM_LEVEL: 20},
            "SATELLITE": {"abstract": this.satelliteAbstract},
            "HYBRID": {"abstract": this.hybridAbstract},
            "TERRAIN": {"abstract": this.terrainAbstract, MAX_ZOOM_LEVEL: 15}
        };

        var layers = [];
        var name, mapType;
        for (name in mapTypes) {
            mapType = google.maps.MapTypeId[name];
            layers.push(new OpenLayers.Layer.Google(
                // TODO: get MapType object name
                // http://code.google.com/p/gmaps-api-issues/issues/detail?id=2562
                "Google " + mapType.replace(/\w/, function(c) {return c.toUpperCase();}), {
                    type: mapType,
                    typeName: name,
                    MAX_ZOOM_LEVEL: mapTypes[name].MAX_ZOOM_LEVEL,
                    maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
                    restrictedExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
                    projection: this.projection
                }
            ));
        }
        Ext.define('gxp.data.GoogleLayerModel',{
            extend: 'GeoExt.data.LayerModel',
            fields: [
                {name: "source", type: "string"},
                {name: "name", type: "string", mapping: "typeName"},
                {name: "abstract", type: "string"},
                {name: "group", type: "string", defaultValue: "background"},
                {name: "fixed", type: "boolean", defaultValue: true},
                {name: "selected", type: "boolean"}
            ]
        });
        this.store = Ext.create('GeoExt.data.LayerStore', {
            layers: layers,
            model: 'gxp.data.GoogleLayerModel'
        });
        this.store.each(function(l) {
            l.set("abstract", mapTypes[l.get("name")]["abstract"]);
        });
        this.fireEvent("ready", this);
    },
    createLayerRecord: function(config) {
        var record;
        var cmp = function(l) {
            return l.get("name") === config.name;
        };
        // only return layer if app does not have it already
        if (this.target.mapPanel.layers.findBy(cmp) == -1) {
            // records can be in only one store
            record = this.store.getAt(this.store.findBy(cmp)).copy();
            var layer = record.getLayer();
            // set layer title from config
            if (config.title) {
                /**
                 * Because the layer title data is duplicated, we have
                 * to set it in both places.  After records have been
                 * added to the store, the store handles this
                 * synchronization.
                 */
                layer.setName(config.title);
                record.set("title", config.title);
            }
            // set visibility from config
            if ("visibility" in config) {
                layer.visibility = config.visibility;
            }

            record.set("selected", config.selected || false);
            record.set("source", config.source);
            record.set("name", config.name);
            if ("group" in config) {
                record.set("group", config.group);
            }
            record.commit();
        }
        return record;
    }
});
